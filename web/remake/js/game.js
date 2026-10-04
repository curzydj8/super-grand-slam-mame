/* 超級大滿貫II 网页重制版 —— 游戏流程状态机
 * 依赖: Taiwan16 (引擎), MahjongTiles (牌面), Sfx (音效)
 * 挂 window.SDMG2Game
 */
(function (g) {
  'use strict';

  var T = function () { return g.Taiwan16; };
  var BETS = [10, 20, 50, 100, 200];

  function Game() {
    this.phase = 'title'; // title|betting|playing|win|doubleup|gameover
    this.credits = 1000;
    this.betIndex = 0;
    this.eg = null;       // 引擎对局状态
    this.mySeat = 0;
    this.drawn = null;    // 刚摸到的牌（未并入手牌）
    this.pendingCalls = null; // 等待玩家决策的鸣牌 {tile, fromSeat, options:[...]}
    this.winInfo = null;
    this.doubleState = null;
    this.message = '';
    this.messageT = 0;
    this.lastDiscard = null; // {tile, seat} 用于界面高亮
    this.onChange = null;
  }

  Game.prototype.bet = function () { return BETS[this.betIndex]; };

  Game.prototype.emit = function () { if (this.onChange) this.onChange(); };

  Game.prototype.say = function (msg, secs) {
    this.message = msg;
    this.messageT = Date.now() + (secs || 2.5) * 1000;
    this.emit();
  };

  // ---- 大厅 ----
  Game.prototype.insertCoin = function () {
    g.Sfx.coin();
    this.credits += 100;
    this.say('投幣 +100');
  };

  Game.prototype.startFromTitle = function () {
    if (this.credits < BETS[0]) { this.say('餘額不足，請投幣'); return; }
    g.Sfx.select();
    this.phase = 'betting';
    this.emit();
  };

  Game.prototype.cycleBet = function () {
    g.Sfx.click();
    this.betIndex = (this.betIndex + 1) % BETS.length;
    if (this.bet() > this.credits) this.betIndex = 0;
    this.emit();
  };

  Game.prototype.startRound = function () {
    var bet = this.bet();
    if (this.credits < bet) { this.say('餘額不足'); return; }
    this.credits -= bet;
    g.Sfx.deal();
    var seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    this.eg = T().createGame(seed);
    this.mySeat = 0;
    this.drawn = null;
    this.pendingCalls = null;
    this.winInfo = null;
    this.phase = 'playing';
    this.say('東一局開始，押注 ' + bet);
    // 庄家先手：如果我是庄家直接摸牌，否则 CPU 先行直到轮到我
    var self = this;
    setTimeout(function () { self.advanceToMyTurn(); }, 600);
  };

  // ---- 回合推进 ----
  Game.prototype.myHand = function () { return this.eg.hands[this.mySeat]; };

  // CPU 行动直到轮到玩家（或对局结束）
  Game.prototype.advanceToMyTurn = function () {
    var self = this;
    function step() {
      if (self.phase !== 'playing' || !self.eg || self.eg.over) return;
      if (self.eg.turn === self.mySeat) { self.beginMyTurn(); return; }
      self.cpuTurn(self.eg.turn);
      if (self.eg.over) { self.finishRound(); return; }
      var ld = self.lastDiscard;
      if (ld && ld.seat !== self.mySeat) {
        // 先问玩家
        var opts = self.myCallOptions(ld.tile, ld.seat);
        if (opts.length) {
          self.pendingCalls = { tile: ld.tile, fromSeat: ld.seat, options: opts };
          self.emit();
          return;
        }
        // 再问其他 CPU
        var claim = self.cpuClaim(ld.tile, ld.seat, self.mySeat);
        if (claim && claim.over) { self.finishRound(); return; }
        if (claim) {
          self.lastDiscard = null;
          if (claim.kong) { self.continueTurn(claim.seat); return; }
          self.emit();
          setTimeout(step, 550);
          return;
        }
      }
      self.lastDiscard = null;
      setTimeout(step, 550);
    }
    step();
  };

  Game.prototype.beginMyTurn = function () {
    var r = T().drawTile(this.eg);
    if (r.exhaustive) { this.eg.over = true; this.eg.result = { type: 'exhaustive' }; this.finishRound(); return; }
    g.Sfx.draw();
    if (r.tile === null) { this.eg.over = true; this.eg.result = { type: 'exhaustive' }; this.finishRound(); return; }
    this.drawn = r.tile;
    if (r.flowersDrawn && r.flowersDrawn.length) this.say('摸到花牌 +' + r.flowersDrawn.length);
    this.emit();
  };

  // 玩家切牌（点击手牌或摸到的牌）
  Game.prototype.playDiscard = function (tile) {
    if (this.phase !== 'playing' || this.drawn === null || this.drawn === -1 || this.pendingCalls) return;
    var hand = this.myHand().slice();
    // 把摸到的牌并入手牌再切
    hand.push(this.drawn);
    var idx = hand.indexOf(tile);
    if (idx < 0) return;
    hand.splice(idx, 1);
    this.eg.hands[this.mySeat] = hand;
    this.eg.discards[this.mySeat].push(tile);
    this.lastDiscard = { tile: tile, seat: this.mySeat };
    this.drawn = null;
    g.Sfx.discard();
    // 检查其他三家：CPU 按顺序决策
    var claim = this.cpuClaim(tile, this.mySeat, this.mySeat);
    if (claim && claim.over) { this.finishRound(); return; }
    if (claim) {
      if (claim.kong) { this.continueTurn(claim.seat); return; }
      // 吃/碰后：若鸣牌者是 CPU 已在 doMeld 内切完牌，检查玩家能否再鸣
      this.emit();
      var self = this;
      setTimeout(function () { self.advanceToMyTurn(); }, 400);
      return;
    }
    this.eg.turn = (this.mySeat + 1) % 4;
    this.emit();
    var self2 = this;
    setTimeout(function () { self2.advanceToMyTurn(); }, 400);
  };

  // CPU 对某张弃牌的鸣牌决策（按座位顺序）。
  // 返回 null=无人要；{over:true}=有人和牌；{seat, kong:boolean}=有人鸣牌
  Game.prototype.cpuClaim = function (tile, fromSeat, skipSeat) {
    for (var k = 1; k <= 3; k++) {
      var seat = (fromSeat + k) % 4;
      if (seat === skipSeat) continue;
      var act = T().callAI(this.eg.hands[seat], tile, fromSeat, seat);
      if (act === 'win') {
        this.doWin(seat, tile, false);
        return { over: true };
      }
      if (act === 'pong' || act === 'kong' || (act === 'chow' && ((seat + 3) % 4) === fromSeat)) {
        this.doMeld(seat, act, tile, fromSeat);
        return { seat: seat, kong: act === 'kong' };
      }
    }
    return null;
  };

  // 鸣牌后继续回合（槓后摸牌）
  Game.prototype.continueTurn = function (seat) {
    if (this.eg.over) { this.finishRound(); return; }
    if (seat === this.mySeat) { this.beginMyTurn(); return; }
    var self = this;
    setTimeout(function () { self.advanceToMyTurn(); }, 450);
  };

  Game.prototype.doMeld = function (seat, kind, tile, fromSeat) {
    var meld = T().makeMeld(this.eg.hands[seat], tile, kind);
    if (!meld) return;
    this.eg.hands[seat] = meld.remaining;
    this.eg.melds[seat].push({ type: kind, tiles: meld.meldTiles, from: fromSeat, concealed: false });
    if (fromSeat !== seat) this.eg.discards[fromSeat].pop();
    this.lastDiscard = null;
    if (kind === 'kong') g.Sfx.kong(); else if (kind === 'pong') g.Sfx.pong(); else g.Sfx.chow();
    var nm = { pong: '碰', chow: '吃', kong: '槓' }[kind];
    this.say((seat === this.mySeat ? '你' : '玩家' + (seat + 1)) + nm + '！');
    this.eg.turn = seat;
    if (kind === 'kong') return; // 槓后摸牌由调用方推进
    if (seat !== this.mySeat) {
      // CPU 鸣牌后直接切牌（同步）
      var d = T().discardAI(this.eg.hands[seat]);
      this.eg.hands[seat] = T().discard(this.eg.hands[seat], d);
      this.eg.discards[seat].push(d);
      this.lastDiscard = { tile: d, seat: seat };
      g.Sfx.discard();
      this.eg.turn = (seat + 1) % 4;
    }
    // 玩家鸣牌后由 playerCall 设置 drawn=-1 等待切牌
    this.emit();
  };

  // CPU 回合：摸牌 → 和/暗槓（循环）→ 切牌。同步执行，不调度。
  Game.prototype.cpuTurn = function (seat) {
    while (true) {
      var r = T().drawTile(this.eg);
      if (r.exhaustive || r.tile === null) { this.eg.over = true; this.eg.result = { type: 'exhaustive' }; return; }
      var h17 = this.eg.hands[seat].concat([r.tile]);
      if (T().isWin(h17)) { this.doWin(seat, r.tile, true); return; }
      var kt = T().findConcealedKong(h17);
      if (kt !== null) {
        var h = h17.slice();
        for (var i = 0; i < 4; i++) h.splice(h.indexOf(kt), 1);
        this.eg.hands[seat] = h;
        this.eg.melds[seat].push({ type: 'kong', tiles: [kt, kt, kt, kt], from: seat, concealed: true });
        g.Sfx.kong();
        this.say('槓！');
        continue; // 槓后继续摸
      }
      var d = T().discardAI(h17);
      this.eg.hands[seat] = T().discard(h17, d);
      this.eg.discards[seat].push(d);
      this.lastDiscard = { tile: d, seat: seat };
      this.eg.turn = (seat + 1) % 4;
      g.Sfx.discard();
      return;
    }
  };

  // 玩家可鸣牌选项
  Game.prototype.myCallOptions = function (tile, fromSeat) {
    var hand = this.myHand();
    var opts = [];
    if (T().canWin(hand, tile)) opts.push('win');
    if (T().canKong(hand, tile)) opts.push('kong');
    if (T().canPong(hand, tile)) opts.push('pong');
    if (((this.mySeat + 3) % 4) === fromSeat && T().canChow(hand, tile)) opts.push('chow');
    return opts;
  };

  Game.prototype.playerCall = function (kind) {
    if (!this.pendingCalls) return;
    var pc = this.pendingCalls;
    this.pendingCalls = null;
    if (kind === 'pass') {
      // 玩家不要，问其他 CPU
      var claim = this.cpuClaim(pc.tile, pc.fromSeat, this.mySeat);
      if (claim && claim.over) { this.finishRound(); return; }
      if (claim) {
        this.lastDiscard = null;
        if (claim.kong) { this.continueTurn(claim.seat); return; }
        this.emit();
        var self = this;
        setTimeout(function () { self.advanceToMyTurn(); }, 400);
        return;
      }
      this.lastDiscard = null;
      this.eg.turn = (pc.fromSeat + 1) % 4;
      if (this.eg.turn === this.mySeat) { this.beginMyTurn(); }
      else { var self2 = this; setTimeout(function () { self2.advanceToMyTurn(); }, 300); }
      return;
    }
    if (kind === 'win') { this.doWin(this.mySeat, pc.tile, false); this.finishRound(); return; }
    this.doMeld(this.mySeat, kind, pc.tile, pc.fromSeat);
    if (kind === 'kong') { this.continueTurn(this.mySeat); return; }
    // 吃/碰后等待玩家切牌
    this.drawn = -1;
    this.say('請切牌');
    this.emit();
  };

  // 玩家鸣牌后的切牌
  Game.prototype.playDiscardAfterMeld = function (tile) {
    if (this.drawn !== -1) return;
    var hand = this.myHand().slice();
    var idx = hand.indexOf(tile);
    if (idx < 0) return;
    hand.splice(idx, 1);
    this.eg.hands[this.mySeat] = hand;
    this.eg.discards[this.mySeat].push(tile);
    this.lastDiscard = { tile: tile, seat: this.mySeat };
    this.drawn = null;
    g.Sfx.discard();
    var claim = this.cpuClaim(tile, this.mySeat, this.mySeat);
    if (claim && claim.over) { this.finishRound(); return; }
    if (claim) {
      if (claim.kong) { this.continueTurn(claim.seat); return; }
      this.emit();
      var self3 = this;
      setTimeout(function () { self3.advanceToMyTurn(); }, 400);
      return;
    }
    this.eg.turn = (this.mySeat + 1) % 4;
    var self = this;
    setTimeout(function () { self.advanceToMyTurn(); }, 400);
    this.emit();
  };

  // 玩家自摸和 / 槓
  Game.prototype.playerSelfWin = function () {
    if (this.drawn === null || this.drawn < 0) return;
    var hand = this.myHand().concat([this.drawn]);
    if (T().isWin(hand)) this.doWin(this.mySeat, this.drawn, true);
  };

  Game.prototype.playerSelfKong = function () {
    if (this.drawn === null || this.drawn < 0) return;
    var hand = this.myHand().concat([this.drawn]);
    var kt = T().findConcealedKong(hand);
    if (kt === null) return;
    // 移除4张
    var h = hand.slice();
    for (var i = 0; i < 4; i++) h.splice(h.indexOf(kt), 1);
    this.eg.hands[this.mySeat] = h;
    this.eg.melds[this.mySeat].push({ type: 'kong', tiles: [kt, kt, kt, kt], from: this.mySeat, concealed: true });
    g.Sfx.kong();
    this.drawn = null;
    this.say('槓！再摸一張');
    var self = this;
    setTimeout(function () { self.beginMyTurn(); }, 500);
  };

  // ---- 结算 ----
  Game.prototype.doWin = function (seat, winTile, selfDraw) {
    var eg = this.eg;
    var hand = eg.hands[seat].slice();
    if (!selfDraw) hand.push(winTile);
    var info = {
      hand17: hand,
      melds: eg.melds[seat],
      winTile: winTile,
      selfDraw: selfDraw,
      isDealer: seat === eg.dealer,
      flowers: eg.flowers[seat],
      renchan: eg.renchan,
      lastTile: eg.wall.length === 0,
      concealed: eg.melds[seat].every(function (m) { return m.concealed; })
    };
    var tr = T().tai(info);
    eg.over = true;
    eg.result = { type: 'win', winner: seat, tai: tr.total, details: tr.details, selfDraw: selfDraw };
    g.Sfx.win();
  };

  Game.prototype.finishRound = function () {
    var r = this.eg.result;
    if (r.type === 'win' && r.winner === this.mySeat) {
      var amount = T().payout(this.bet(), r.tai);
      this.winInfo = { tai: r.tai, details: r.details, amount: amount, selfDraw: r.selfDraw };
      this.credits += amount;
      this.phase = 'win';
      this.say('和牌！' + r.tai + ' 台，得 ' + amount + ' 分');
    } else if (r.type === 'win') {
      this.phase = 'win';
      this.winInfo = { tai: r.tai, details: r.details, amount: 0, loser: true, winner: r.winner };
      g.Sfx.lose();
      this.say('玩家 ' + (r.winner + 1) + ' 和牌 ' + r.tai + ' 台');
    } else {
      this.phase = 'win';
      this.winInfo = { tai: 0, details: [], amount: 0, exhaustive: true };
      this.say('流局');
    }
    // 连庄处理
    if (r.type === 'win' && r.winner === this.eg.dealer) this.eg.renchan++;
    else if (this.eg.dealer === this.mySeat) this.eg.renchan = 0;
    this.emit();
    var self = this;
    setTimeout(function () {
      if (self.phase !== 'win') return;
      if (self.winInfo.amount > 0) {
        self.phase = 'doubleup';
        self.doubleState = { stake: self.winInfo.amount, stage: 0 };
        self.say('比倍？ 大 / 小（放棄=領取）');
      } else {
        self.backToBetting();
      }
      self.emit();
    }, 3200);
  };

  // ---- 比倍 ----
  Game.prototype.doubleChoice = function (pick) { // 'big'|'small'|'take'
    var ds = this.doubleState;
    if (!ds) return;
    if (pick === 'take') {
      this.say('領取 ' + ds.stake + ' 分');
      this.doubleState = null;
      this.backToBetting();
      return;
    }
    var card = (Math.random() * 13 | 0) + 1; // 1-13
    var win = pick === 'big' ? card >= 8 : card <= 6; // 7 为和（退回）
    this.doubleState.card = card;
    this.doubleState.pick = pick;
    if (card === 7) {
      g.Sfx.select();
      this.say('開出 7，和局退回');
    } else if (win) {
      ds.stake *= 2;
      ds.stage++;
      g.Sfx.doubleWin();
      this.credits += ds.stake / 2; // 之前已加过 stake，现在加翻倍部分
      this.winInfo.amount = ds.stake;
      this.say('比倍成功！' + ds.stake + ' 分，繼續？');
    } else {
      g.Sfx.lose();
      this.credits -= this.winInfo.amount; // 没收之前赢的
      this.say('比倍失敗，沒收獎金');
      this.doubleState = null;
      this.winInfo.amount = 0;
      this.backToBetting();
      return;
    }
    this.emit();
  };

  Game.prototype.backToBetting = function () {
    var self = this;
    setTimeout(function () {
      self.phase = self.credits >= BETS[0] ? 'betting' : 'gameover';
      self.eg = null;
      self.winInfo = null;
      self.doubleState = null;
      self.emit();
    }, 1500);
  };

  Game.prototype.retry = function () {
    this.credits = 1000;
    this.phase = 'betting';
    this.emit();
  };

  g.SDMG2Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
