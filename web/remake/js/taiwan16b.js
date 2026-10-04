/* 台式16张麻将 · 计分与AI（taiwan16b.js）
 * 挂载到 Taiwan16：tai / payout / makeMeld / findConcealedKong / discardAI / callAI
 * 调用 taiwan16.js 的 suit/rank/isFlower/isWin（动态查找，兼容其替换式挂载，见文末合并守卫）
 * 牌编码遵循项目约定：0-8萬 9-17筒 18-26索 27-33東南西北白發中 34-41花。零依赖。
 */
(function(g){
'use strict';
var T = g.Taiwan16 || {};
function N(){ return g.Taiwan16; }

/* ----- 语义辅助（经 T.suit/rank/isFlower；花色兼容数字与字符串） ----- */
function S(t){ var s=N().suit(t);
  if(s===0||s==='m'||s==='M')return 0;
  if(s===1||s==='p'||s==='P')return 1;
  if(s===2||s==='s'||s==='S')return 2;
  return 3; }
function R(t){ return N().rank(t)|0; }
function FL(t){ return !!N().isFlower(t); }
function isDragon(t){ if(t===31||t===32||t===33)return true;
  if(S(t)!==3)return false; var r=R(t); return r>=5&&r<=7; }
function isWind(t){ if(t>=27&&t<=30)return true;
  if(S(t)!==3)return false; var r=R(t); return r>=1&&r<=4; }
function isYao9(t){ var s=S(t); return s===3||(s<3&&(R(t)===1||R(t)===9)); }
function key(t){ var s=S(t); return s<3 ? s*10+R(t) : 100+t; }

/* ----- 通用向听（DFS；k组已副露 -> 目标(5-k)面子+1雀头；T.shanten只管16张散牌） ----- */
function shantenOf(hand){
  var counts={}, n=0, i, t, k;
  for(i=0;i<hand.length;i++){ t=hand[i]; if(FL(t))continue; k=key(t); counts[k]=(counts[k]||0)+1; n++; }
  var G=5-Math.max(0,Math.round((16-n)/3)); if(G>5)G=5; if(G<0)G=0;
  var best=0;
  function first(){ for(var kk in counts) if(counts[kk]>0) return +kk; return -1; }
  function dfs(m,ta,p){
    var kk=first();
    if(kk<0){ var sc=2*m+ta+(p?1:0); if(sc>best)best=sc; return; }
    var isH=kk>=100, su=isH?3:((kk/10)|0), ra=isH?0:(kk%10), c=counts[kk];
    var k1=su*10+ra+1, k2=su*10+ra+2;
    if(!p&&c>=2){ counts[kk]-=2; dfs(m,ta,true); counts[kk]+=2; }
    if(m<G){
      if(c>=3){ counts[kk]-=3; dfs(m+1,ta,p); counts[kk]+=3; }
      if(!isH&&ra<=7&&counts[k1]>0&&counts[k2]>0){
        counts[kk]--;counts[k1]--;counts[k2]--; dfs(m+1,ta,p); counts[kk]++;counts[k1]++;counts[k2]++;
      }
    }
    if(m+ta<G){
      if(c>=2){ counts[kk]-=2; dfs(m,ta+1,p); counts[kk]+=2; }
      if(!isH){
        if(counts[k1]>0){ counts[kk]--;counts[k1]--; dfs(m,ta+1,p); counts[kk]++;counts[k1]++; }
        if(ra<=7&&counts[k2]>0){ counts[kk]--;counts[k2]--; dfs(m,ta+1,p); counts[kk]++;counts[k2]++; }
      }
    }
    var sv=counts[kk]; counts[kk]=0; dfs(m,ta,p); counts[kk]=sv;
  }
  dfs(0,0,false);
  return 2*G-best;
}

/* ----- 17张标准和牌判定（仅自测mock用；正式用 T.isWin） ----- */
function win17(tiles){
  var counts={}, i;
  for(i=0;i<tiles.length;i++){ var t=tiles[i]; if(FL(t))continue; var k=key(t); counts[k]=(counts[k]||0)+1; }
  function decomp(){
    var kk=-1;
    for(var k in counts){ if(counts[k]>0){ kk=+k; break; } }
    if(kk<0) return true;
    var isH=kk>=100, su=isH?3:((kk/10)|0), ra=isH?0:(kk%10);
    if(counts[kk]>=3){ counts[kk]-=3; if(decomp()){counts[kk]+=3;return true;} counts[kk]+=3; }
    if(!isH&&ra<=7){ var k1=su*10+ra+1,k2=su*10+ra+2;
      if(counts[k1]>0&&counts[k2]>0){ counts[kk]--;counts[k1]--;counts[k2]--;
        if(decomp()){counts[kk]++;counts[k1]++;counts[k2]++;return true;}
        counts[kk]++;counts[k1]++;counts[k2]++; } }
    return false;
  }
  for(var k in counts){ if(counts[k]>=2){ counts[k]-=2; if(decomp()){counts[k]+=2;return true;} counts[k]+=2; } }
  return false;
}

/* ----- 碰碰胡判定：暗牌部分全由刻子+一对组成（无顺子） ----- */
function isAllPong(tiles){
  var counts={}, ks=[], i, k;
  for(i=0;i<tiles.length;i++){ var t=tiles[i]; if(FL(t))continue; k=key(t); counts[k]=(counts[k]||0)+1; }
  for(k in counts) ks.push(k);
  for(i=0;i<ks.length;i++){ k=ks[i]; if(counts[k]<2)continue;
    counts[k]-=2; var ok=true;
    for(var j=0;j<ks.length;j++){ if(counts[ks[j]]%3!==0){ ok=false; break; } }
    counts[k]+=2;
    if(ok) return true;
  }
  return false;
}

/* ----- 计分 -----
 * info={hand17, melds:[{type:'pong'|'kong'|'chow',tiles,concealed}], winTile,
 *       selfDraw, isDealer, flowers, renchan, lastTile, kongWin}
 */
function tai(info){
  info=info||{};
  var hand=info.hand17||[], melds=info.melds||[], flowers=info.flowers||[];
  var details=[];
  function add(name,v){ if(v>0)details.push({name:name,value:v}); }
  var all=hand.slice();
  melds.forEach(function(m){ all=all.concat(m.tiles||[]); });
  var suits={}, hasHonor=false, dCnt=[0,0,0], wCnt=[0,0,0,0];
  all.forEach(function(t){ if(FL(t))return; var s=S(t);
    if(s<3){ suits[s]=1; } else { hasHonor=true;
      if(t===31)dCnt[0]++; else if(t===32)dCnt[1]++; else if(t===33)dCnt[2]++;
      else if(t>=27&&t<=30)wCnt[t-27]++; } });
  var nSuits=Object.keys(suits).length;
  var hasOpen=melds.some(function(m){ return !m.concealed; });
  var hasConcealedMeld=melds.some(function(m){ return !!m.concealed; });
  var concealedPair=hand.length===2&&hand[0]===hand[1]&&!FL(hand[0]);
  if(info.isDealer)add('莊家',1);
  if(info.renchan>0)add('連莊',info.renchan|0);
  if(info.selfDraw)add('自摸',1);
  if(!hasOpen)add('門清',1);
  else if(!hasConcealedMeld&&!info.selfDraw&&concealedPair)add('全求人',2);
  if(melds.every(function(m){ return m.type!=='chow'; })&&isAllPong(hand))add('碰碰胡',2);
  if(nSuits===1&&!hasHonor)add('清一色',8);
  else if(nSuits===1)add('混一色',4);
  var dT=dCnt.filter(function(c){ return c>=3; }).length;
  var dP=dCnt.filter(function(c){ return c===2; }).length;
  var wT=wCnt.filter(function(c){ return c>=3; }).length;
  var wP=wCnt.filter(function(c){ return c===2; }).length;
  if(dT===3)add('大三元',8); else if(dT===2&&dP===1)add('小三元',4);
  if(wT===4)add('大四喜',16); else if(wT===3&&wP===1)add('小四喜',8);
  if(info.lastTile)add(info.selfDraw?'海底撈月':'河底撈魚',1);
  if(info.kongWin)add('槓上開花',1);
  var yao9=0, kongs=0;
  melds.forEach(function(m){ var ts=m.tiles||[];
    if(m.type==='kong')kongs++;
    if(!m.concealed&&(m.type==='pong'||m.type==='kong')&&ts.length&&isYao9(ts[0]))yao9++;
  });
  add('么九明刻',yao9); add('槓',kongs); add('花牌',flowers.length);
  var total=0; details.forEach(function(d){ total+=d.value; });
  if(total<1){ add('保底',1); total=1; }
  return {total:total,details:details};
}

/* ----- 赔付：bet * 2^min(tai,8)，取整 ----- */
function payout(bet,t){ return Math.round(bet*Math.pow(2,Math.min(t,8))); }

/* ----- 鸣牌（不mutate原手牌）：{meldTiles, remaining} / null ----- */
function makeMeld(hand, tile, kind){
  var h=hand.slice(), i;
  function rm(t){ var ix=h.indexOf(t); if(ix<0)return false; h.splice(ix,1); return true; }
  if(kind==='pong'||kind==='kong'){
    var need=kind==='pong'?2:3;
    for(i=0;i<need;i++) if(!rm(tile)) return null;
    var mt=[]; for(i=0;i<need+1;i++) mt.push(tile);
    return {meldTiles:mt,remaining:h};
  }
  if(kind==='chow'){
    if(FL(tile)||S(tile)>=3) return null;
    var s=S(tile), r=R(tile), opts=[[r-2,r-1],[r-1,r+1],[r+1,r+2]];
    for(i=0;i<opts.length;i++){ var a=opts[i][0], b=opts[i][1];
      if(a<1||b>9) continue;
      var ta=-1, tb=-1;
      for(var j=0;j<h.length;j++){
        if(ta<0&&S(h[j])===s&&R(h[j])===a) ta=j;
        else if(tb<0&&S(h[j])===s&&R(h[j])===b) tb=j;
      }
      if(ta>=0&&tb>=0){
        var A=h[ta], B=h[tb];
        h.splice(Math.max(ta,tb),1); h.splice(Math.min(ta,tb),1);
        var m2=[tile,A,B].sort(function(x,y){ return R(x)-R(y); });
        return {meldTiles:m2,remaining:h};
      }
    }
    return null;
  }
  return null;
}

/* ----- 暗槓：4张相同返回该牌，否则null ----- */
function findConcealedKong(hand){
  var c={};
  for(var i=0;i<hand.length;i++){ var t=hand[i]; c[t]=(c[t]||0)+1; if(c[t]===4) return t; }
  return null;
}

/* ----- 切牌AI：向听最小；并列进张最多；不退向听（除非都退） ----- */
function discardAI(hand){
  var cands=[], seen={}, i, t;
  for(i=0;i<hand.length;i++){ t=hand[i]; if(FL(t)||seen[t])continue; seen[t]=1; cands.push(t); }
  if(!cands.length) return hand.length?hand[0]:null;
  function minus(h,x){ var r=h.slice(), ix=r.indexOf(x); if(ix>=0)r.splice(ix,1); return r; }
  var s0=shantenOf(hand), pool=[];
  for(i=0;i<cands.length;i++){ var h2=minus(hand,cands[i]), s=shantenOf(h2);
    if(s<=s0) pool.push({t:cands[i],h2:h2,s:s}); }
  if(!pool.length) for(i=0;i<cands.length;i++){ var h3=minus(hand,cands[i]); pool.push({t:cands[i],h2:h3,s:shantenOf(h3)}); }
  var bs=pool[0].s;
  for(i=1;i<pool.length;i++) if(pool[i].s<bs) bs=pool[i].s;
  var bt=pool[0].t, bu=-1;
  for(i=0;i<pool.length;i++){ if(pool[i].s!==bs)continue;
    var u=ukeire(pool[i].h2,bs);
    if(u>bu){ bu=u; bt=pool[i].t; } }
  return bt;
}
function ukeire(h2, s) {
  // 轻量进张启发：不跑 shanten，只看搭子潜力
  var counts = {}, i, t;
  for (i = 0; i < h2.length; i++) { t = h2[i]; counts[t] = (counts[t] || 0) + 1; }
  var u = 0;
  for (t = 0; t < 34; t++) {
    var c = counts[t] || 0;
    if (c >= 4) continue;
    if (c > 0) { u += (4 - c) * 2; continue; } // 对子潜力
    var su = (t / 9) | 0, ra = t % 9;
    if (su < 3) {
      var has = function (x) { return x >= su * 9 && x < su * 9 + 9 && (counts[x] || 0) > 0; };
      if ((has(t - 2) && has(t - 1)) || (has(t - 1) && has(t + 1)) || (has(t + 1) && has(t + 2))) u += 4;
    }
  }
  return u;
}

/* ----- 鸣牌AI：'win'|'kong'|'pong'|'chow'|null ----- */
function callAI(hand, tile, fromSeat, mySeat){
  if(FL(tile)) return null;
  if(N().isWin(hand.concat([tile]))) return 'win';
  var s0=shantenOf(hand);
  function better(kind){ var m=makeMeld(hand,tile,kind);
    return !!m&&shantenOf(m.remaining)<s0; }
  if(better('kong')) return 'kong';
  if(better('pong')) return 'pong';
  if(((mySeat+3)%4)===fromSeat&&better('chow')) return 'chow';
  return null;
}

Object.assign(T,{tai:tai,payout:payout,makeMeld:makeMeld,
  findConcealedKong:findConcealedKong,discardAI:discardAI,callAI:callAI});

/* 合并守卫：taiwan16.js 用替换式挂载（g.Taiwan16={...}），拦截其赋值改为合并，
 * 无论两文件谁先加载，最终都在同一命名空间。 */
try{
  var _cur=T;
  Object.defineProperty(g,'Taiwan16',{configurable:true,enumerable:true,
    get:function(){ return _cur; },
    set:function(v){ if(v&&v!==_cur) Object.assign(_cur,v); }});
}catch(e){ g.Taiwan16=T; }

/* ----- 自测（Node 直接跑） ----- */
if(typeof require!=='undefined'&&typeof module!=='undefined'&&require.main===module){
  try{ require('./taiwan16.js'); }catch(e){}
  if(!N().suit){ /* 最小 mock（0-41 编码） */
    N().suit=function(t){ return t<9?0:t<18?1:t<27?2:3; };
    N().rank=function(t){ return t<27?(t%9)+1:0; };
    N().isFlower=function(t){ return t>=34; };
    N().isWin=function(h){ return win17(h); };
    N().shanten=function(h){ return shantenOf(h); };
  }
  var pass=0, fail=0;
  function eq(a,b,msg){ if(a===b){pass++;} else {fail++; console.error('FAIL '+msg+': got '+JSON.stringify(a)+' want '+JSON.stringify(b));} }
  function hasTai(r,name,v){ var d=r.details.filter(function(x){return x.name===name;})[0];
    eq(d&&d.value,v,'tai-detail:'+name); }

  /* 1. 清一色自摸門清=10（111 222 345 678 999萬 + 55萬） */
  var r1=tai({hand17:[0,0,0,1,1,1,2,3,4,5,6,7,8,8,8,4,4],melds:[],selfDraw:true,flowers:[]});
  eq(r1.total,10,'t1-total'); hasTai(r1,'清一色',8);

  /* 2. 2花+自摸=3（有一组明刻，不算門清） */
  var r2=tai({hand17:[0,0,0,10,10,10,20,21,22,5,6,7,31,31],
    melds:[{type:'pong',tiles:[13,13,13],concealed:false}],selfDraw:true,flowers:[34,35]});
  eq(r2.total,3,'t2-total');

  /* 3. payout */
  eq(payout(100,3),800,'payout-800');
  eq(payout(50,10),12800,'payout-cap8');
  eq(payout(10,0),10,'payout-0');

  /* 4. makeMeld */
  var m1=makeMeld([5,5,7,8],5,'pong');
  eq(m1&&m1.meldTiles.join(), '5,5,5','meld-pong-tiles');
  eq(m1&&m1.remaining.join(),'7,8','meld-pong-rem');
  var m2=makeMeld([9,11,20],10,'chow');
  eq(m2&&m2.meldTiles.join(), '9,10,11','meld-chow-tiles');
  eq(m2&&m2.remaining.join(),'20','meld-chow-rem');
  eq(makeMeld([5,7],5,'pong'),null,'meld-impossible');

  /* 5. findConcealedKong */
  eq(findConcealedKong([5,5,5,5,7]),5,'kong-found');
  eq(findConcealedKong([5,5,5,7]),null,'kong-none');

  /* 6. discardAI 不退向听（听牌形+一张废牌32，必切32） */
  var dh=[0,0,0,1,1,1,2,2,2,3,4,5,6,6,7,8,32];
  var dc=discardAI(dh);
  eq(dc,32,'discard-waste');
  var after=dh.slice(); after.splice(after.indexOf(dc),1);
  eq(N().shanten(after)<=N().shanten(dh),true,'discard-no-regress');

  /* 7. 大三元8+混一色4+么九明刻2+碰碰胡2=16（全求人不成立：暗牌非单钓） */
  var r7=tai({hand17:[33,33,33,0,0,0,1,1,1,2,2],
    melds:[{type:'pong',tiles:[31,31,31],concealed:false},{type:'pong',tiles:[32,32,32],concealed:false}],
    selfDraw:false,flowers:[]});
  eq(r7.total,16,'t7-daisanyuan');

  /* 8. 全求人=2（四组明副露+单钓将；与門清互斥） */
  var r8=tai({hand17:[7,7],
    melds:[{type:'pong',tiles:[3,3,3],concealed:false},{type:'pong',tiles:[13,13,13],concealed:false},
           {type:'chow',tiles:[21,22,23],concealed:false},{type:'pong',tiles:[5,5,5],concealed:false}],
    selfDraw:false,flowers:[]});
  eq(r8.total,2,'t8-quanqiuren');
  eq(r8.details.some(function(x){return x.name==='門清';}),false,'t8-no-menqing');

  /* 9. callAI */
  eq(callAI([0,0,0,1,1,1,2,2,2,3,4,5,6,6,7,8],6,1,0),'win','call-win');
  eq(callAI([0,0,0,1,1,1,10,10,10,27,27,25,26,32,13,14],24,3,0),'chow','call-chow');

  console.log('SCORING OK '+pass+'/'+(pass+fail));
  if(fail>0) process.exit(1);
}
})(typeof window!=='undefined'?window:globalThis);
