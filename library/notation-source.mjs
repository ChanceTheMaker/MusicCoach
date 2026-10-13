import {XMLParser,XMLValidator} from 'fast-xml-parser';

export const MAX_NOTATION_BYTES=8*1024*1024;
export function validateNotation(source) {
  if(!source||source.format!=='musicxml'||typeof source.xml!=='string')throw Error('Original notation must be MusicXML.');
  if(Buffer.byteLength(source.xml,'utf8')>MAX_NOTATION_BYTES)throw Error('Original notation exceeds 8 MB.');
  if(/<!ENTITY|<!DOCTYPE[^>]*\[/i.test(source.xml))throw Error('MusicXML entity declarations are not supported.');
  const xml=source.xml.replace(/<!DOCTYPE[^>]*>/gi,'');
  if(XMLValidator.validate(xml)!==true)throw Error('Original notation is not valid XML.');
  const root=new XMLParser({ignoreAttributes:false,processEntities:false}).parse(xml)['score-partwise'];
  if(!root)throw Error('Original notation must be partwise MusicXML.');
  const parts=Array.isArray(root.part)?root.part:[root.part];
  const ids=parts.filter(Boolean).map(p=>String(p['@_id']||''));
  if(!ids.length||ids.length>64||ids.some(id=>!id)||new Set(ids).size!==ids.length)throw Error('Original notation needs unique part IDs.');
  const partIds=source.partIds??ids;
  if(!Array.isArray(partIds)||!partIds.length||partIds.length>64||partIds.some(id=>typeof id!=='string'||!ids.includes(id)))throw Error('Original notation contains an unknown selected part.');
  const transpose=source.transpose??0;
  if(!Number.isInteger(transpose)||Math.abs(transpose)>72)throw Error('Invalid original-notation transposition.');
  return {format:'musicxml',xml,partIds:[...new Set(partIds)],transpose};
}
