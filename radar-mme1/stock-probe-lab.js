'use strict';
const LIST=[
 ['MU',['MUSTOCK_USDT','MU_USDT','MUUSDT']],
 ['SNDK',['SNDKSTOCK_USDT','SNDK_USDT','SNDKUSDT']],
 ['SPCX',['SPCXSTOCK_USDT','SPCX_USDT','SPCXUSDT']],
 ['NVDA',['NVDASTOCK_USDT','NVDA_USDT','NVDAUSDT']],
 ['TSLA',['TSLASTOCK_USDT','TSLA_USDT','TSLAUSDT']],
 ['XAU',['XAU_USDT','XAUUSDT','GOLD_USDT']]
];
async function req(url){
 const r=await fetch(url,{headers:{accept:'application/json','user-agent':'RadarMME1-EGI-Source-LAB/1.0'},signal:AbortSignal.timeout(10000)});
 const t=await r.text();
 if(!r.ok||!t.trim())return {ok:false,http:r.status,error:'corpo vazio ou HTTP'};
 try{return {ok:true,http:r.status,data:JSON.parse(t)}}
 catch{return {ok:false,http:r.status,error:'json invalido'};}
}
(async()=>{
 const out=[];
 for(const [asset,symbols] of LIST){
  for(const symbol of symbols){
   try{
    const u='https://contract.mexc.com/api/v1/contract/kline/'+symbol+'?interval=Min15';
    const k=await req(u);const d=k.data?.data;
    const rows=k.ok&&k.data?.success&&Array.isArray(d?.time)?d.time.length:0;
    out.push({asset,symbol,valid:rows>=30,candles:rows,last:rows?d.time.at(-1):null,code:k.data?.code??null,http:k.http,error:k.error||null});
    if(rows>=30)break;
   }catch(e){out.push({asset,symbol,valid:false,error:String(e.message||e)});}
  }
 }
 console.log(JSON.stringify({generated_at_utc:new Date().toISOString(),source:'MEXC Futures — independent from Binance contracts',out},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
