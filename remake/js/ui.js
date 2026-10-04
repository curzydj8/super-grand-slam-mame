/* 超級大滿貫II 重制版 —— Canvas 渲染 + 触控
 * 依赖: SDMG2Game, MahjongTiles, Taiwan16, Sfx
 */
(function (g) {
  'use strict';

  var LW = 1280, LH = 720;
  var canvas, ctx, scale = 1, game;
  var buttons = []; // {x,y,w,h,label,action,enabled,kind}

  function fit() {
    var ww = window.innerWidth, wh = window.innerHeight;
    scale = Math.min(ww / LW, wh / LH);
    canvas.width = LW * scale;
    canvas.height = LH * scale;
    canvas.style.width = LW * scale + 'px';
    canvas.style.height = LH * scale + 'px';
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function bg() {
    var grd = ctx.createRadialGradient(LW / 2, LH / 2, 100, LW / 2, LH / 2, 700);
    grd.addColorStop(0, '#0e5c3f');
    grd.addColorStop(1, '#073a28');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, LW, LH);
    // 装饰边框
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, LW - 16, LH - 16);
    ctx.strokeStyle = 'rgba(201,162,39,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, LW - 36, LH - 36);
  }

  function text(s, x, y, size, color, align, bold) {
    ctx.fillStyle = color || '#fff';
    ctx.font = (bold ? 'bold ' : '') + size + 'px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }

  function drawButton(b) {
    ctx.save();
    if (!b.enabled) ctx.globalAlpha = 0.35;
    var grd = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    if (b.kind === 'danger') { grd.addColorStop(0, '#e74c3c'); grd.addColorStop(1, '#922b21'); }
    else if (b.kind === 'gold') { grd.addColorStop(0, '#f5c542'); grd.addColorStop(1, '#b8860b'); }
    else if (b.kind === 'blue') { grd.addColorStop(0, '#3498db'); grd.addColorStop(1, '#1a5276'); }
    else { grd.addColorStop(0, '#3d6b4f'); grd.addColorStop(1, '#1e3d2a'); }
    ctx.fillStyle = grd;
    ctx.beginPath();
    var r = 10;
    ctx.moveTo(b.x + r, b.y);
    ctx.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h, r);
    ctx.arcTo(b.x + b.w, b.y + b.h, b.x, b.y + b.h, r);
    ctx.arcTo(b.x, b.y + b.h, b.x, b.y, r);
    ctx.arcTo(b.x, b.y, b.x + b.w, b.y, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f5d76e';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(b.label, b.x + b.w / 2, b.y + b.h / 2, b.fontSize || 26, b.kind === 'gold' ? '#5d3a00' : '#fff', 'center', true);
    ctx.restore();
  }

  function addButton(x, y, w, h, label, action, opts) {
    opts = opts || {};
    buttons.push({ x: x, y: y, w: w, h: h, label: label, action: action, enabled: opts.enabled !== false, kind: opts.kind || '', fontSize: opts.fontSize });
  }

  // ---------- 各画面 ----------
  function renderTitle() {
    bg();
    text('超級大滿貫II', LW / 2, 200, 96, '#f5d76e', 'center', true);
    text('CHAOJI DA MANGUAN II · 网页重制版', LW / 2, 280, 28, '#a8d5ba');
    text('台式16張麻將 × 押注 × 比倍', LW / 2, 330, 26, '#f5d76e');
    text('餘額：' + game.credits + ' 分', LW / 2, 400, 30, '#fff');
    text('點擊投幣增加餘額，按開始進入押注', LW / 2, 450, 22, '#a8d5ba');
    addButton(LW / 2 - 260, 500, 240, 80, '投幣 +100', function () { game.insertCoin(); }, { kind: 'gold' });
    addButton(LW / 2 + 20, 500, 240, 80, '開始', function () { game.startFromTitle(); }, { kind: 'blue' });
  }

  function renderBetting() {
    bg();
    text('押注', LW / 2, 150, 64, '#f5d76e', 'center', true);
    text('餘額 ' + game.credits + ' 分', LW / 2, 240, 32, '#fff');
    text('押注金額', LW / 2, 320, 26, '#a8d5ba');
    text(game.bet() + ' 分', LW / 2, 390, 72, '#f5c542', 'center', true);
    text('和牌按台數 ×2 倍率賠付，最高 256 倍', LW / 2, 470, 22, '#a8d5ba');
    addButton(LW / 2 - 330, 540, 200, 80, '押注', function () { game.cycleBet(); }, { kind: 'gold' });
    addButton(LW / 2 - 110, 540, 200, 80, '開始', function () { game.startRound(); }, { kind: 'blue' });
    addButton(LW / 2 + 130, 540, 200, 80, '投幣+100', function () { game.insertCoin(); });
  }

  function tilePos(i, n, tw, gap, cx, y) {
    var total = n * tw + (n - 1) * gap;
    return cx - total / 2 + i * (tw + gap);
  }

  function renderPlaying() {
    bg();
    var T16 = g.Taiwan16, MT = g.MahjongTiles;
    var eg = game.eg;
    if (!eg) return;

    // 顶部信息栏
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(24, 24, LW - 48, 56);
    text('餘額 ' + game.credits, 120, 52, 24, '#f5d76e', 'center', true);
    text('押注 ' + game.bet(), 320, 52, 24, '#fff');
    text('餘 ' + eg.wall.length + ' 張', 500, 52, 24, '#a8d5ba');
    text(['東', '南', '西', '北'][eg.dealer] + '家起' + (eg.renchan ? ' 連' + eg.renchan : ''), 700, 52, 24, '#a8d5ba');
    if (game.message && Date.now() < game.messageT) {
      text(game.message, LW / 2, 110, 26, '#f5c542', 'center', true);
    }

    // 三家 CPU：牌背 + 副露 + 弃牌（简化显示）
    var seats = [1, 2, 3];
    var names = ['', '下家', '對家', '上家'];
    seats.forEach(function (s, idx) {
      var bx = 180 + idx * 380;
      var by = 100;
      text(names[s] + '（' + eg.hands[s].length + '張）', bx + 80, by + 14, 20, '#a8d5ba');
      // 牌背
      for (var i = 0; i < Math.min(eg.hands[s].length, 8); i++) {
        MT.draw(ctx, 0, bx + i * 20, by + 28, 18, 24, { faceDown: true });
      }
      // 副露
      var melds = eg.melds[s];
      for (var m = 0; m < melds.length; m++) {
        var tiles = melds[m].tiles;
        for (var k = 0; k < tiles.length; k++) {
          MT.draw(ctx, tiles[k], bx + m * 78 + k * 19, by + 58, 18, 24, {});
        }
      }
    });

    // 中央弃牌区
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(240, 200, 800, 200);
    text('— 牌河 —', LW / 2, 222, 20, '#a8d5ba');
    var allDisc = [];
    for (var s = 0; s < 4; s++) {
      for (var d = 0; d < eg.discards[s].length; d++) allDisc.push({ t: eg.discards[s][d], seat: s });
    }
    var dw = 34, dh = 44, perRow = 18;
    for (var i = 0; i < allDisc.length; i++) {
      var dx = 260 + (i % perRow) * (dw + 4);
      var dy = 240 + Math.floor(i / perRow) * (dh + 4);
      var hl = game.lastDiscard && allDisc[i].t === game.lastDiscard.tile &&
        allDisc[i].seat === game.lastDiscard.seat && i === allDisc.length - 1;
      MT.draw(ctx, allDisc[i].t, dx, dy, dw, dh, hl ? { highlight: true } : {});
    }

    // 我的副露（左下）
    var myMelds = eg.melds[0];
    text('副露', 90, 440, 20, '#a8d5ba');
    for (var mi = 0; mi < myMelds.length; mi++) {
      var mtiles = myMelds[mi].tiles;
      for (var mk = 0; mk < mtiles.length; mk++) {
        MT.draw(ctx, mtiles[mk], 40 + mi * 150 + mk * 36, 460, 34, 44, {});
      }
    }
    // 花牌
    var fl = eg.flowers[0];
    if (fl.length) {
      text('花 ' + fl.length, 90, 540, 20, '#f5c542');
      for (var fi = 0; fi < fl.length; fi++) {
        MT.draw(ctx, fl[fi], 40 + fi * 36, 556, 34, 44, {});
      }
    }

    // 我的手牌（底部中央）
    var hand = eg.hands[0].slice().sort(function (a, b) { return a - b; });
    var tw = 56, th = 72, gap = 6;
    var y0 = 600;
    for (var hi = 0; hi < hand.length; hi++) {
      var hx = tilePos(hi, hand.length + (game.drawn !== null && game.drawn >= 0 ? 1 : 0), tw, gap, LW / 2, y0);
      var canPlay = (game.drawn !== null && game.drawn >= 0) || game.drawn === -1;
      MT.draw(ctx, hand[hi], hx, y0, tw, th, {});
      if (canPlay) {
        (function (tile) {
          addButton(hx, y0, tw, th, '', function () {
            if (game.drawn === -1) game.playDiscardAfterMeld(tile);
            else game.playDiscard(tile);
          }, { kind: 'invisible' });
        })(hand[hi]);
      }
    }
    // 摸到的牌单独显示
    if (game.drawn !== null && game.drawn >= 0) {
      var dx2 = tilePos(hand.length, hand.length + 1, tw, gap, LW / 2, y0) + 14;
      MT.draw(ctx, game.drawn, dx2, y0, tw, th, { highlight: true });
      (function (tile) {
        addButton(dx2, y0, tw, th, '', function () { game.playDiscard(tile); }, { kind: 'invisible' });
      })(game.drawn);
    }

    // 操作按钮（右侧）
    var bx0 = 1050, by0 = 430, bw = 200, bh = 62;
    var bidx = 0;
    function abtn(label, fn, kind, enabled) {
      addButton(bx0, by0 + bidx * (bh + 10), bw, bh, label, fn, { kind: kind, enabled: enabled });
      bidx++;
    }
    if (game.pendingCalls) {
      var pc = game.pendingCalls;
      text('對方打出', bx0 + bw / 2, by0 - 40, 22, '#f5d76e', 'center', true);
      MT.draw(ctx, pc.tile, bx0 + bw / 2 - 26, by0 - 30, 52, 68, { highlight: true });
      by0 += 70;
      bidx = 0;
      if (pc.options.indexOf('win') >= 0) abtn('胡！', function () { game.playerCall('win'); }, 'danger');
      if (pc.options.indexOf('kong') >= 0) abtn('槓', function () { game.playerCall('kong'); }, 'gold');
      if (pc.options.indexOf('pong') >= 0) abtn('碰', function () { game.playerCall('pong'); }, 'gold');
      if (pc.options.indexOf('chow') >= 0) abtn('吃', function () { game.playerCall('chow'); }, 'gold');
      abtn('過', function () { game.playerCall('pass'); });
    } else if (game.drawn !== null && game.drawn >= 0) {
      var canWin = T16.canWin(eg.hands[0], game.drawn);
      var canKong = T16.findConcealedKong(eg.hands[0].concat([game.drawn])) !== null;
      abtn('胡', function () { game.playerSelfWin(); }, 'danger', canWin);
      abtn('槓', function () { game.playerSelfKong(); }, 'gold', canKong);
      text('點選手牌切出', bx0 + bw / 2, by0 + bidx * (bh + 10) + 20, 20, '#a8d5ba');
    } else {
      text('等待…', bx0 + bw / 2, by0 + 30, 24, '#a8d5ba');
    }
  }

  function renderWin() {
    renderPlaying();
    // 结算弹窗
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, LW, LH);
    ctx.fillStyle = '#0d3b2a';
    ctx.strokeStyle = '#f5d76e';
    ctx.lineWidth = 4;
    var pw = 620, ph = 480, px = LW / 2 - pw / 2, py = LH / 2 - ph / 2;
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.fill(); ctx.stroke();
    var wi = game.winInfo;
    if (wi.exhaustive) {
      text('流局', LW / 2, py + 80, 56, '#a8d5ba', 'center', true);
      text('無人和牌', LW / 2, py + 160, 26, '#fff');
    } else if (wi.loser) {
      text('對方和牌', LW / 2, py + 80, 48, '#e74c3c', 'center', true);
      text(wi.tai + ' 台', LW / 2, py + 150, 30, '#fff');
    } else {
      text('和牌！', LW / 2, py + 70, 64, '#f5d76e', 'center', true);
      text(wi.tai + ' 台', LW / 2, py + 140, 40, '#fff', 'center', true);
      var y = py + 190;
      for (var i = 0; i < Math.min(wi.details.length, 8); i++) {
        text(wi.details[i].name + ' +' + wi.details[i].value, LW / 2, y, 22, '#a8d5ba');
        y += 30;
      }
      text('+' + wi.amount + ' 分', LW / 2, py + ph - 60, 44, '#f5c542', 'center', true);
    }
  }

  function renderDouble() {
    bg();
    var ds = game.doubleState;
    text('比 倍', LW / 2, 150, 72, '#f5d76e', 'center', true);
    text('賭注 ' + ds.stake + ' 分', LW / 2, 230, 32, '#fff');
    if (ds.card) {
      var big = ds.card >= 8;
      text('開出：' + ds.card + '（' + (ds.card === 7 ? '和' : big ? '大' : '小') + '）', LW / 2, 320, 40, big ? '#e74c3c' : '#3498db', 'center', true);
    } else {
      text('猜大還是小？開出 7 為和局退回', LW / 2, 320, 26, '#a8d5ba');
    }
    addButton(LW / 2 - 330, 450, 200, 90, '大 (8-13)', function () { game.doubleChoice('big'); }, { kind: 'danger', fontSize: 30 });
    addButton(LW / 2 - 100, 450, 200, 90, '小 (1-6)', function () { game.doubleChoice('small'); }, { kind: 'blue', fontSize: 30 });
    addButton(LW / 2 + 130, 450, 200, 90, '領取', function () { game.doubleChoice('take'); }, { kind: 'gold', fontSize: 30 });
  }

  function renderGameover() {
    bg();
    text('餘額不足', LW / 2, 280, 64, '#e74c3c', 'center', true);
    addButton(LW / 2 - 120, 400, 240, 80, '重新開始', function () { game.retry(); }, { kind: 'gold' });
  }

  function render() {
    buttons = [];
    ctx.clearRect(0, 0, LW, LH);
    // invisible kind 不绘制
    var visible = [];
    var origAdd = addButton;
    // 先收集
    if (game.phase === 'title') renderTitle();
    else if (game.phase === 'betting') renderBetting();
    else if (game.phase === 'playing') renderPlaying();
    else if (game.phase === 'win') renderWin();
    else if (game.phase === 'doubleup') renderDouble();
    else renderGameover();
    // 绘制可见按钮
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].kind !== 'invisible') drawButton(buttons[i]);
    }
  }

  function onTap(ev) {
    g.Sfx.unlock();
    var rect = canvas.getBoundingClientRect();
    var cx = (ev.clientX - rect.left) / rect.width * LW;
    var cy = (ev.clientY - rect.top) / rect.height * LH;
    for (var i = buttons.length - 1; i >= 0; i--) {
      var b = buttons[i];
      if (!b.enabled) continue;
      if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
        b.action();
        break;
      }
    }
  }

  function init(canvasId, gameInstance) {
    canvas = document.getElementById(canvasId);
    game = gameInstance;
    ctx = canvas.getContext('2d');
    game.onChange = render;
    fit();
    window.addEventListener('resize', fit);
    canvas.addEventListener('pointerdown', onTap);
    // 键盘映射（致敬原版 29 键）
    document.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      if (k === '5') game.insertCoin();
      else if (k === '1') { if (game.phase === 'title') game.startFromTitle(); else if (game.phase === 'betting') game.startRound(); }
      else if (k === 'u') game.cycleBet();
    });
    render();
  }

  g.SDMG2UI = { init: init, render: render };
})(typeof window !== 'undefined' ? window : globalThis);
