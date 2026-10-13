import path from 'node:path';
// Load server environment before spawning Node, so startup-only settings such as
// NODE_EXTRA_CA_CERTS are honored on Node 22 as well as newer releases.
import {loadEnvFile} from 'node:process';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
try{loadEnvFile(path.resolve(process.env.CONFIG_DIR||'.','.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
const child=spawn(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url))],{cwd:new URL('.',import.meta.url),env:process.env,stdio:'inherit',windowsHide:true});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error('MusicCoach could not start:',error.message);process.exitCode=1;});child.on('exit',code=>process.exit(code??0));
