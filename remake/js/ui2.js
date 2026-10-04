/* 超級大滿貫II · UI（忠实原版 512×240 布局）
 * 布局考据（实机截图）：
 * - 灰底格纹、顶部金色大字公告
 * - 中部：役滿/合計/點 + 深红底金边 CREDIT/BET框
 * - 底部：玩家14张牌（白底红边）
 * - 左侧：CPU牌（1明+4暗）
 */
(function (g) {
  'use strict';
  var Tiles = g.MahjongTiles;
  var ST = g.SDMG2_ST;

  var W = 512, H = 240;

  var UI = {
    canvas: null, ctx: null, game: null,
    scale: 1, offsetX: 0, offsetY: 0,
    selected: -1,
    announce: '', announceSub: '',
    tileRects: []
  };

  function init(canvasId, game) {
    UI.game = game;
    UI.canvas = document.getElementById(canvasId);
    UI.ctx = UI.canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    game.on('update', render);
    game.on('win', onWin);

    UI.canvas.addEventListener('click', onClick);
    UI.canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var t = e.touches[0];
      onClick({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: false });

    // 键盘
    document.addEventListener('keydown', onKey);
    render();
  }

  function resize() {
    var ww = window.innerWidth, wh = window.innerHeight;
    var s = Math.min(ww / W, wh / H);
    UI.scale = s;
    UI.canvas.width = W * s;
    UI.canvas.height = H * s;
    UI.canvas.style.width = W * s + 'px';
    UI.canvas.style.height = H * s + 'px';
    UI.offsetX = (ww - W * s) / 2;
    UI.offsetY = (wh - H * s) / 2;
    UI.canvas.style.position = 'absolute';
    UI.canvas.style.left = UI.offsetX + 'px';
    UI.canvas.style.top = UI.offsetY + 'px';
  }

  function onWin(info) {
    if (info.winner === 'player') {
      if (info.yakuman) {
        UI.announce = info.yakuList[0].name;
        UI.announceSub = '役滿';
      } else {
        UI.announce = '人胡';
        UI.announceSub = '';
      }
    } else if (info.winner === 'cpu') {
      UI.announce = '電腦胡';
      UI.announceSub = '';
    } else {
      UI.announce = '流局';
      UI.announceSub = '';
    }
    setTimeout(function () { UI.announce = ''; UI.announceSub = ''; render(); }, 4000);
  }

  /* 背景：灰底细格纹 */
  function drawBG(ctx) {
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#868686';
    for (var y = 0; y < H; y += 8)
      for (var x = 0; x < W; x += 8)
        if (((x + y) / 8) % 2 === 0) ctx.fillRect(x, y, 4, 4);
  }

  /* 金色大字 */
  function goldText(ctx, str, x, y, size) {
    ctx.font = 'bold ' + size + 'px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var grd = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    grd.addColorStop(0, '#ff6b35');
    grd.addColorStop(0.4, '#ffd700');
    grd.addColorStop(0.6, '#fff8dc');
    grd.addColorStop(1, '#ff8c00');
    ctx.fillStyle = grd;
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 2;
    ctx.strokeText(str, x, y);
    ctx.fillText(str, x, y);
  }

  /* CREDIT/BET 框 */
  function drawCreditBox(ctx, game) {
    var x = 165, y = 140, w = 170, h = 52;
    // 金边
    ctx.fillStyle = '#d4af37';
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 8);
    ctx.fill();
    // 深红底
    ctx.fillStyle = '#4a0e0e';
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    // 分隔线
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#7cfc00';
    ctx.fillText('CREDIT', x + 10, y + 13);
    ctx.fillText('BET', x + 10, y + 39);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff69b4';
    ctx.fillText(String(game.credit), x + w - 10, y + 13);
    ctx.fillText(String(game.bet), x + w - 10, y + 39);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 玩家手牌（底部14张） */
  function drawPlayerHand(ctx, game) {
    var hand = game.playerHand;
    var tw = 32, th = 44;
    var totalW = hand.length * (tw + 2);
    var startX = (W - totalW) / 2;
    var y = H - th - 6;
    UI.tileRects = [];

    for (var i = 0; i < hand.length; i++) {
      var x = startX + i * (tw + 2);
      var isDraw = (i === hand.length - 1 && game.lastDraw >= 0 && game.state === ST.DRAW);
      var dy = 0;
      if (i === UI.selected) dy = -8;
      if (isDraw) x += 6; // 摸牌空开
      var opts = {};
      if (i === UI.selected) opts.highlight = true;
      // 原版风格：白牌红底边
      drawTileOrig(ctx, hand[i], x, y + dy, tw, th, opts);
      UI.tileRects.push({ x: x, y: y + dy, w: tw, h: th, idx: i });
    }

    // 副露区（右侧）
    var melds = game.playerMelds;
    if (melds.length > 0) {
      var mx = W - 10;
      for (var m = melds.length - 1; m >= 0; m--) {
        var tiles = melds[m].tiles;
        for (var k = tiles.length - 1; k >= 0; k--) {
          mx -= (tw * 0.7 + 1);
          drawTileOrig(ctx, tiles[k], mx, y, tw * 0.7, th * 0.7, {});
        }
        mx -= 4;
      }
    }
  }

  /* 原版风格牌：白底、红底边 */
  function drawTileOrig(ctx, t, x, y, w, h, opts) {
    // 厚度（红色底边）
    ctx.fillStyle = '#c0392b';
    roundRect(ctx, x + 1, y + 3, w, h, 3);
    ctx.fill();
    // 白底
    var grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(1, '#e8e8e8');
    ctx.fillStyle = grd;
    roundRect(ctx, x, y, w, h, 3);
    ctx.fill();
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 牌面内容（用Tiles绘制，缩放适配）
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, 3);
    ctx.clip();
    var s = Math.min(w / Tiles.W, h / Tiles.H);
    var dw = Tiles.W * s, dh = Tiles.H * s;
    var dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
    ctx.translate(dx, dy);
    ctx.scale(s, s);
    // 直接调用内部绘制（简化：用draw再clip）
    ctx.restore();

    // 简化：直接用Tiles.draw绘制到临时位置再整体缩放
    // 为性能，这里直接绘制
    drawTileFace(ctx, t, x, y, w, h);

    if (opts.highlight) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      roundRect(ctx, x - 1, y - 1, w + 2, h + 2, 4);
      ctx.stroke();
    }
  }

  /* 牌面内容绘制 */
  function drawTileFace(ctx, t, x, y, w, h) {
    var cx = x + w / 2, cy = y + h / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var fs = Math.min(w * 0.5, h * 0.32);

    if (t < 9) {
      // 萬
      var nums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
      ctx.fillStyle = '#222';
      ctx.font = 'bold ' + fs + 'px sans-serif';
      ctx.fillText(nums[t + 1], cx, cy - h * 0.18);
      ctx.font = 'bold ' + fs * 1.1 + 'px sans-serif';
      ctx.fillText('萬', cx, cy + h * 0.18);
    } else if (t < 18) {
      // 筒：简化圆点
      drawPips(ctx, cx, cy, w, h, t - 9 + 1, 'pin');
    } else if (t < 27) {
      drawPips(ctx, cx, cy, w, h, t - 18 + 1, 'sou');
    } else {
      var honors = { 27: '東', 28: '南', 29: '西', 30: '北', 31: '', 32: '發', 33: '中' };
      var colors = { 27: '#222', 28: '#222', 29: '#222', 30: '#222', 32: '#0a0', 33: '#c00' };
      if (t === 31) {
        ctx.strokeStyle = '#2471a3';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - w * 0.2, cy - h * 0.25, w * 0.4, h * 0.5);
      } else {
        ctx.fillStyle = colors[t];
        ctx.font = 'bold ' + fs * 1.3 + 'px sans-serif';
        ctx.fillText(honors[t], cx, cy);
      }
    }
  }

  function drawPips(ctx, cx, cy, w, h, rank, kind) {
    var colors = kind === 'pin' ? ['#2471a3', '#c0392b', '#1e8449'] : ['#1e8449'];
    var R = Math.min(w, h) * 0.11;
    var positions = getPipPositions(rank);
    for (var i = 0; i < positions.length; i++) {
      var px = cx + positions[i][0] * w * 0.3;
      var py = cy + positions[i][1] * h * 0.3;
      var col = colors[i % colors.length];
      if (kind === 'pin') {
        // 同心圆
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(px, py, R * 0.6, 0, 7); ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(px, py, R * 0.35, 0, 7); ctx.fill();
      } else {
        // 竹节
        ctx.fillStyle = col;
        ctx.fillRect(px - 2, py - R, 4, R * 2);
      }
    }
  }

  function getPipPositions(rank) {
    switch (rank) {
      case 1: return [[0, 0]];
      case 2: return [[0, -0.5], [0, 0.5]];
      case 3: return [[0, -0.7], [0, 0], [0, 0.7]];
      case 4: return [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];
      case 5: return [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]];
      case 6: return [[-0.5, -0.6], [0.5, -0.6], [-0.5, 0], [0.5, 0], [-0.5, 0.6], [0.5, 0.6]];
      case 7: return [[-0.5, -0.6], [0.5, -0.6], [0, -0.2], [-0.5, 0.3], [0.5, 0.3], [-0.5, 0.7], [0.5, 0.7]];
      case 8: return [[-0.5, -0.7], [0.5, -0.7], [-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25], [-0.5, 0.7], [0.5, 0.7]];
      case 9: return [[-0.5, -0.7], [0, -0.7], [0.5, -0.7], [-0.5, 0], [0, 0], [0.5, 0], [-0.5, 0.7], [0, 0.7], [0.5, 0.7]];
    }
    return [];
  }

  /* CPU牌（左侧：1明+4暗） */
  function drawCpuTiles(ctx, game) {
    var tw = 28, th = 38;
    var x = 8, y = 120;
    // 最后一张舍牌明示（原版风格）
    if (game.cpuDiscards.length > 0) {
      var last = game.cpuDiscards[game.cpuDiscards.length - 1];
      drawTileOrig(ctx, last, x, y, tw, th, {});
      x += tw + 3;
    }
    // 4张牌背
    for (var i = 0; i < 4; i++) {
      drawTileBack(ctx, x + i * (tw * 0.6), y, tw * 0.6, th);
    }
    // CPU副露
    var my = 60;
    for (var m = 0; m < game.cpuMelds.length; m++) {
      var tiles = game.cpuMelds[m].tiles;
      for (var k = 0; k < Math.min(3, tiles.length); k++) {
        drawTileOrig(ctx, tiles[k], x + k * (tw * 0.5), my, tw * 0.5, th * 0.6, {});
      }
      my += th * 0.6 + 2;
    }
  }

  function drawTileBack(ctx, x, y, w, h) {
    ctx.fillStyle = '#c0392b';
    roundRect(ctx, x + 1, y + 3, w, h, 3);
    ctx.fill();
    var grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#e74c3c');
    grd.addColorStop(1, '#a93226');
    ctx.fillStyle = grd;
    roundRect(ctx, x, y, w, h, 3);
    ctx.fill();
  }

  /* 舍牌区 */
  function drawDiscards(ctx, game) {
    // 玩家舍牌（中部偏右）
    var tw = 20, th = 28;
    var x = 350, y = 130;
    var discards = game.playerDiscards.slice(-12);
    for (var i = 0; i < discards.length; i++) {
      var dx = x + (i % 6) * (tw + 1);
      var dy = y + ((i / 6) | 0) * (th + 1);
      drawTileOrig(ctx, discards[i], dx, dy, tw, th, {});
    }
  }

  /* 操作按钮 */
  function drawButtons(ctx, game) {
    var buttons = [];
    var bx = 360, by = 60, bw = 64, bh = 26;

    function btn(label, enabled, action) {
      var b = { x: bx, y: by, w: bw, h: bh, label: label, enabled: enabled, action: action };
      buttons.push(b);
      ctx.fillStyle = enabled ? '#d4af37' : '#555';
      roundRect(ctx, bx, by, bw, bh, 4);
      ctx.fill();
      ctx.fillStyle = enabled ? '#000' : '#999';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx + bw / 2, by + bh / 2);
      by += bh + 4;
      return b;
    }

    UI.buttons = buttons;

    if (game.state === ST.IDLE || game.state === ST.GAMEOVER) {
      btn('投幣', true, 'coin');
    }
    if (game.state === ST.IDLE || game.state === ST.BET) {
      btn('押注', game.credit > 0, 'bet');
      btn('開始', game.bet > 0, 'start');
    }
    if (game.state === ST.DRAW) {
      if (game.selfWin) btn('胡', true, 'tsumo');
      if (game.selfKan >= 0) btn('槓', true, 'selfkan');
    }
    if (game.state === ST.CALL && game.callOptions) {
      var o = game.callOptions;
      if (o.hu) btn('胡', true, 'ron');
      if (o.kan) btn('槓', true, 'kan');
      if (o.pon) btn('碰', true, 'pon');
      if (o.chi && o.chi.length > 0) btn('吃', true, 'chi');
      btn('過', true, 'pass');
    }
    if (game.state === ST.WIN && game.lastWin && game.lastWin.winner === 'player') {
      btn('比倍', true, 'double');
      btn('下一局', true, 'next');
    } else if (game.state === ST.WIN) {
      btn('下一局', true, 'next');
    }
    if (game.state === ST.DOUBLE) {
      btn('大', true, 'big');
      btn('小', true, 'small');
    }
  }

  /* 结算显示 */
  function drawWinInfo(ctx, game) {
    if (game.state !== ST.WIN || !game.lastWin || !game.lastWin.points) return;
    var info = game.lastWin;
    var y = 100;
    if (info.yakuman) {
      goldText(ctx, '役滿', 250, y, 28);
    }
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#87ceeb';
    ctx.fillText('合計 ' + info.han, 300, y + 5);
    goldText(ctx, info.points + '點', 400, y + 5, 24);
  }

  /* 比倍界面 */
  function drawDouble(ctx, game) {
    if (game.state !== ST.DOUBLE) return;
    goldText(ctx, '比倍', 256, 40, 36);
    // 庄家牌
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('莊家: ' + cardName(game.doubleCards[0]), 180, 100);
    ctx.fillText('?', 330, 100);
    if (game.doubleResult) {
      ctx.fillText('你: ' + cardName(game.doubleResult.player), 330, 130);
      goldText(ctx, game.doubleResult.win ? '贏!' : '輸', 256, 160, 28);
    }
  }

  function cardName(v) {
    return v === 1 ? 'A' : v === 11 ? 'J' : v === 12 ? 'Q' : v === 13 ? 'K' : String(v);
  }

  function render() {
    var ctx = UI.ctx, game = UI.game;
    if (!ctx) return;
    ctx.save();
    ctx.scale(UI.scale, UI.scale);

    drawBG(ctx);

    // 顶部公告
    if (UI.announce) {
      goldText(ctx, UI.announce, 256, 45, 52);
      if (UI.announceSub) goldText(ctx, UI.announceSub, 256, 90, 28);
    } else {
      // 标题
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d4af37';
      ctx.fillText('超級大滿貫II', 256, 20);
    }

    drawCreditBox(ctx, game);
    drawWinInfo(ctx, game);
    drawCpuTiles(ctx, game);
    drawDiscards(ctx, game);
    drawPlayerHand(ctx, game);
    drawButtons(ctx, game);
    drawDouble(ctx, game);

    // 提示信息
    if (game.message) {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(game.message, 256, H - 58);
    }

    ctx.restore();
  }

  function onClick(e) {
    var rect = UI.canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) / UI.scale;
    var y = (e.clientY - rect.top) / UI.scale;
    var game = UI.game;

    // 按钮
    if (UI.buttons) {
      for (var i = 0; i < UI.buttons.length; i++) {
        var b = UI.buttons[i];
        if (b.enabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          doAction(b.action);
          return;
        }
      }
    }

    // 选牌
    if (game.state === ST.DRAW || game.state === ST.DISCARD) {
      for (var i = 0; i < UI.tileRects.length; i++) {
        var r = UI.tileRects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          if (UI.selected === r.idx) {
            game.discard(r.idx);
            UI.selected = -1;
          } else {
            UI.selected = r.idx;
            render();
          }
          return;
        }
      }
    }
  }

  function doAction(action) {
    var game = UI.game;
    switch (action) {
      case 'coin': game.insertCoin(1); break;
      case 'bet': game.addBet(); break;
      case 'start': game.start(); break;
      case 'tsumo': game.playerWin(true); break;
      case 'ron': game.playerWin(false); break;
      case 'pon': game.playerPon(); break;
      case 'kan': game.playerKan(); break;
      case 'selfkan': game.playerSelfKan(); break;
      case 'chi':
        // 简化：选第一个吃选项
        if (game.callOptions && game.callOptions.chi.length > 0)
          game.playerChi(game.callOptions.chi[0]);
        break;
      case 'pass': game.playerPass(); break;
      case 'double': game.startDouble(); break;
      case 'big': game.doubleBet(true); break;
      case 'small': game.doubleBet(false); break;
      case 'next': game.nextRound(); break;
    }
    UI.selected = -1;
  }

  function onKey(e) {
    var game = UI.game;
    // 5=投幣 1=開始 U=押注
    if (e.key === '5') game.insertCoin(1);
    else if (e.key === '1') {
      if (game.state === ST.BET) game.start();
    }
    else if (e.key === 'u' || e.key === 'U') game.addBet();
    else if ((e.key === 'y' || e.key === 'Y') && game.selfWin) game.playerWin(true);
  }

  g.SDMG2UI = { init: init, render: render };
})(typeof window !== 'undefined' ? window : globalThis);
