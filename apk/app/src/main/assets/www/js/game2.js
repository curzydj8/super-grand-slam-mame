/* 超級大滿貫II · 游戏主控
 * 流程：投幣/押注 → 發牌 → 玩家摸打 → CPU摸打 → ……
 * → 胡牌结算 → 比倍 → 下一局
 */
(function (g) {
  'use strict';
  var E = g.SDMG2Engine;
  var Y = g.SDMG2Yaku;

  var ST = {
    IDLE: 'idle',       // 等待投幣/押注
    BET: 'bet',         // 押注中
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

  /* 投幣 */
  Game.prototype.insertCoin = function (n) {
    this.credit += (n || 1);
    this.emit('update');
  };

  /* 押注 */
  Game.prototype.addBet = function () {
    if (this.state !== ST.IDLE && this.state !== ST.BET) return false;
    if (this.credit < 1) { this.message = '請投幣'; this.emit('update'); return false; }
    if (this.bet >= 10) return false;
    this.credit--;
    this.bet++;
    this.state = ST.BET;
    this.message = '按開始進行遊戲';
    this.emit('update');
    return true;
  };

  /* 開始 */
  Game.prototype.start = function () {
    if (this.state !== ST.BET || this.bet < 1) return false;
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
    this.hasDiscarded = false; // 是否有人打过牌（用于天和判定）
    // 發牌：各13张
    // 赌博机难度调节：30%概率给玩家发1向听好牌（放水），保持刺激感
    var luck = Math.random();
    if (luck < 0.3) {
      this.dealServiceHand();
    } else if (luck < 0.45) {
      // 15%概率CPU好牌（庄家优势）
      this.dealServiceHandCPU();
    } else {
      for (var i = 0; i < 13; i++) {
        this.playerHand.push(this.wall.pop());
        this.cpuHand.push(this.wall.pop());
      }
    }
    var redraw = 0;
    while (E.shanten(this.playerHand) > 4 && redraw < 3) {
      // 把玩家手牌放回重洗
      for (var i = 0; i < 13; i++) this.wall.push(this.playerHand.pop());
      for (var i = this.wall.length - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0;
        var tmp = this.wall[i]; this.wall[i] = this.wall[j]; this.wall[j] = tmp;
      }
      for (var i = 0; i < 13; i++) this.playerHand.push(this.wall.pop());
      redraw++;
    }
    this.sortHand(this.playerHand);
    this.sortHand(this.cpuHand);
    // 天和检查
    var tenhou = E.checkWin(this.playerHand.concat([]));
    // 庄家先摸
    this.state = ST.DRAW;
    this.playerDraw();
    this.message = '請打牌';
    this.emit('update');
    return true;
  };

  /* 放水发牌：构造1向听手牌（给玩家） */
  Game.prototype.dealServiceHand = function () {
    this.playerHand = this.buildServiceHand();
    for (var i = 0; i < 13; i++) this.cpuHand.push(this.wall.pop());
  };

  /* 放水发牌：构造1向听手牌（给CPU） */
  Game.prototype.dealServiceHandCPU = function () {
    for (var i = 0; i < 13; i++) this.playerHand.push(this.wall.pop());
    this.cpuHand = this.buildServiceHand();
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
    var yakumanName = Y.checkYakuman(hand, wi, isTenhou);
    var yakuList, score;
    if (yakumanName) {
      yakuList = [{ name: yakumanName, han: 13 }];
      score = Y.calcScore(13, this.bet, true);
    } else {
      yakuList = Y.checkYaku(hand, wi, { called: this.playerCalled, tsumo: isTsumo });
      var han = 0;
      for (var i = 0; i < yakuList.length; i++) han += yakuList[i].han;
      if (han === 0) han = 1; // 无役也有基本点（原版风格）
      score = Y.calcScore(han, this.bet, false);
    }

    this.lastWin = {
      winner: 'player',
      hand: hand,
      winTile: winTile,
      yakuList: yakuList,
      han: score.han,
      points: score.points,
      yakuman: score.yakuman,
      isTsumo: isTsumo
    };
    this.credit += score.points;
    this.state = ST.WIN;
    this.emit('win', this.lastWin);
    this.emit('update');
    return true;
  };

  /* CPU荣和玩家 */
  Game.prototype.cpuRon = function (t) {
    var hand = this.cpuHand.concat([t]);
    var wi = E.checkWin(hand);
    var yakumanName = Y.checkYakuman(hand, wi, false);
    var yakuList, score;
    if (yakumanName) {
      yakuList = [{ name: yakumanName, han: 13 }];
      score = Y.calcScore(13, this.bet, true);
    } else {
      yakuList = Y.checkYaku(hand, wi, { called: this.cpuCalled, tsumo: false });
      var han = 0;
      for (var i = 0; i < yakuList.length; i++) han += yakuList[i].han;
      if (han === 0) han = 1;
      score = Y.calcScore(han, this.bet, false);
    }
    this.lastWin = {
      winner: 'cpu',
      hand: hand,
      winTile: t,
      yakuList: yakuList,
      han: score.han,
      points: score.points,
      yakuman: score.yakuman,
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
    var yakumanName = Y.checkYakuman(hand, wi, false);
    var yakuList, score;
    if (yakumanName) {
      yakuList = [{ name: yakumanName, han: 13 }];
      score = Y.calcScore(13, this.bet, true);
    } else {
      yakuList = Y.checkYaku(hand, wi, { called: this.cpuCalled, tsumo: true });
      var han = 0;
      for (var i = 0; i < yakuList.length; i++) han += yakuList[i].han;
      if (han === 0) han = 1;
      score = Y.calcScore(han, this.bet, false);
    }
    this.lastWin = {
      winner: 'cpu',
      hand: hand,
      winTile: -1,
      yakuList: yakuList,
      han: score.han,
      points: score.points,
      yakuman: score.yakuman,
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
    this.doubleCards = [this.drawCard(), this.drawCard(), this.drawCard(), this.drawCard(), this.drawCard()];
    this.doubleStake = this.lastWin.points;
    this.state = ST.DOUBLE;
    this.emit('update');
    return true;
  };

  Game.prototype.drawCard = function () {
    // 比倍用牌：1-13点
    return 1 + ((Math.random() * 13) | 0);
  };

  Game.prototype.doubleBet = function (big) {
    if (this.state !== ST.DOUBLE) return false;
    var dealer = this.doubleCards[0];
    var player = this.doubleCards[1];
    var win = big ? (player > dealer) : (player < dealer);
    // 平局算输（简化）
    if (win) {
      this.doubleStake *= 2;
      this.credit += this.lastWin.points; // 退回本金再翻倍简化：直接加
      this.lastWin.points = this.doubleStake;
    } else {
      this.credit -= this.lastWin.points;
      if (this.credit < 0) this.credit = 0;
      this.lastWin.points = 0;
    }
    this.doubleResult = { dealer: dealer, player: player, win: win };
    this.state = ST.WIN;
    this.emit('update');
    return true;
  };

  /* 下一局 */
  Game.prototype.nextRound = function () {
    this.bet = 0;
    this.lastWin = null;
    this.state = this.credit > 0 ? ST.IDLE : ST.GAMEOVER;
    this.message = this.state === ST.IDLE ? '請押注' : '請投幣';
    this.emit('update');
  };

  g.SDMG2Game = Game;
  g.SDMG2_ST = ST;
})(typeof window !== 'undefined' ? window : globalThis);
