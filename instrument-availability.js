export const instrumentOrder=['piano','guitar','bass','sax','drums','singing','harmonica'];
export const instrumentNames={piano:'Piano',guitar:'Guitar',bass:'Bass',sax:'Saxophone',drums:'Drums',singing:'Singing',harmonica:'Harmonica'};
export const instrumentAvailable=id=>['piano','guitar','bass','sax'].includes(id);
export const instrumentNotice=id=>(instrumentNames[id]||'This instrument')+' — Coming soon';
