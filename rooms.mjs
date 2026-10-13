import {randomBytes,randomUUID} from 'node:crypto';
import {requireUser,httpError,RateLimit} from './accounts.mjs';
export function createRooms(pool){
 const limits=new RateLimit();
 return async function route(req,res,path,data,user,json){
  if(!path.startsWith('/api/rooms'))return false;requireUser(user);
  if(path==='/api/rooms'&&req.method==='GET'){json(res,200,{rooms:(await pool.query('SELECT r.id,r.name,r.owner_id FROM coach_rooms r JOIN coach_room_members m ON m.room_id=r.id WHERE m.user_id=$1 ORDER BY m.seen_at DESC LIMIT 100',[user.id])).rows});return true;}
  if(path==='/api/rooms'&&req.method==='POST'){
   limits.check('create:'+user.id,10,3600000);const name=typeof data.name==='string'?data.name.trim():'';if(!name||name.length>100)throw httpError('Give your room a name of 1 to 100 characters.');
   const id=randomUUID(),code=randomBytes(12).toString('hex'),client=await pool.connect();try{await client.query('BEGIN');await client.query('INSERT INTO coach_rooms(id,name,invite_code,owner_id) VALUES($1,$2,$3,$4)',[id,name,code,user.id]);await client.query('INSERT INTO coach_room_members(room_id,user_id) VALUES($1,$2)',[id,user.id]);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}json(res,201,{id});return true;
  }
  if(path==='/api/rooms/join'&&req.method==='POST'){
   limits.check('join:'+user.id,20,900000);const code=String(data.code||'').trim().toLowerCase();if(!/^[a-f0-9]{24}$/.test(code))throw httpError("Enter the room's 24-character invite code.");const room=(await pool.query('SELECT id FROM coach_rooms WHERE invite_code=$1',[code])).rows[0];if(!room)throw httpError('That room could not be found.',404);await pool.query('INSERT INTO coach_room_members(room_id,user_id) VALUES($1,$2) ON CONFLICT(room_id,user_id) DO UPDATE SET seen_at=now()',[room.id,user.id]);json(res,200,{id:room.id});return true;
  }
  const match=path.match(/^\/api\/rooms\/([a-f0-9-]{36})(?:\/(message|leave))?$/);if(!match)throw httpError('Room not found.',404);
  const id=match[1],room=(await pool.query('SELECT r.id,r.name,r.invite_code,r.owner_id FROM coach_rooms r JOIN coach_room_members m ON m.room_id=r.id WHERE r.id=$1 AND m.user_id=$2',[id,user.id])).rows[0];if(!room)throw httpError('Join this room with its invite code first.',404);
  if(req.method==='GET'&&!match[2]){await pool.query('UPDATE coach_room_members SET seen_at=now() WHERE room_id=$1 AND user_id=$2',[id,user.id]);const members=(await pool.query("SELECT u.id,u.display_name,u.username,(m.seen_at>now()-interval '20 seconds') AS online FROM coach_room_members m JOIN coach_users u ON u.id=m.user_id WHERE m.room_id=$1 ORDER BY m.seen_at DESC",[id])).rows;const messages=(await pool.query('SELECT * FROM (SELECT m.id,m.content,m.created_at,u.display_name,u.id AS user_id FROM coach_room_messages m JOIN coach_users u ON u.id=m.user_id WHERE room_id=$1 ORDER BY m.id DESC LIMIT 100) recent ORDER BY id',[id])).rows;json(res,200,{room,members,messages,media:{available:false,stage:'planned'}});return true;}
  if(req.method==='POST'&&match[2]==='message'){limits.check('message:'+user.id,40,60000);if(typeof data.message!=='string'||!data.message.trim()||data.message.length>2000)throw httpError('Write a message of 1 to 2,000 characters.');await pool.query('INSERT INTO coach_room_messages(room_id,user_id,content) VALUES($1,$2,$3)',[id,user.id,data.message.trim()]);json(res,201,{ok:true});return true;}
  if(req.method==='POST'&&match[2]==='leave'){await pool.query('DELETE FROM coach_room_members WHERE room_id=$1 AND user_id=$2',[id,user.id]);json(res,200,{ok:true});return true;}
  throw httpError('Not found.',404);
 };
}
