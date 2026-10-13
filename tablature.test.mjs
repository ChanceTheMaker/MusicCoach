import test from 'node:test';
import assert from 'node:assert/strict';
import {importer,exporter} from '@coderline/alphatab';
import {parseImport} from './library/imports.mjs';
import {validateScore} from './library/validate.mjs';
import {tabPositions} from './tab-model.js';
import {publicAddress,scoreLink,downloadScore} from './library/import-link.mjs';
import {EventEmitter} from 'node:events';

test('Guitar Pro import preserves exact frets, open strings, chord timing and JSON roundtrip',()=>{
  const source=importer.ScoreLoader.loadAlphaTex('\\title "Original tab test" . 0.6.4 3.6.4 2.5.4 0.4.4 | (0.1 1.2 0.3).2 r.2');
  const bytes=Buffer.from(new exporter.Gp7Exporter().export(source));
  const result=parseImport('original.gp',bytes),score=result.parts[0].score;
  assert.equal(result.title,'Original tab test');assert.equal(result.bpm,120);
  assert.deepEqual(score.tablature,{tuning:[64,59,55,50,45,40],capo:0});
  assert.deepEqual(score.notes[0].position,{string:5,fret:0});assert.deepEqual(score.notes[1].position,{string:5,fret:3});
  assert.equal(score.notes.filter(n=>n.beat===4).length,3);
  for(const n of score.notes)assert.equal(score.tablature.tuning[n.position.string]+n.position.fret,n.written);
  assert.deepEqual(parseImport('export.json',Buffer.from(JSON.stringify({score}))).parts[0].score,score);
});
test('Guitar Pro bass with alternate tuning and capo retains sounding pitch and original positions',()=>{
  const source=importer.ScoreLoader.loadAlphaTex('\\tuning G2 D2 A1 D1 \\capo 2 . 0.4.4 3.4.4 2.3.4 0.2.4');
  const result=parseImport('bass.gp',Buffer.from(new exporter.Gp7Exporter().export(source)));
  const score=result.parts[0].score,tab=tabPositions(score.notes,'bass',score.tablature);
  assert.equal(tab.tuning.length,4);assert.equal(tab.capo,2);assert.equal(tab.unmapped.length,0);
  assert.equal(score.notes[0].written,28);assert.deepEqual(score.notes[0].position,{string:3,fret:0});
});
test('tab mapping honors explicit positions and assigns simultaneous notes to distinct strings',()=>{
  const notes=[{written:64,beat:0,position:{string:1,fret:5}},{written:60,beat:0},{written:55,beat:0}];
  const tab=tabPositions(notes,'guitar');assert.deepEqual(tab.positions.get(notes[0]),{string:1,fret:5});
  assert.equal(new Set([...tab.positions.values()].map(p=>p.string)).size,3);
  for(const [n,p] of tab.positions)assert.equal(tab.tuning[p.string]+p.fret,n.written);
  assert.equal(tabPositions([{written:20,beat:0}],'bass').unmapped.length,1);
});
test('tab metadata validation rejects invalid tunings and positions',()=>{
  const score={notes:[{written:40,beat:0,duration:1,position:{string:5,fret:0}}],tablature:{tuning:[64,59,55,50,45,40],capo:0}};
  assert.deepEqual(validateScore(score).notes[0].position,{string:5,fret:0});
  assert.throws(()=>validateScore({...score,tablature:{tuning:[200],capo:0}}));
  assert.throws(()=>validateScore({...score,notes:[{...score.notes[0],position:{string:6,fret:0}}]}));
  assert.throws(()=>parseImport('bad.gp',Buffer.from('not a score')));
});
test('score links reject local addresses and credentials; Songsterr uses account export',()=>{
  for(const host of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.0.1','169.254.169.254','100.64.1.1','::1','::ffff:127.0.0.1','fe80::1','fc00::1','2001:db8::1'])assert.equal(publicAddress(host),false,host);
  assert.equal(publicAddress('8.8.8.8'),true);assert.equal(publicAddress('2606:4700:4700::1111'),true);
  assert.throws(()=>scoreLink('http://example.com/song.gp'));assert.throws(()=>scoreLink('https://user:pass@example.com/song.gp'));
  assert.equal(scoreLink('https://www.songsterr.com/a/wsa/test-tab-s123?open=editor').provider,'Songsterr');
  assert.equal(scoreLink('https://example.com/song.gp').url.pathname,'/song.gp');
});

test('link download pins public DNS, reads attachment names and rejects a redirect to private hosts',async()=>{
  let requests=0;
  const request=(_url,options,callback)=>{
    requests++;
    options.lookup('score.example',{all:true},(error,addresses)=>{assert.equal(error,null);assert.equal(addresses[0].address,'8.8.8.8');});
    const req=new EventEmitter();req.setTimeout=()=>{};
    queueMicrotask(()=>{const res=new EventEmitter();res.resume=()=>{};res.statusCode=200;res.headers={'content-disposition':'attachment; filename="practice.gp"'};callback(res);res.emit('data',Buffer.from('score bytes'));res.emit('end');});return req;
  };
  const resolveHost=async()=>[{address:'8.8.8.8',family:4}];
  const result=await downloadScore('https://score.example/download',{resolveHost,request});
  assert.equal(result.filename,'practice.gp');assert.equal(result.bytes.toString(),'score bytes');assert.equal(requests,1);
  await assert.rejects(downloadScore('https://score.example/download',{resolveHost:async host=>[{address:host==='private.example'?'127.0.0.1':'8.8.8.8',family:4}],request:(_url,_options,callback)=>{const req=new EventEmitter();req.setTimeout=()=>{};queueMicrotask(()=>callback({statusCode:302,headers:{location:'https://private.example/secret.gp'},resume(){}}));return req;}}),/private network/);
});
