import {readdir,cp,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'public');
await mkdir(out,{recursive:true});
for(const file of await readdir(root)){if(/\.(html|css|js)$/.test(file))await cp(path.join(root,file),path.join(out,file));}
for(const file of ['README.md','LICENSE','DEPLOYMENT.md'])await cp(path.join(root,file),path.join(out,file));
for(const dir of ['assets','device'])await cp(path.join(root,dir),path.join(out,dir),{recursive:true,filter:file=>!/(^|[/\\])(test[^/\\]*\.mjs|include|engine\.c|smk-engine\.c)$/.test(file)});
console.log('Built public app, simulator and installer.');
