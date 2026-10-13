import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

export function publicAddress(address){
  if(isIP(address)===4){const [a,b,c]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);}
  if(isIP(address)===6){const first=parseInt(address.split(':')[0],16);return first>=0x2000&&first<=0x3fff&&!/^2001:(?:0*0:|0*2:|0*10:|0*20:|db8:)/i.test(address)&&!/^2002:/i.test(address);}
  return false;
}
export function scoreLink(value){
  let url;try{url=new URL(value);}catch{throw Error('Enter a complete HTTPS link to a score file.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443')throw Error('Use an HTTPS score link without embedded login details or a custom port.');
  url.hash='';
  if(['songsterr.com','www.songsterr.com'].includes(url.hostname))return {provider:'Songsterr',exportUrl:url.href,message:'Open this song in Songsterr, sign in, and use Export / Download → Guitar Pro. Then choose the downloaded file below.'};
  return {url};
}
export async function downloadScore(value,{resolveHost=lookup,request=https.get}={}){
  const input=scoreLink(value);if(input.provider)return input;
  let url=input.url;
  for(let redirects=0;redirects<=4;redirects++){
    let addresses;try{addresses=await resolveHost(url.hostname,{all:true});}catch{throw Error('The score-file host could not be reached. Check the link and try again.');}
    if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('Use a public score-file link. Local and private network addresses are not supported.');
    const selected=addresses[0];
    const result=await new Promise((resolve,reject)=>{
      const req=request(url,{agent:false,headers:{'User-Agent':'MusicCoach/0.1 score-import','Accept':'application/octet-stream, application/xml, audio/midi, */*'},lookup:(_host,options,cb)=>options?.all?cb(null,[selected]):cb(null,selected.address,selected.family)},res=>{
        if([301,302,303,307,308].includes(res.statusCode)){res.resume();resolve({redirect:res.headers.location});return;}
        if(res.statusCode!==200){res.resume();reject(Error([401,403].includes(res.statusCode)?'This download requires your browser login. Download the score in that browser, then choose the file here.':`The score download returned HTTP ${res.statusCode}.`));return;}
        let size=0;const chunks=[];
        res.on('data',chunk=>{size+=chunk.length;if(size>8*1024*1024){res.destroy(Error('Score file exceeds the 8 MB limit.'));return;}chunks.push(chunk);});
        res.on('error',reject);res.on('end',()=>resolve({bytes:Buffer.concat(chunks),headers:res.headers}));
      });
      req.setTimeout(15000,()=>req.destroy(Error('The score download timed out.')));req.on('error',reject);
    });
    if(result.redirect){const next=scoreLink(new URL(result.redirect,url).href);if(next.provider)return next;url=next.url;continue;}
    const disposition=result.headers['content-disposition']||'';
    const fileMatch=disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)/i);
    let filename=fileMatch?.[1]||fileMatch?.[2]||url.pathname.split('/').at(-1)||'score';
    try{filename=decodeURIComponent(filename);}catch{}
    filename=filename.split(/[\\/]/).at(-1).slice(0,180);
    const ext=filename.split('.').at(-1).toLowerCase();
    if(!['gp','gpx','gp3','gp4','gp5','mid','midi','xml','musicxml','mxl','json'].includes(ext))throw Error('This is a webpage rather than a supported score download. Use its Guitar Pro, MusicXML or MIDI download link, or choose the downloaded file.');
    if(/text\/html/i.test(result.headers['content-type']||''))throw Error('The link returned a webpage or login screen. Download the score in your browser, then choose the file here.');
    return {filename,bytes:result.bytes};
  }
  throw Error('This download redirects too many times. Use the final score-file link.');
}
