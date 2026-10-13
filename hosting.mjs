import {createHash,timingSafeEqual} from 'node:crypto';
import path from 'node:path';
export const publicOrigin=process.env.PUBLIC_ORIGIN?new URL(process.env.PUBLIC_ORIGIN).origin:null;
export function allowedHost(host){return publicOrigin?host===new URL(publicOrigin).host:['localhost','127.0.0.1','[::1]'].includes(new URL('http://'+host).hostname);}
export function secureSession(req){return publicOrigin?.startsWith('https:')||!!req.socket.encrypted;}
export function checkSetupToken(first,token){
 if(!first||!process.env.SETUP_TOKEN)return;
 const hash=value=>createHash('sha256').update(String(value||'')).digest();
 if(!timingSafeEqual(hash(token),hash(process.env.SETUP_TOKEN)))throw Object.assign(Error('Enter the owner setup code to create the first account.'),{status:403});
}
export const configFile=path.resolve(process.env.CONFIG_DIR||'.','.env');
