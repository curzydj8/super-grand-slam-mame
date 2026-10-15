/* 超級大滿貫II · 游戏主控
 * 流程（对齐原版街机）：投幣(5) → ODDS押注(3)/開始(1) → 選牌交換(A-N) → 對局
 * → 胡牌结算 → 比倍 → 下一局（回 ODDS）
 * 规则逻辑（sdmg2.js/yaku.js）未动，只调整流程顺序
 */
(function (g) {
  'use strict';
  var E = g.SDMG2Engine;
  var Y = g.SDMG2Yaku;

  var ST = {
    IDLE: 'idle',       // 等待投幣
    ODDS: 'odds',       // 赔率表（投幣/押注/開始）
    SELECT: 'select',   // 選牌交換（A-N 选择要换的牌）
    DEAL: 'deal',       // 發牌
    DRAW: 'draw',       // 玩家摸牌后（待打牌/槓/胡）
    DISCARD: 'discard', // 玩家待打牌（无新摸牌，如吃碰后）
    CPU: 'cpu',         // CPU回合
    CALL: 'call',       // 玩家可吃/碰/槓/胡 CPU的舍牌
    WIN: 'win',         // 结算展示
    DOUBLE: 'double',   // 比倍
    GAMEOVER: 'gameover'
  };

  function Game() {
    this.credit = 0;
    this.bet = 0;
    this.damanguanBet = 0;
    this.donden = 4;
    this.state = ST.IDLE;
    this.wall = [];
    this.playerHand = [];
    this.cpuHand = [];
    this.playerMelds = [];  // {type, tiles, from}
    this.cpuMelds = [];
    this.playerDiscards = [];
    this.cpuDiscards = [];
    this.playerCalled = false;
    this.cpuCalled = false;
    this.lastDraw = -1;
    this.pendingDiscard = -1;  // CPU舍牌待玩家决定
    this.turnCount = 0;
    this.isDealer = true;
    this.winInfo = null;
    this.lastWin = null;
    this.doubleCards = [];
    this.message = '';
    this.listeners = {};
  }

  Game.prototype.on = function (ev, fn) {
    (this.listeners[ev] = this.listeners[ev] || []).push(fn);
  };
  Game.prototype.emit = function (ev, data) {
    var l = this.listeners[ev] || [];
    for (var i = 0; i < l.length; i++) l[i](data);
  };

  /* 投幣 → 进入 ODDS 赔率表 */
  Game.prototype.insertCoin = function (n) {
    if (this.state !== ST.IDLE && this.state !== ST.GAMEOVER && this.state !== ST.ODDS) return;
    this.credit += (n || 1);
    this.state = ST.ODDS;
    this.emit('update');
  };

  /* 押注（ODDS 画面） */
  Game.prototype.addBet = function () {
    if (this.state !== ST.ODDS) return false;
    if (this.credit < 1) { this.message = '請投幣'; this.emit('update'); return false; }
    if (this.bet >= 10) return false;
    this.credit--;
    this.bet++;
    this.message = '按開始進行遊戲';
    this.emit('update');
    return true;
  };

  /* 開始 → 進入選牌交換 */
  Game.prototype.start = function () {
    if (this.state !== ST.ODDS || this.bet < 1) return false;
    this.dealSelect();
    return true;
  };

  /* 選牌交換發牌：玩家14张，CPU 13张 */
  Game.prototype.dealSelect = function () {
    this.wall = E.newWall();
    this.playerHand = [];
    this.cpuHand = [];
    this.playerMelds = [];
    this.cpuMelds = [];
    this.playerDiscards = [];
    this.cpuDiscards = [];
    this.playerCalled = false;
    this.cpuCalled = false;
    this.turnCount = 0;
    this.winInfo = null;
    this.hasDiscarded = false;
    this.exchangeSel = [];
    // 赌博机难度调节：30%概率给玩家发1向听好牌（放水），保持刺激感
    var luck = Math.random();
    if (luck < 0.3) {
      this.playerHand = this.buildServiceHand();
      while (this.playerHand.length < 14) this.playerHand.push(this.wall.pop());
      for (var i = 0; i < 13; i++) this.cpuHand.push(this.wall.pop());
    } else if (luck < 0.45) {
      // 15%概率CPU好牌（庄家优势）
      for (var i = 0; i < 14; i++) this.playerHand.push(this.wall.pop());
      this.cpuHand = this.buildServiceHand();
    } else {
      for (var i = 0; i < 14; i++) this.playerHand.push(this.wall.pop());
      for (var i = 0; i < 13; i++) this.cpuHand.push(this.wall.pop());
    }
    this.sortHand(this.playerHand);
    this.sortHand(this.cpuHand);
    this.state = ST.SELECT;
    this.message = '請選擇您要交換的牌';
    this.emit('update');
  };

  /* 選牌交換：切换选择 */
  Game.prototype.toggleExchange = function (idx) {
    if (this.state !== ST.SELECT) return;
    if (idx < 0 || idx >= this.playerHand.length) return;
    var p = this.exchangeSel.indexOf(idx);
    if (p >= 0) this.exchangeSel.splice(p, 1);
    else this.exchangeSel.push(idx);
    this.emit('update');
  };

  /* 選牌交換：确认，把选中的牌换成墙中的新牌 */
  Game.prototype.confirmExchange = function () {
    if (this.state !== ST.SELECT) return false;
    var sel = this.exchangeSel.slice().sort(function (a, b) { return b - a; });
    for (var i = 0; i < sel.length; i++) {
      this.playerHand.splice(sel[i], 1);
    }
    for (var j = 0; j < sel.length && this.wall.length > 0; j++) {
      this.playerHand.push(this.wall.pop());
    }
    this.sortHand(this.playerHand);
    this.exchangeSel = [];
    this.lastDraw = -1;
    this.selfWin = false;
    this.selfKan = -1;
    // 换牌后 14 张，直接进入待打牌（庄家先打）
    this.state = ST.DISCARD;
    this.message = '請打牌';
    this.emit('update');
    return true;
  };

  Game.prototype.buildServiceHand = function () {
    var suits = [0, 1, 2];
    var s = suits[(Math.random() * 3) | 0];
    var base = s * 9;
    var hand = [];
    for (var m = 0; m < 3; m++) {
      var r = 1 + ((Math.random() * 7) | 0);
      hand.push(base + r - 1, base + r, base + r + 1);
    }
    var pr = 1 + ((Math.random() * 9) | 0);
    hand.push(base + pr - 1, base + pr - 1);
    hand.push(base + ((Math.random() * 9) | 0));
    hand.push(27 + ((Math.random() * 7) | 0));
    for (var i = 0; i < hand.length; i++) {
      var idx = this.wall.indexOf(hand[i]);
      if (idx >= 0) this.wall.splice(idx, 1);
      else hand[i] = this.wall.pop();
    }
    return hand;
  };

  Game.prototype.sortHand = function (h) {
    h.sort(function (a, b) { return a - b; });
  };

  /* 玩家摸牌 */
  Game.prototype.playerDraw = function () {
    if (this.wall.length === 0) { this.drawGame(); return; }
    this.turnCount++;
    this.lastDraw = this.wall.pop();
    this.playerHand.push(this.lastDraw);
    this.state = ST.DRAW;
    // 检查自摸
    this.selfWin = !!E.checkWin(this.playerHand);
    this.selfKan = this.canSelfKan();
  };

  Game.prototype.canSelfKan = function () {
    var c = E.counts(this.playerHand);
    for (var t = 0; t < 34; t++) if (c[t] === 4) return t;
    return -1;
  };

  /* 玩家打牌 */
  Game.prototype.discard = function (idx) {
    if (this.state !== ST.DRAW && this.state !== ST.DISCARD) return false;
    if (idx < 0 || idx >= this.playerHand.length) return false;
    var t = this.playerHand.splice(idx, 1)[0];
    this.playerDiscards.push(t);
    this.hasDiscarded = true;
    this.lastDraw = -1;
    this.selfWin = false;
    this.sortHand(this.playerHand);
    this.emit('update');
    // CPU 是否荣和
    if (E.checkWin(this.cpuHand.concat([t]))) {
      this.cpuRon(t);
      return true;
    }
    // CPU 吃碰槓判定
    this.cpuCallDecision(t);
    return true;
  };

  /* CPU 对玩家舍牌的反应 */
  Game.prototype.cpuCallDecision = function (t) {
    // 简单AI：有胡不吃碰？原版CPU会吃碰
    // 优先：碰 > 吃（简化）
    if (E.canKan(this.cpuHand, t) && Math.random() < 0.9) {
      this.doCpuKan(t);
      return;
    }
    if (E.canPon(this.cpuHand, t) && Math.random() < 0.7) {
      this.doCpuPon(t);
      return;
    }
    var chiOpts = E.canChi(this.cpuHand, t);
    if (chiOpts.length > 0 && Math.random() < 0.4) {
      this.doCpuChi(t, chiOpts[0]);
      return;
    }
    // CPU摸牌
    this.cpuTurn();
  };

  Game.prototype.doCpuPon = function (t) {
    this.removeTiles(this.cpuHand, t, 2);
    this.cpuMelds.push({ type: 'pon', tiles: [t, t, t] });
    this.cpuCalled = true;
    this.playerDiscards.pop();
    this.cpuDiscardAfterCall();
  };

  Game.prototype.doCpuKan = function (t) {
    this.removeTiles(this.cpuHand, t, 3);
    this.cpuMelds.push({ type: 'kan', tiles: [t, t, t, t] });
    this.cpuCalled = true;
    this.playerDiscards.pop();
    // 槓后摸牌
    if (this.wall.length > 0) this.cpuHand.push(this.wall.pop());
    this.cpuDiscardAfterCall();
  };

  Game.prototype.doCpuChi = function (t, tiles) {
    this.removeTiles(this.cpuHand, tiles[0], 1);
    this.removeTiles(this.cpuHand, tiles[1], 1);
    this.cpuMelds.push({ type: 'chi', tiles: [tiles[0], tiles[1], t].sort(function (a, b) { return a - b; }) });
    this.cpuCalled = true;
    this.playerDiscards.pop();
    this.cpuDiscardAfterCall();
  };

  Game.prototype.removeTiles = function (hand, t, n) {
    for (var i = 0; i < n; i++) {
      var idx = hand.indexOf(t);
      if (idx >= 0) hand.splice(idx, 1);
    }
  };

  Game.prototype.cpuDiscardAfterCall = function () {
    var idx = E.aiDiscard(this.cpuHand);
    var t = this.cpuHand.splice(idx, 1)[0];
    this.cpuDiscards.push(t); this.hasDiscarded = true;
    this.sortHand(this.cpuHand);
    this.emit('update');
    // 玩家可吃碰槓胡
    this.offerPlayerCall(t);
  };

  /* CPU回合 */
  Game.prototype.cpuTurn = function () {
    var self = this;
    this.state = ST.CPU;
    this.emit('update');
    setTimeout(function () {
      if (self.wall.length === 0) { self.drawGame(); return; }
      self.cpuHand.push(self.wall.pop());
      // CPU自摸
      if (E.checkWin(self.cpuHand)) {
        self.cpuTsumo();
        return;
      }
      // CPU暗槓
      var c = E.counts(self.cpuHand);
      for (var t = 0; t < 34; t++) {
        if (c[t] === 4 && Math.random() < 0.8) {
          self.removeTiles(self.cpuHand, t, 4);
          self.cpuMelds.push({ type: 'ankan', tiles: [t, t, t, t] });
          if (self.wall.length > 0) self.cpuHand.push(self.wall.pop());
          break;
        }
      }
      var idx = E.aiDiscard(self.cpuHand);
      var dt = self.cpuHand.splice(idx, 1)[0];
      self.cpuDiscards.push(dt); self.hasDiscarded = true;
      self.sortHand(self.cpuHand);
      self.emit('update');
      // 玩家可吃碰槓胡
      self.offerPlayerCall(dt);
    }, 600);
  };

  /* 玩家对CPU舍牌的可选操作 */
  Game.prototype.offerPlayerCall = function (t) {
    this.pendingDiscard = t;
    var canHu = !!E.checkWin(this.playerHand.concat([t]));
    var canP = E.canPon(this.playerHand, t);
    var canK = E.canKan(this.playerHand, t);
    var canC = E.canChi(this.playerHand, t);
    if (canHu || canP || canK || canC.length > 0) {
      this.state = ST.CALL;
      this.callOptions = { hu: canHu, pon: canP, kan: canK, chi: canC };
    } else {
      this.pendingDiscard = -1;
      this.state = ST.DRAW;
      this.playerDraw();
    }
    this.emit('update');
  };

  /* 玩家吃 */
  Game.prototype.playerChi = function (tiles) {
    if (this.state !== ST.CALL) return false;
    var t = this.pendingDiscard;
    this.removeTiles(this.playerHand, tiles[0], 1);
    this.removeTiles(this.playerHand, tiles[1], 1);
    this.playerMelds.push({ type: 'chi', tiles: [tiles[0], tiles[1], t].sort(function (a, b) { return a - b; }) });
    this.playerCalled = true;
    this.cpuDiscards.pop();
    this.pendingDiscard = -1;
    this.state = ST.DISCARD;
    this.emit('update');
    return true;
  };

  /* 玩家碰 */
  Game.prototype.playerPon = function () {
    if (this.state !== ST.CALL) return false;
    var t = this.pendingDiscard;
    this.removeTiles(this.playerHand, t, 2);
    this.playerMelds.push({ type: 'pon', tiles: [t, t, t] });
    this.playerCalled = true;
    this.cpuDiscards.pop();
    this.pendingDiscard = -1;
    this.state = ST.DISCARD;
    this.emit('update');
    return true;
  };

  /* 玩家槓（大明槓） */
  Game.prototype.playerKan = function () {
    if (this.state !== ST.CALL) return false;
    var t = this.pendingDiscard;
    this.removeTiles(this.playerHand, t, 3);
    this.playerMelds.push({ type: 'kan', tiles: [t, t, t, t] });
    this.playerCalled = true;
    this.cpuDiscards.pop();
    this.pendingDiscard = -1;
    if (this.wall.length > 0) {
      this.playerHand.push(this.wall.pop());
      this.state = ST.DRAW;
    } else {
      this.state = ST.DISCARD;
    }
    this.emit('update');
    return true;
  };

  /* 玩家自摸槓 */
  Game.prototype.playerSelfKan = function () {
    if (this.state !== ST.DRAW || this.selfKan < 0) return false;
    var t = this.selfKan;
    this.removeTiles(this.playerHand, t, 4);
    this.playerMelds.push({ type: 'ankan', tiles: [t, t, t, t] });
    this.playerCalled = true;
    if (this.wall.length > 0) {
      this.lastDraw = this.wall.pop();
      this.playerHand.push(this.lastDraw);
    }
    this.selfKan = this.canSelfKan();
    this.selfWin = !!E.checkWin(this.playerHand);
    this.emit('update');
    return true;
  };

  /* 玩家过（不吃碰） */
  Game.prototype.playerPass = function () {
    if (this.state !== ST.CALL) return false;
    this.pendingDiscard = -1;
    this.state = ST.DRAW;
    this.playerDraw();
    this.emit('update');
    return true;
  };

  /* ===== 原版计分（ODDS表倍率，不用立直规则） =====
   * 役滿 50 / 三倍滿 30 / 二倍滿 15 / 一倍滿 8（倍满阈值未知，保守起见不启用）
   * 滿貫 5 / 三翻 3 / 二翻 2 / 一翻 1；"3分以上中滿貫"按横幅文字：分>=3 → 滿貫
   * 分 = yaku.js 牌型 han 之和（仅借用牌型结构判定，不用其立直计分）
   * 滿貫/役滿 → 可玩大滿貫（资格标记；大滿貫玩法未知，未实现）
   */
  Game.prototype.scoreHand = function (hand, wi, opts) {
    var yakumanName = Y.checkYakuman(hand, wi, !!opts.isTenhou);
    var yakuList, tier, mult, fen = 0;
    if (yakumanName) {
      yakuList = [{ name: yakumanName, han: 13 }];
      tier = '役滿'; mult = 50;
    } else {
      yakuList = Y.checkYaku(hand, wi, { called: !!opts.called, tsumo: !!opts.tsumo });
      for (var i = 0; i < yakuList.length; i++) fen += yakuList[i].han;
      if (fen <= 0) fen = 1; // 无役按一翻保底
      if (fen >= 3) { tier = '滿貫'; mult = 5; }
      else if (fen === 2) { tier = '二翻'; mult = 2; }
      else { tier = '一翻'; mult = 1; }
    }
    return {
      yakuList: yakuList, tier: tier, mult: mult, fen: fen,
      points: mult * this.bet,
      yakuman: tier === '役滿',
      damanguan: (tier === '役滿' || tier === '滿貫')
    };
  };

  /* 玩家胡（自摸/荣和） */
  Game.prototype.playerWin = function (isTsumo) {
    var hand, winTile;
    if (isTsumo) {
      hand = this.playerHand.slice();
      winTile = this.lastDraw;
    } else {
      if (this.state !== ST.CALL) return false;
      hand = this.playerHand.concat([this.pendingDiscard]);
      winTile = this.pendingDiscard;
      this.cpuDiscards.pop();
    }
    var wi = E.checkWin(hand);
    if (!wi) return false;

    var isTenhou = (!this.hasDiscarded && this.turnCount <= 1 && isTsumo);
    var s = this.scoreHand(hand, wi, { called: this.playerCalled, tsumo: isTsumo, isTenhou: isTenhou });

    this.lastWin = {
      winner: 'player',
      hand: hand,
      winTile: winTile,
      yakuList: s.yakuList,
      tier: s.tier,
      fen: s.fen,
      points: s.points,
      yakuman: s.yakuman,
      damanguan: s.damanguan,
      isTsumo: isTsumo
    };
    this.credit += s.points;
    this.state = ST.WIN;
    this.emit('win', this.lastWin);
    this.emit('update');
    return true;
  };

  /* CPU荣和玩家 */
  Game.prototype.cpuRon = function (t) {
    var hand = this.cpuHand.concat([t]);
    var wi = E.checkWin(hand);
    var s = this.scoreHand(hand, wi, { called: this.cpuCalled, tsumo: false, isTenhou: false });
    this.lastWin = {
      winner: 'cpu',
      hand: hand,
      winTile: t,
      yakuList: s.yakuList,
      tier: s.tier,
      fen: s.fen,
      points: s.points,
      yakuman: s.yakuman,
      damanguan: false,
      isTsumo: false
    };
    this.state = ST.WIN;
    this.emit('win', this.lastWin);
    this.emit('update');
  };

  /* CPU自摸 */
  Game.prototype.cpuTsumo = function () {
    var hand = this.cpuHand.slice();
    var wi = E.checkWin(hand);
    var s = this.scoreHand(hand, wi, { called: this.cpuCalled, tsumo: true, isTenhou: false });
    this.lastWin = {
      winner: 'cpu',
      hand: hand,
      winTile: -1,
      yakuList: s.yakuList,
      tier: s.tier,
      fen: s.fen,
      points: s.points,
      yakuman: s.yakuman,
      damanguan: false,
      isTsumo: true
    };
    this.state = ST.WIN;
    this.emit('win', this.lastWin);
    this.emit('update');
  };

  /* 流局 */
  Game.prototype.drawGame = function () {
    this.lastWin = { winner: 'draw' };
    this.state = ST.WIN;
    this.emit('win', this.lastWin);
    this.emit('update');
  };

  /* 比倍 */
  Game.prototype.startDouble = function () {
    if (this.state !== ST.WIN || !this.lastWin || this.lastWin.winner !== 'player') return false;
    if (!this.lastWin.points || this.lastWin.points <= 0) return false;
    this.doubleCards = [this.drawCard(), this.drawCard(), this.drawCard(), this.drawCard(), this.drawCard()];
    this.doubleStake = this.lastWin.points;
    this.doubleResult = null;
    this.state = ST.DOUBLE;
    this.emit('update');
    return true;
  };

  Game.prototype.drawCard = function () {
    // 比倍用牌：1-13点
    return 1 + ((Math.random() * 13) | 0);
  };

  /* 比倍：注额 = 上次得分；赢→注额翻倍（可继续比），输→没收注额，和→重发 */
  Game.prototype.doubleBet = function (big) {
    if (this.state !== ST.DOUBLE) return false;
    var dealer = this.doubleCards[0];
    var player = this.doubleCards[1];
    if (player === dealer) {
      // 和局：注额不变，重发牌（保守处理，原版规则未知）
      this.doubleCards = [this.drawCard(), this.drawCard(), this.drawCard(), this.drawCard(), this.drawCard()];
      this.doubleResult = null;
      this.emit('update');
      return true;
    }
    var win = big ? (player > dealer) : (player < dealer);
    if (win) {
      this.credit += this.doubleStake; // 注额已在结算时加过一次，再加一次 = 翻倍
      this.doubleStake *= 2;
      this.lastWin.points = this.doubleStake;
      // 可继续比倍：重发牌
      this.doubleCards = [this.drawCard(), this.drawCard(), this.drawCard(), this.drawCard(), this.drawCard()];
      this.doubleResult = null;
    } else {
      this.credit -= this.doubleStake;
      if (this.credit < 0) this.credit = 0;
      this.lastWin.points = 0;
      this.doubleResult = { dealer: dealer, player: player, win: false };
      this.state = ST.WIN;
    }
    this.emit('update');
    return true;
  };

  /* 下一局 */
  Game.prototype.nextRound = function () {
    this.bet = 0;
    this.lastWin = null;
    this.state = this.credit > 0 ? ST.ODDS : ST.GAMEOVER;
    this.message = this.state === ST.ODDS ? '請押注' : '請投幣';
    this.emit('update');
  };

  g.SDMG2Game = Game;
  g.SDMG2_ST = ST;
})(typeof window !== 'undefined' ? window : globalThis);
