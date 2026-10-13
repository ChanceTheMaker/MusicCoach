import {secureSession,checkSetupToken,configFile} from './hosting.mjs';
import {validateScore} from './library/validate.mjs';
import {randomBytes,randomUUID,createHash,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {readFile,writeFile,rename} from 'node:fs/promises';
const scrypt=promisify(scryptCallback),digest=value=>createHash('sha256').update(value).digest('hex');
const SESSION_SECONDS=30*24*60*60;
export function httpError(message,status=400){return Object.assign(Error(message),{status});}
export function validatePassword(password){if(typeof password!=='string'||password.length<12||password.length>128)throw httpError('Use a password with 12 to 128 characters.');return password;}
export async function hashPassword(password){validatePassword(password);const salt=randomBytes(16).toString('hex'),hash=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return salt+':'+hash.toString('hex');}
export async function verifyPassword(password,encoded){if(typeof password!=='string'||password.length>128)return false;const [salt,key]=encoded.split(':');const hash=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return key?.length===128&&timingSafeEqual(hash,Buffer.from(key,'hex'));}
export function username(value){if(typeof value!=='string'||!/^[-a-zA-Z0-9_.]{3,40}$/.test(value))throw httpError('Username needs 3 to 40 letters, numbers, dots, dashes or underscores.');return value.toLowerCase();}
export function tokenFrom(req){return /(?:^|; *)musiccoach_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];}
export function sessionCookie(token,secure=false,maxAge=SESSION_SECONDS){return 'musiccoach_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+maxAge+(secure?'; Secure':'');}
export class RateLimit{
 constructor(){this.entries=new Map();}
 check(key,limit=15,windowMs=900000){const now=Date.now();for(const [k,v] of this.entries)if(v.until<=now)this.entries.delete(k);const v=this.entries.get(key)||{count:0,until:now+windowMs};this.entries.set(key,v);if(++v.count>limit)throw httpError('Too many attempts. Please try again later.',429);}
}
export function createAccounts(pool){
 const limits=new RateLimit();let schemaPromise,dummyHash;
 const ready=()=>schemaPromise??=(async()=>{await pool.query(await readFile(new URL('./db/accounts.sql',import.meta.url),'utf8'));dummyHash=await hashPassword(randomBytes(24).toString('hex'));})().catch(e=>{schemaPromise=null;throw e;});
 const userFor=async req=>{await ready();const token=tokenFrom(req);if(!token)return null;return (await pool.query('SELECT u.id,u.username,u.display_name,u.role FROM coach_sessions s JOIN coach_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[digest(token)])).rows[0]||null;};
 const issue=async(req,res,user)=>{const old=tokenFrom(req);if(old)await pool.query('DELETE FROM coach_sessions WHERE token_hash=$1',[digest(old)]);const token=randomBytes(32).toString('hex');await pool.query('DELETE FROM coach_sessions WHERE expires_at<=now()');await pool.query("INSERT INTO coach_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')",[digest(token),user.id]);res.setHeader('Set-Cookie',sessionCookie(token,secureSession(req)));};
 async function route(req,res,path,data,json){
  if(!path.startsWith('/api/account'))return false;await ready();
  if(path==='/api/account'&&req.method==='GET'){const user=await userFor(req);const {rows:[setup]}=await pool.query('SELECT NOT EXISTS(SELECT 1 FROM coach_users) AS first_account');json(res,200,{user,firstAccount:setup.first_account,setupRequired:setup.first_account&&!!process.env.SETUP_TOKEN,coachConfigured:!!process.env.OPENAI_API_KEY});return true;}
  if(req.method!=='POST')throw httpError('Not found.',404);
  if(['/api/account/register','/api/account/login','/api/account/recover'].includes(path)){
   limits.check('ip:'+(req.clientAddress||req.socket.remoteAddress));const name=username(data.username);limits.check('name:'+name,10);
   if(path==='/api/account/register'){
    const display=typeof data.displayName==='string'?data.displayName.trim():'';if(!display||display.length>80)throw httpError('Enter a display name up to 80 characters.');
    const hash=await hashPassword(data.password),recovery=randomBytes(24).toString('hex'),user={id:randomUUID(),username:name,display_name:display};const client=await pool.connect();let first;
    try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(726381)');first=(await client.query('SELECT NOT EXISTS(SELECT 1 FROM coach_users) AS first')).rows[0].first;
     checkSetupToken(first,data.setupToken);user.role=first?'super_admin':'learner';await client.query('INSERT INTO coach_users(id,username,display_name,password_hash,recovery_hash,role) VALUES($1,$2,$3,$4,$5,$6)',[user.id,name,display,hash,digest(recovery),user.role]);
     if(first)await client.query("UPDATE library_items SET owner_id=$1 WHERE origin='user' AND owner_id IS NULL",[user.id]);await client.query('COMMIT');
    }catch(e){await client.query('ROLLBACK');if(e.code==='23505')throw httpError('That username is unavailable.');throw e;}finally{client.release();}
    await issue(req,res,user);json(res,201,{user,recoveryCode:recovery,claimedLocalLibrary:first});return true;
   }
   const stored=(await pool.query('SELECT * FROM coach_users WHERE username=$1',[name])).rows[0];
   if(path==='/api/account/recover'){
    const code=typeof data.recoveryCode==='string'?data.recoveryCode:'';if(!stored||code.length!==48||!timingSafeEqual(Buffer.from(digest(code),'hex'),Buffer.from(stored.recovery_hash,'hex')))throw httpError('Username or recovery code is incorrect.',401);
    const hash=await hashPassword(data.password),recovery=randomBytes(24).toString('hex');await pool.query('UPDATE coach_users SET password_hash=$1,recovery_hash=$2 WHERE id=$3',[hash,digest(recovery),stored.id]);await pool.query('DELETE FROM coach_sessions WHERE user_id=$1',[stored.id]);const user={id:stored.id,username:stored.username,display_name:stored.display_name,role:stored.role};await issue(req,res,user);json(res,200,{user,recoveryCode:recovery});return true;
   }
   const ok=await verifyPassword(data.password,stored?.password_hash||dummyHash);if(!stored||!ok)throw httpError('Username or password is incorrect.',401);const user={id:stored.id,username:stored.username,display_name:stored.display_name,role:stored.role};await issue(req,res,user);json(res,200,{user});return true;
  }
  if(path==='/api/account/logout'){const token=tokenFrom(req);if(token)await pool.query('DELETE FROM coach_sessions WHERE token_hash=$1',[digest(token)]);res.setHeader('Set-Cookie',sessionCookie('',secureSession(req),0));json(res,200,{ok:true});return true;}
  throw httpError('Not found.',404);
 }
 return {ready,userFor,route};
}
export function requireUser(user){if(!user)throw httpError('Sign in to save your music, progress and chats.',401);return user;}
export function validateItem(data){
 const kind=data.kind,key=data.key,title=data.title,instrument=data.instrument||'';
 if(!['song','exercise','instrument'].includes(kind)||typeof key!=='string'||key.length<1||key.length>200||typeof title!=='string'||!title.trim()||title.length>180||!['','piano','guitar','bass','sax','harmonica','drums','singing'].includes(instrument))throw httpError('Invalid saved item.');
 for(const k of ['favorite','completed'])if(data[k]!==undefined&&typeof data[k]!=='boolean')throw httpError('Invalid saved item setting.');
 let progress={};if(data.progress!==undefined){const p=data.progress;if(!p||typeof p!=='object'||Array.isArray(p))throw httpError('Invalid progress.');for(const key of ['score','bestScore','accuracy','hits','total','best','stars','maxScore'])if(p[key]!==undefined){if(!Number.isFinite(p[key])||p[key]<0||p[key]>100000000)throw httpError('Invalid progress value.');progress[key]=p[key];}if((progress.accuracy??0)>100||(progress.stars??0)>3)throw httpError('Invalid progress value.');}
 let lesson=null;if(data.lesson){if(!Array.isArray(data.lesson.notes)||data.lesson.notes.length>512)throw httpError('Invalid saved exercise.');lesson={id:String(data.lesson.id||key).slice(0,180),title:title.trim(),notes:validateScore({notes:data.lesson.notes}).notes,theory:true,beat:1,tag:'SAVED EXERCISE',description:String(data.lesson.description||'').slice(0,2000),meter:/^[0-9]{1,2}\/[0-9]{1,2}$/.test(data.lesson.meter||'')?data.lesson.meter:'4/4',bpm:Math.max(30,Math.min(240,Number(data.lesson.bpm)||80))};}return {kind,key,title:title.trim(),instrument,favorite:data.favorite,completed:data.completed,progress,lesson};
}
export async function personalRoute(pool,user,req,path,data,json,res){
 if(!path.startsWith('/api/me/'))return false;requireUser(user);
 if(path==='/api/me/state'&&req.method==='GET'){json(res,200,{state:(await pool.query('SELECT state FROM coach_state WHERE user_id=$1',[user.id])).rows[0]?.state||null});return true;}
 if(path==='/api/me/state'&&req.method==='POST'){const state=validateState(data.state);await pool.query('INSERT INTO coach_state(user_id,state) VALUES($1,$2::jsonb) ON CONFLICT(user_id) DO UPDATE SET state=$2::jsonb,updated_at=now()',[user.id,JSON.stringify(state)]);json(res,200,{ok:true});return true;}
 if(path==='/api/me/admin/coach'&&req.method==='POST'){if(user.role!=='super_admin')throw httpError('Super Admin access required.',403);if(typeof data.apiKey!=='string'||!/^[-_a-zA-Z0-9]{20,300}$/.test(data.apiKey)||typeof data.model!=='string'||!/^[-a-zA-Z0-9.]{1,80}$/.test(data.model))throw httpError('Enter a valid API key and model name.');const file=configFile,temp=configFile+'.pending';let contents='';try{contents=await readFile(file,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}for(const [key,value]of [['OPENAI_API_KEY',data.apiKey],['OPENAI_MODEL',data.model]]){const pattern=new RegExp('^'+key+'=.*$','m');contents=pattern.test(contents)?contents.replace(pattern,key+'='+value):contents+'\n'+key+'='+value+'\n';}await writeFile(temp,contents,{mode:0o600});await rename(temp,file);process.env.OPENAI_API_KEY=data.apiKey;process.env.OPENAI_MODEL=data.model;json(res,200,{configured:true});return true;}
 if(path==='/api/me/admin/users'&&req.method==='GET'){if(user.role!=='super_admin')throw httpError('Super Admin access required.',403);json(res,200,{users:(await pool.query('SELECT username,display_name,role,created_at FROM coach_users ORDER BY created_at')).rows});return true;}
 if(path==='/api/me/items'&&req.method==='GET'){json(res,200,{items:(await pool.query('SELECT kind,item_key AS key,title,instrument,favorite,completed,progress,lesson,updated_at FROM coach_items WHERE user_id=$1 ORDER BY updated_at DESC',[user.id])).rows});return true;}
 if(path==='/api/me/items'&&req.method==='POST'){
  const v=validateItem(data);await pool.query(`INSERT INTO coach_items(user_id,kind,item_key,title,instrument,favorite,completed,progress,lesson) VALUES($1,$2,$3,$4,$5,COALESCE($6,false),COALESCE($7,false),$8::jsonb,$10::jsonb)
   ON CONFLICT(user_id,kind,item_key) DO UPDATE SET title=$4,instrument=$5,favorite=COALESCE($6,coach_items.favorite),completed=COALESCE($7,coach_items.completed),progress=CASE WHEN $9 THEN $8::jsonb ELSE coach_items.progress END,lesson=COALESCE($10::jsonb,coach_items.lesson),updated_at=now()`,[user.id,v.kind,v.key,v.title,v.instrument,v.favorite??null,v.completed??null,JSON.stringify(v.progress),data.progress!==undefined,v.lesson?JSON.stringify(v.lesson):null]);json(res,200,{ok:true});return true;
 }
 throw httpError('Not found.',404);
}

export function validateState(state){
 if(!state||typeof state!=='object'||Array.isArray(state)||JSON.stringify(state).length>160000)throw httpError('Invalid practice state.');
 if(!['piano','guitar','bass','sax','harmonica','drums','singing'].includes(state.instrument)||typeof state.lessonId!=='string'||state.lessonId.length>200||!Number.isFinite(state.beat)||state.beat<0||state.beat>100256)throw httpError('Invalid practice position.');
 const ui={};for(const [key,value] of Object.entries(state.ui||{}))if(/^[a-zA-Z][a-zA-Z0-9]{0,40}$/.test(key)&&['string','number','boolean'].includes(typeof value)&&String(value).length<=80)ui[key]=value;
 const mix={};for(const [key,value] of Object.entries(state.mix||{}))if(/^[a-zA-Z0-9_-]{1,80}$/.test(key)&&typeof value==='boolean')mix[key]=value;
 const lesson=state.lesson?validateItem({kind:'exercise',key:state.lessonId,title:String(state.lesson.title||'Saved exercise'),instrument:state.instrument,lesson:state.lesson}).lesson:null;
 return {version:1,instrument:state.instrument,lessonId:state.lessonId,library:!!state.library,beat:state.beat,ui,mix,lesson};
}
