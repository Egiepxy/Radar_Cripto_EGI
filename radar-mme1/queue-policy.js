'use strict';
// LAB: classify the existing queue without inventing timestamps or trading signals.
const TTL=20*60*1000;
const isEntry=msg=>/^📡 RadarMME1 (LONG|SHORT) • /.test(msg);
function planQueue(previous,newMessages,now){
 const clock=Date.parse(now);
 if(!Number.isFinite(clock))throw Error('invalid queue clock');
 const queue=[],archive=[],seen=new Set();let duplicates=0;
 for(const [items,isNew] of [[newMessages,true],[previous,false]]){
  for(const item of items){
   const msg=typeof item==='string'?item:item?.message;
   if(typeof msg!=='string'||!msg.trim()){archive.push({item,reason:'INVALID_MESSAGE',archivedAt:now});continue;}
   if(seen.has(msg)){duplicates++;continue;}seen.add(msg);
   const entry=isEntry(msg);
   const timestamp=entry?msg.match(/Candle fechado: ([^\n]+)/)?.[1]:isNew?now:item?.createdAt;
   const when=Date.parse(timestamp);
   const record={message:msg,createdAt:timestamp??null,entry};
   if(!Number.isFinite(when)||when>clock||clock-when>TTL){archive.push({...record,reason:!Number.isFinite(when)?'UNVERIFIED_TIME':when>clock?'FUTURE':'EXPIRED',archivedAt:now});continue;}
   queue.push(record);
  }
 }
 // Stable priority: entries first, and newer entries first; no queue truncation.
 queue.sort((a,b)=>Number(b.entry)-Number(a.entry)||Date.parse(b.createdAt)-Date.parse(a.createdAt));
 return {queue,archive,duplicates};
}
module.exports={planQueue,isEntry};
