import {randomUUID,randomBytes} from 'node:crypto';
import {requireUser,httpError,RateLimit} from './accounts.mjs';
const instruments=['piano','guitar','bass','sax','harmonica','drums','singing'];
export const skills=['beginner','intermediate','advanced','professional'];
export const ages=['','under-18','18-24','25-34','35-44','45-54','55-64','65+'];
function list(value,max=10){if(!Array.isArray(value)||value.length>max||value.some(x=>typeof x!=='string'||!x.trim()||x.length>40))throw httpError('Use up to '+max+' short entries.');return [...new Set(value.map(x=>x.trim()))];}
export function validateProfile(data){
 if(typeof data.visible!=='boolean'||!skills.includes(data.skill)||!ages.includes(data.ageRange)||typeof data.bio!=='string'||data.bio.length>1200)throw httpError('Invalid musician profile.');const chosen=list(data.instruments,7);if(chosen.some(x=>!instruments.includes(x))||data.visible&&!chosen.length)throw httpError('Choose at least one instrument for your visible profile.');return {visible:data.visible,skill:data.skill,ageRange:data.ageRange,instruments:chosen,genres:list(data.genres),interests:list(data.interests),bio:data.bio.trim()};
}
export function validateBand(data){if(typeof data.name!=='string'||!data.name.trim()||data.name.length>100||typeof data.description!=='string'||data.description.length>1600||typeof data.listed!=='boolean')throw httpError('Give your band a name and a short description.');const wanted=list(data.wanted,7);if(wanted.some(x=>!instruments.includes(x)))throw httpError('Choose valid instruments.');return {name:data.name.trim(),description:data.description.trim(),genres:list(data.genres),wanted,listed:data.listed};}
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
export function createConnections(pool){
 const limits=new RateLimit();
 return async function route(req,res,path,data,user,json,url){
  if(!path.startsWith('/api/connections')&&!path.startsWith('/api/bands'))return false;requireUser(user);
  if(path==='/api/connections/profile'){
   if(req.method==='GET'){json(res,200,{profile:(await pool.query('SELECT visible,skill,age_range AS "ageRange",instruments,genres,interests,bio FROM musician_profiles WHERE user_id=$1',[user.id])).rows[0]||null});return true;}
   if(req.method==='POST'){const p=validateProfile(data);await pool.query('INSERT INTO musician_profiles(user_id,visible,skill,age_range,instruments,genres,interests,bio) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id) DO UPDATE SET visible=$2,skill=$3,age_range=$4,instruments=$5,genres=$6,interests=$7,bio=$8,updated_at=now()',[user.id,p.visible,p.skill,p.ageRange,p.instruments,p.genres,p.interests,p.bio]);json(res,200,{profile:p});return true;}
  }
  if(path==='/api/connections'&&req.method==='GET'){
   const q=url.searchParams,skill=q.get('skill')||'',age=q.get('age')||'',instrument=q.get('instrument')||'',genre=(q.get('genre')||'').slice(0,40),interest=(q.get('interest')||'').slice(0,40);
   if(skill&&!skills.includes(skill)||!ages.includes(age)||instrument&&!instruments.includes(instrument))throw httpError('Invalid profile filter.');
   const people=(await pool.query(`SELECT u.id,u.display_name,p.skill,p.age_range,p.instruments,p.genres,p.interests,p.bio,c.status,c.sender_id FROM musician_profiles p JOIN coach_users u ON u.id=p.user_id LEFT JOIN musician_connections c ON (c.sender_id=$1 AND c.recipient_id=u.id OR c.recipient_id=$1 AND c.sender_id=u.id) WHERE p.visible AND p.user_id<>$1 AND ($2='' OR p.skill=$2) AND ($3='' OR p.age_range=$3) AND ($4='' OR $4=ANY(p.instruments)) AND ($5='' OR strpos(lower(array_to_string(p.genres,',')),lower($5))>0) AND ($6='' OR strpos(lower(array_to_string(p.interests,',')),lower($6))>0) ORDER BY p.updated_at DESC LIMIT 60`,[user.id,skill,age,instrument,genre,interest])).rows;
   json(res,200,{people});return true;
  }
  if(path==='/api/connections/mine'&&req.method==='GET'){
   const connections=(await pool.query(`SELECT c.sender_id,c.recipient_id,c.status,u.id,u.display_name,p.instruments,p.genres FROM musician_connections c JOIN coach_users u ON u.id=CASE WHEN c.sender_id=$1 THEN c.recipient_id ELSE c.sender_id END LEFT JOIN musician_profiles p ON p.user_id=u.id WHERE c.sender_id=$1 OR c.recipient_id=$1 ORDER BY c.created_at DESC`,[user.id])).rows;
   const invites=(await pool.query('SELECT i.id,r.name,r.id AS room_id,u.display_name FROM musician_room_invites i JOIN coach_rooms r ON r.id=i.room_id JOIN coach_users u ON u.id=i.sender_id WHERE i.recipient_id=$1 ORDER BY i.created_at DESC',[user.id])).rows;json(res,200,{connections,invites});return true;
  }
  if(path==='/api/connections/request'&&req.method==='POST'){
   limits.check('request:'+user.id,30,3600000);if(!uuid(data.userId)||data.userId===user.id)throw httpError('Choose another musician.');
   const visible=(await pool.query('SELECT user_id FROM musician_profiles WHERE user_id=ANY($1::uuid[]) AND visible',[[user.id,data.userId]])).rows;if(visible.length!==2)throw httpError('Both musicians need a visible Connections profile.');
   await pool.query("INSERT INTO musician_connections(sender_id,recipient_id,status) VALUES($1,$2,'pending') ON CONFLICT DO NOTHING",[user.id,data.userId]);json(res,201,{ok:true});return true;
  }
  if(path==='/api/connections/respond'&&req.method==='POST'){
   if(!uuid(data.userId)||!['accept','decline','remove'].includes(data.action))throw httpError('Invalid connection action.');
   if(data.action==='accept'){const r=await pool.query("UPDATE musician_connections SET status='accepted' WHERE sender_id=$1 AND recipient_id=$2 AND status='pending'",[data.userId,user.id]);if(!r.rowCount)throw httpError('Request not found.',404);}else{await pool.query('DELETE FROM musician_connections WHERE sender_id=$1 AND recipient_id=$2 OR sender_id=$2 AND recipient_id=$1',[data.userId,user.id]);await pool.query('DELETE FROM musician_room_invites WHERE sender_id=$1 AND recipient_id=$2 OR sender_id=$2 AND recipient_id=$1',[data.userId,user.id]);}json(res,200,{ok:true});return true;
  }
  if(path==='/api/connections/invite'&&req.method==='POST'){
   if(!uuid(data.userId)||!uuid(data.roomId))throw httpError('Choose a connection and room.');limits.check('invite:'+user.id,30,3600000);
   const c=await pool.query("SELECT 1 FROM musician_connections WHERE status='accepted' AND (sender_id=$1 AND recipient_id=$2 OR sender_id=$2 AND recipient_id=$1)",[user.id,data.userId]);const r=await pool.query('SELECT 1 FROM coach_room_members WHERE room_id=$1 AND user_id=$2',[data.roomId,user.id]);if(!c.rowCount||!r.rowCount)throw httpError('Invite an accepted connection to a room you belong to.',403);
   await pool.query('INSERT INTO musician_room_invites(id,sender_id,recipient_id,room_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[randomUUID(),user.id,data.userId,data.roomId]);json(res,201,{ok:true});return true;
  }
  if(path==='/api/connections/invite/respond'&&req.method==='POST'){
   if(!uuid(data.id)||typeof data.accept!=='boolean')throw httpError('Invalid invitation.');const client=await pool.connect();try{await client.query('BEGIN');const invite=(await client.query('SELECT room_id FROM musician_room_invites WHERE id=$1 AND recipient_id=$2 FOR UPDATE',[data.id,user.id])).rows[0];if(!invite)throw httpError('Invitation not found.',404);if(data.accept)await client.query('INSERT INTO coach_room_members(room_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[invite.room_id,user.id]);await client.query('DELETE FROM musician_room_invites WHERE id=$1',[data.id]);await client.query('COMMIT');json(res,200,{roomId:data.accept?invite.room_id:null});}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}return true;
  }
  if(path==='/api/bands'&&req.method==='GET'){
   const search=(url.searchParams.get('q')||'').slice(0,100);const bands=(await pool.query(`SELECT b.*,u.display_name AS owner_name,m.status AS membership,(SELECT count(*)::int FROM coach_band_members bm WHERE bm.band_id=b.id AND bm.status='member') AS members FROM coach_bands b JOIN coach_users u ON u.id=b.owner_id LEFT JOIN coach_band_members m ON m.band_id=b.id AND m.user_id=$1 WHERE (b.listed OR m.status='member') AND ($2='' OR strpos(lower(b.name||' '||b.description||' '||array_to_string(b.genres,',')||' '||array_to_string(b.wanted,',')),lower($2))>0) ORDER BY b.created_at DESC LIMIT 60`,[user.id,search])).rows;
   const requests=(await pool.query("SELECT m.band_id,m.user_id,m.note,u.display_name,b.name AS band_name FROM coach_band_members m JOIN coach_bands b ON b.id=m.band_id JOIN coach_users u ON u.id=m.user_id WHERE b.owner_id=$1 AND m.status='pending' ORDER BY m.created_at",[user.id])).rows;json(res,200,{bands,requests});return true;
  }
  if(path==='/api/bands'&&req.method==='POST'){
   limits.check('band:'+user.id,5,3600000);const b=validateBand(data),id=randomUUID(),roomId=randomUUID(),client=await pool.connect();try{await client.query('BEGIN');await client.query('INSERT INTO coach_rooms(id,name,invite_code,owner_id) VALUES($1,$2,$3,$4)',[roomId,b.name+' - rehearsal',randomBytes(12).toString('hex'),user.id]);await client.query('INSERT INTO coach_room_members(room_id,user_id) VALUES($1,$2)',[roomId,user.id]);await client.query('INSERT INTO coach_bands(id,owner_id,room_id,name,description,genres,wanted,listed) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,user.id,roomId,b.name,b.description,b.genres,b.wanted,b.listed]);await client.query("INSERT INTO coach_band_members(band_id,user_id,status) VALUES($1,$2,'member')",[id,user.id]);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}json(res,201,{id,roomId});return true;
  }
  const bandMatch=path.match(/^\/api\/bands\/([a-f0-9-]{36})\/(join|respond|leave|update)$/);
  if(bandMatch&&req.method==='POST'){
   const id=bandMatch[1],band=(await pool.query('SELECT * FROM coach_bands WHERE id=$1',[id])).rows[0];if(!band)throw httpError('Band not found.',404);
   if(bandMatch[2]==='join'){limits.check('bandjoin:'+user.id,20,3600000);if(!band.listed)throw httpError('Band not available.',404);const note=String(data.note||'').trim();if(note.length>500)throw httpError('Keep your introduction under 500 characters.');await pool.query("INSERT INTO coach_band_members(band_id,user_id,status,note) VALUES($1,$2,'pending',$3) ON CONFLICT DO NOTHING",[id,user.id,note]);json(res,201,{ok:true});return true;}
   if(bandMatch[2]==='update'){if(band.owner_id!==user.id)throw httpError('Only the band founder can edit this band.',403);const b=validateBand(data);await pool.query('UPDATE coach_bands SET name=$1,description=$2,genres=$3,wanted=$4,listed=$5 WHERE id=$6',[b.name,b.description,b.genres,b.wanted,b.listed,id]);json(res,200,{ok:true});return true;}
   const client=await pool.connect();try{await client.query('BEGIN');if(bandMatch[2]==='respond'){
    if(band.owner_id!==user.id)throw httpError('Only the band founder can review requests.',403);if(!uuid(data.userId)||typeof data.accept!=='boolean')throw httpError('Invalid band request.');
    if(data.accept){const r=await client.query("UPDATE coach_band_members SET status='member' WHERE band_id=$1 AND user_id=$2 AND status='pending'",[id,data.userId]);if(!r.rowCount)throw httpError('Request not found.',404);await client.query('INSERT INTO coach_room_members(room_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[band.room_id,data.userId]);}else await client.query("DELETE FROM coach_band_members WHERE band_id=$1 AND user_id=$2 AND status='pending'",[id,data.userId]);
   }else{if(band.owner_id===user.id)throw httpError('The founder stays with the band. You can hide its listing in Edit band.');await client.query('DELETE FROM coach_band_members WHERE band_id=$1 AND user_id=$2',[id,user.id]);await client.query('DELETE FROM coach_room_members WHERE room_id=$1 AND user_id=$2',[band.room_id,user.id]);}await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}json(res,200,{ok:true});return true;
  }
  throw httpError('Not found.',404);
 };
}
