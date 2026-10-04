(function(g){
'use strict';
// 台式16张麻将引擎核心（144张=136+8花），零依赖
// 牌编码: 0-8 萬1-9, 9-17 筒1-9, 18-26 索1-9, 27-33 東南西北白發中, 34-41 花
var HONOR='東南西北白發中', SUIT='mps';

function suit(t){ return t<27 ? (t/9|0) : t<34 ? 3 : 4; }
function rank(t){ return t<27 ? t%9+1 : 0; }
function isFlower(t){ return t>=34; }
function tileName(t){
  if(t<27) return rank(t)+SUIT[t/9|0];
  if(t<34) return HONOR[t-27];
  return '花'+(t-33);
}
function mulberry32(a){
  return function(){
    a|=0; a=a+0x6D2B79F5|0;
    var t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function createWall(seed){
  var w=[],t,k,rnd=mulberry32(seed>>>0||1);
  for(t=0;t<34;t++) for(k=0;k<4;k++) w.push(t);
  for(t=34;t<42;t++) w.push(t);
  for(var i=w.length-1;i>0;i--){
    var j=(rnd()*(i+1))|0, tmp=w[i]; w[i]=w[j]; w[j]=tmp;
  }
  return w;
}
function createGame(seed){
  var wall=createWall(seed), hands=[[],[],[],[]], r, p, k;
  for(r=0;r<4;r++) for(p=0;p<4;p++) for(k=0;k<4;k++) hands[p].push(wall.pop());
  return {wall:wall, hands:hands, discards:[[],[],[],[]], melds:[[],[],[],[]],
    flowers:[[],[],[],[]], dealer:0, turn:1, renchan:0, over:false, result:null};
}
function drawTile(eg){
  var flowersDrawn=0, t;
  for(;;){
    if(eg.wall.length===0) return {tile:null, flowersDrawn:flowersDrawn, exhaustive:true};
    t=eg.wall.pop();
    if(isFlower(t)){ eg.flowers[eg.turn].push(t); flowersDrawn++; continue; }
    return {tile:t, flowersDrawn:flowersDrawn};
  }
}
function discard(hand,tile){
  var h=hand.slice(), i=h.indexOf(tile);
  if(i>=0) h.splice(i,1);
  return h;
}
function counts(h){
  var c=new Array(34).fill(0);
  for(var i=0;i<h.length;i++){ var t=h[i]; if(t>=0&&t<34) c[t]++; }
  return c;
}
// 15张散牌能否拆成5面子（槓由调用方预拆）
function meldable(c,i){
  while(i<34&&c[i]===0) i++;
  if(i>=34) return true;
  if(c[i]>=3){ c[i]-=3; if(meldable(c,i)) return true; c[i]+=3; }
  var s=i/9|0, r=i%9;
  if(s<3&&r<=6&&c[i+1]>0&&c[i+2]>0){
    c[i]--;c[i+1]--;c[i+2]--;
    if(meldable(c,i)) return true;
    c[i]++;c[i+1]++;c[i+2]++;
  }
  return false;
}
function isWin(h){
  if(!h||h.length!==17) return false;
  var c=counts(h), n=0, i;
  for(i=0;i<34;i++) n+=c[i];
  if(n!==17) return false;
  for(i=0;i<34;i++){
    if(c[i]>=2){
      c[i]-=2;
      if(meldable(c,0)) return true;
      c[i]+=2;
    }
  }
  return false;
}
// 16张标准形向听数 = 10-2*面子-塔子(含对子塔子)-雀头，DFS+记忆化
function shanten(h){
  var c=counts(h), best=99, memo={};
  (function dfs(m,t,p){
    var key=c.join(',')+'|'+m+','+t+','+p;
    if(memo[key]) return;
    memo[key]=1;
    var i=0;
    while(i<34&&c[i]===0) i++;
    if(i>=34){
      var s=10-2*m-Math.min(t,5-m)-p;
      if(s<best) best=s;
      return;
    }
    if(c[i]>=2&&!p){ c[i]-=2; dfs(m,t,1); c[i]+=2; }          // 雀头
    if(c[i]>=2&&m+t<5){ c[i]-=2; dfs(m,t+1,p); c[i]+=2; }      // 对子塔子
    if(c[i]>=3){ c[i]-=3; dfs(m+1,t,p); c[i]+=3; }             // 刻子
    var s=i/9|0, r=i%9;
    if(s<3){
      if(r<=6&&c[i+1]>0&&c[i+2]>0){ c[i]--;c[i+1]--;c[i+2]--; dfs(m+1,t,p); c[i]++;c[i+1]++;c[i+2]++; }
      if(m+t<5&&r<=7&&c[i+1]>0){ c[i]--;c[i+1]--; dfs(m,t+1,p); c[i]++;c[i+1]++; } // 两面
      if(m+t<5&&r<=6&&c[i+2]>0){ c[i]--;c[i+2]--; dfs(m,t+1,p); c[i]++;c[i+2]++; } // 嵌张
    }
    c[i]--; dfs(m,t,p); c[i]++; // 弃一张
  })(0,0,0);
  return best;
}
function countOf(h,t){ var n=0; for(var i=0;i<h.length;i++) if(h[i]===t) n++; return n; }
function canPong(h,t){ return countOf(h,t)>=2; }
function canKong(h,t){ return countOf(h,t)>=3; }
function canChow(h,t){
  var s=t/9|0; if(s>2||t<0) return false;
  var base=s*9, c=counts(h);
  function has(x){ return x>=base&&x<base+9&&c[x]>0; }
  return (has(t-2)&&has(t-1))||(has(t-1)&&has(t+1))||(has(t+1)&&has(t+2));
}
function canWin(h,t){ return isWin(h.concat([t])); }

g.Taiwan16={
  suit:suit, rank:rank, isFlower:isFlower, tileName:tileName,
  createWall:createWall, createGame:createGame, drawTile:drawTile, discard:discard,
  isWin:isWin, shanten:shanten,
  canPong:canPong, canKong:canKong, canChow:canChow, canWin:canWin
};

// ---- 自测（Node 直接跑）----
if(typeof process!=='undefined'&&process.versions&&process.versions.node){
  var pass=0, total=0;
  function eq(a,b,msg){ total++; if(JSON.stringify(a)===JSON.stringify(b)) pass++; else console.error('FAIL '+msg+' got='+JSON.stringify(a)+' want='+JSON.stringify(b)); }
  function ok(x,msg){ total++; if(x) pass++; else console.error('FAIL '+msg); }

  // 牌数与洗牌
  var w1=createWall(123), w2=createWall(123), w3=createWall(999);
  eq(w1.length,144,'wall144');
  var wc=counts(w1.concat([34,35,36,37,38,39,40,41]).filter(function(t){return t<34;}));
  eq(wc.every(function(n){return n===4;}),true,'each34x4');
  eq(w1.filter(function(t){return t>=34;}).length,8,'flowers8');
  eq(JSON.stringify(w1)===JSON.stringify(w2),true,'deterministic');
  eq(JSON.stringify(w1)===JSON.stringify(w3),false,'seed-matters');

  // 开局
  var gm=createGame(7);
  eq(gm.hands.map(function(h){return h.length;}),[16,16,16,16],'deal16x4');
  eq(gm.wall.length,80,'wall80left');
  eq([gm.turn,gm.dealer,gm.over],[1,0,false],'init-state');
  eq(gm.discards.length,4,'discards4');

  // 基础函数
  eq([suit(0),rank(0)], [0,1], 'wan1');
  eq([suit(8),rank(8)], [0,9], 'wan9');
  eq([suit(9),rank(9)], [1,1], 'tong1');
  eq([suit(26),rank(26)],[2,9], 'suo9');
  eq([suit(27),suit(34)], [3,4], 'honor-flower-suit');
  eq(isFlower(33),false,'not-flower'); eq(isFlower(34),true,'is-flower');
  eq(tileName(0),'1m','name1m'); eq(tileName(8),'9m','name9m');
  eq(tileName(9),'1p','name1p'); eq(tileName(26),'9s','name9s');
  eq(tileName(27),'東','nameE'); eq(tileName(33),'中','nameC');

  // isWin 真例
  ok(isWin([0,0,0, 9,9,9, 18,18,18, 27,27,27, 28,28,28, 31,31]),'win-5pung-eye');
  ok(isWin([0,1,2, 3,4,5, 6,7,8, 9,9,9, 19,20,21, 30,30]),'win-mixed');
  ok(isWin([27,27,27, 28,28,28, 29,29,29, 30,30,30, 31,31,31, 32,32]),'win-honors');
  ok(isWin([0,0,0,1,2,3,9,10,11,12,13,14,18,19,20,27,27]),'win-seq-heavy');
  // isWin 反例
  ok(!isWin([0,2,4,6,8,9,11,13,15,17,18,20,22,24,26,27,28]),'nowin-isolated');
  ok(!isWin([0,0,0,1,1,1,2,2,2,3,3,3,4,4,4,5]),'nowin-16tiles');
  ok(!isWin([0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8]),'nowin-8pairs'); // 七对不算
  ok(!isWin([0,0,0,9,9,9,18,18,18,27,27,27,28,28,28,31,34]),'nowin-flower');

  // shanten
  var tenpai1=[0,0,0,1,1,1,2,2,2,3,3,3,27,27,10,11]; // 4刻+雀头+嵌张
  eq(shanten(tenpai1),0,'shanten-tenpai0');
  var tenpai2=[0,0,0,1,1,1,2,2,2,3,3,3,4,4,4,27];    // 5面子+单张
  eq(shanten(tenpai2),0,'shanten-tenpai-pair-wait');
  var s1=[0,0,0,1,1,1,2,2,2,3,3,3,27,27,10,16];      // 4刻+雀头+2散张
  eq(shanten(s1),1,'shanten-1');
  var junk=[27,28,29,30,31,32,33,0,8,9,17,18,26,5,14,23]; // 全孤张
  eq(shanten(junk),10,'shanten-junk10');
  var tp2=[0,0,0,1,1,1,2,2,2,27,27,10,11,13,14,28];  // 3刻+雀头+2塔子+散张
  eq(shanten(tp2),1,'shanten-mid1');

  // 性能：最坏情况单次 <50ms
  var t0=Date.now();
  for(var qi=0;qi<20;qi++) shanten(junk);
  var perMs=(Date.now()-t0)/20;
  console.log('shanten avg ms: '+perMs.toFixed(2));
  ok(perMs<50,'shanten-fast');

  // 吃碰槓胡判定
  ok(canPong([5,5,7],5),'pong-yes'); ok(!canPong([5,7],5),'pong-no');
  ok(canKong([5,5,5,7],5),'kong-yes'); ok(!canKong([5,5,7],5),'kong-no');
  ok(canChow([10,12],11),'chow-kanchan'); ok(canChow([10,11],9),'chow-edge');
  ok(!canChow([10,12],27),'chow-honor-no'); ok(!canChow([10,13],11),'chow-no');
  ok(canWin([0,0,0,1,1,1,2,2,2,3,3,3,27,27,10,11],12),'canwin-yes');
  ok(!canWin([0,0,0,1,1,1,2,2,2,3,3,3,27,27,10,11],15),'canwin-no');

  // discard 不 mutate
  var hd=[1,1,2], hd2=discard(hd,1);
  eq(hd2,[1,2],'discard-one'); eq(hd,[1,1,2],'discard-immutable');
  eq(discard([1,2],9),[1,2],'discard-missing');

  // drawTile 花牌链
  var eg={wall:[6,34,35], turn:2, flowers:[[],[],[],[]]};
  var dr=drawTile(eg);
  eq([dr.tile,dr.flowersDrawn],[6,2],'draw-flower-chain');
  eq(eg.flowers[2],[35,34],'flowers-to-turn');
  eq(eg.wall.length,0,'wall-empty-after');
  var eg2={wall:[], turn:0, flowers:[[],[],[],[]]};
  var dr2=drawTile(eg2);
  eq([dr2.tile,dr2.exhaustive],[null,true],'draw-exhaustive');

  console.log('CORE OK '+pass+'/'+total);
  if(pass!==total) process.exit(1);
}
})(typeof window!=='undefined'?window:globalThis);
