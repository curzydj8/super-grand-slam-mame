/* 超級大滿貫II · 网页重制版 UI（原版街机视觉还原）
 * 512×240 逻辑分辨率，整体缩放适配屏幕
 * 分屏：ODDS 赔率表 / SELECT 選牌交換 / 对局 / 结算 / 比倍
 * 牌面统一调用 MahjongTiles（js/tiles.js），立绘为原创 AI 生成图 assets/girl.png
 */
(function (g) {
  'use strict';
  var ST = g.SDMG2_ST;
  var MT = g.MahjongTiles;

  var W = 512, H = 240;

  var UI = {
    canvas: null, ctx: null, game: null,
    scale: 1,
    selected: -1,
    announce: '', announceSub: '',
    tileRects: [], buttons: []
  };

  var girlImg = null, girlReady = false;

  function init(canvasId, game) {
    UI.game = game;
    UI.canvas = document.getElementById(canvasId);
    UI.ctx = UI.canvas.getContext('2d');
    loadGirl();
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
    document.addEventListener('keydown', onKey);
    render();
  }

  function loadGirl() {
    try {
      girlImg = new Image();
      girlImg.onload = function () { girlReady = true; render(); };
      girlImg.src = 'assets/girl.png';
    } catch (e) { girlImg = null; }
  }

  function resize() {
    var ww = window.innerWidth, wh = window.innerHeight - 30;
    var s = Math.min(ww / W, wh / H);
    UI.scale = s;
    UI.canvas.width = Math.round(W * s);
    UI.canvas.height = Math.round(H * s);
    UI.canvas.style.width = Math.round(W * s) + 'px';
    UI.canvas.style.height = Math.round(H * s) + 'px';
    UI.canvas.style.position = 'absolute';
    UI.canvas.style.left = Math.round((ww - W * s) / 2) + 'px';
    UI.canvas.style.top = Math.round((wh - H * s) / 2) + 'px';
  }

  function onWin(info) {
    if (info.winner === 'player') {
      if (info.yakuman) { UI.announce = '役滿'; UI.announceSub = info.yakuList[0].name; }
      else { UI.announce = info.tier || '人胡'; UI.announceSub = ''; }
    } else if (info.winner === 'cpu') { UI.announce = '電腦胡'; UI.announceSub = ''; }
    else { UI.announce = '流局'; UI.announceSub = ''; }
    render();
    setTimeout(function () { UI.announce = ''; UI.announceSub = ''; render(); }, 5000);
  }

  /* ================= 基础组件 ================= */

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 紫底 + 菱形细格纹（ODDS/结算） */
  function purpleBG(ctx) {
    ctx.fillStyle = '#5b4baf';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5345a5';
    for (var y = 3; y < H; y += 9) {
      for (var x = ((y / 9) % 2) ? 4 : 8; x < W; x += 9) {
        ctx.fillRect(x, y, 3, 3);
      }
    }
  }

  /* 灰底 + 细十字格纹（对局/選牌） */
  function grayBG(ctx) {
    ctx.fillStyle = '#8b8b8b';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#7e7e7e';
    for (var y = 4; y < H; y += 8) {
      for (var x = 4; x < W; x += 8) {
        ctx.fillRect(x, y, 3, 1);
        ctx.fillRect(x + 1, y - 1, 1, 3);
      }
    }
  }

  /* 金色棋盘格边框 */
  function goldFrame(ctx) {
    var s = 10;
    for (var x = 0; x < W; x += s) {
      var c = ((x / s) % 2) ? '#d4af37' : '#8a6d1a';
      ctx.fillStyle = c;
      ctx.fillRect(x, 0, s, s); ctx.fillRect(x, H - s, s, s);
    }
    for (var y = 0; y < H; y += s) {
      var c2 = ((y / s) % 2) ? '#d4af37' : '#8a6d1a';
      ctx.fillStyle = c2;
      ctx.fillRect(0, y, s, s); ctx.fillRect(W - s, y, s, s);
    }
  }

  /* 立体渐变大字 */
  function text3d(ctx, str, x, y, size, cTop, cMid, cBot, stroke) {
    ctx.font = 'bold ' + size + 'px "Noto Sans TC","PMingLiU","Microsoft JhengHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var grd = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55);
    grd.addColorStop(0, cTop);
    grd.addColorStop(0.5, cMid);
    grd.addColorStop(1, cBot);
    ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = grd;
    ctx.fillText(str, x, y);
  }

  /* 红缎带横幅 */
  function ribbon(ctx, label, lx, rx, y) {
    var h = 30;
    // 缎带主体
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(rx, y);
    ctx.lineTo(rx - 14, y + h / 2);
    ctx.lineTo(rx, y + h);
    ctx.lineTo(lx, y + h);
    ctx.lineTo(lx + 14, y + h / 2);
    ctx.closePath();
    ctx.fill();
    // 高光
    var grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, 'rgba(255,255,255,0.45)');
    grd.addColorStop(0.4, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(lx + 10, y + 2, rx - lx - 20, h / 2 - 2);
    // 描边
    ctx.strokeStyle = '#7b0000';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 标签字（绿底白字描边）
    text3d(ctx, label, (lx + rx) / 2, y + h / 2 + 1, 26, '#a5ff9e', '#2ecc40', '#1e8c2c', '#0a4d12');
  }

  /* 深红 CREDIT/BET 框（金角饰） */
  function creditBoxMaroon(ctx, x, y, w, h, credit, bet) {
    ctx.fillStyle = '#3d0a0a';
    rr(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 3);
    ctx.stroke();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    var c = 8;
    ctx.beginPath(); ctx.moveTo(x - 2, y + c); ctx.lineTo(x - 2, y - 2); ctx.lineTo(x + c, y - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - c, y - 2); ctx.lineTo(x + w + 2, y - 2); ctx.lineTo(x + w + 2, y + c); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 2, y + h - c); ctx.lineTo(x - 2, y + h + 2); ctx.lineTo(x + c, y + h + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - c, y + h + 2); ctx.lineTo(x + w + 2, y + h + 2); ctx.lineTo(x + w + 2, y + h - c); ctx.stroke();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 4, y + h / 2); ctx.lineTo(x + w - 4, y + h / 2); ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px "Courier New",monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7cfc00';
    ctx.fillText('CREDIT', x + 8, y + h * 0.27);
    ctx.fillText('B E T', x + 8, y + h * 0.73);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff6ec7';
    ctx.font = 'bold 15px "Courier New",monospace';
    ctx.fillText(String(credit), x + w - 10, y + h * 0.27);
    ctx.fillText(String(bet), x + w - 10, y + h * 0.73);
  }

  /* 蓝底 CREDIT/BET 框（结算用） */
  function creditBoxBlue(ctx, x, y, w, h, credit, bet) {
    ctx.fillStyle = '#1a3faa';
    rr(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = '#9fd8ff';
    ctx.lineWidth = 2;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 5);
    ctx.stroke();
    ctx.strokeStyle = '#9fd8ff';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 6, y + h / 2); ctx.lineTo(x + w - 6, y + h / 2); ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px "Courier New",monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff9ff3';
    ctx.fillText('CREDIT', x + 10, y + h * 0.27);
    ctx.fillText('B E T', x + 10, y + h * 0.73);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4dd0e1';
    ctx.font = 'bold 17px "Courier New",monospace';
    ctx.fillText(String(credit), x + w - 12, y + h * 0.27);
    ctx.fillText(String(bet), x + w - 12, y + h * 0.73);
  }

  /* 深蓝横幅（红字） */
  function blueBanner(ctx, x, y, w, h, str) {
    ctx.fillStyle = '#1a237e';
    rr(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 5);
    ctx.stroke();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    var c = 10;
    ctx.beginPath(); ctx.moveTo(x - 2, y + c); ctx.lineTo(x - 2, y - 2); ctx.lineTo(x + c, y - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - c, y - 2); ctx.lineTo(x + w + 2, y - 2); ctx.lineTo(x + w + 2, y + c); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 2, y + h - c); ctx.lineTo(x - 2, y + h + 2); ctx.lineTo(x + c, y + h + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - c, y + h + 2); ctx.lineTo(x + w + 2, y + h + 2); ctx.lineTo(x + w + 2, y + h - c); ctx.stroke();
    ctx.font = 'bold ' + Math.round(h * 0.52) + 'px "Noto Sans TC","PMingLiU",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#7b0000';
    ctx.strokeText(str, x + w / 2, y + h / 2 + 1);
    ctx.fillStyle = '#ff3b30';
    ctx.fillText(str, x + w / 2, y + h / 2 + 1);
  }

  /* 顶部红牌背一排（对手牌墙） */
  function wallReds(ctx, n) {
    var bw = 30, bh = 24;
    var totalW = n * (bw + 1);
    var x0 = Math.round((W - totalW) / 2);
    for (var i = 0; i < n; i++) {
      MT.draw(ctx, 0, x0 + i * (bw + 1), 2, bw, bh, { faceDown: true });
    }
  }

  /* 立绘（原创 AI 图，cover 居左裁剪） */
  function drawGirl(ctx, dx, dy, dw, dh) {
    if (!girlReady || !girlImg) {
      ctx.fillStyle = '#5d4037';
      rr(ctx, dx, dy, dw, dh, 6);
      ctx.fill();
      return;
    }
    var sw = girlImg.width * 0.72, sh = girlImg.height;
    var sRatio = sw / sh, dRatio = dw / dh;
    var sx = 0, sy = 0, cw = sw, ch = sh;
    if (sRatio > dRatio) { cw = sh * dRatio; sx = (sw - cw) / 2; }
    else { ch = sw / dRatio; sy = (sh - ch) * 0.12; }
    ctx.save();
    rr(ctx, dx, dy, dw, dh, 6);
    ctx.clip();
    ctx.drawImage(girlImg, sx, sy, cw, ch, dx, dy, dw, dh);
    ctx.restore();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    rr(ctx, dx + 1, dy + 1, dw - 2, dh - 2, 5);
    ctx.stroke();
  }

  /* 玩家手牌（底部，带 A-N 金色标签） */
  function drawHand(ctx, game, opts) {
    opts = opts || {};
    var hand = game.playerHand;
    var tw = 31, th = 38, gap = 2, labelH = 13;
    var totalW = hand.length * (tw + gap);
    var startX = Math.round((W - totalW) / 2) + 8;
    var y = H - th - labelH - 4;
    UI.tileRects = [];
    var KEYS = 'ABCDEFGHIJKLMN';
    var sel = opts.exchange ? game.exchangeSel : null;
    for (var i = 0; i < hand.length; i++) {
      var x = startX + i * (tw + gap);
      var dy = 0;
      var hl = false;
      if (opts.exchange) {
        if (sel && sel.indexOf(i) >= 0) { dy = -10; hl = true; }
      } else {
        if (i === UI.selected) { dy = -8; hl = true; }
        var isDraw = (i === hand.length - 1 && game.lastDraw >= 0 && game.state === ST.DRAW);
        if (isDraw) x += 5;
      }
      MT.draw(ctx, hand[i], x, y + dy, tw, th, { highlight: hl });
      ctx.fillStyle = '#ffe14d';
      ctx.font = 'bold 11px "Courier New",monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(KEYS[i] || '', x + tw / 2, y + th + 1 + dy);
      UI.tileRects.push({ x: x, y: y + dy, w: tw, h: th + labelH, idx: i });
    }
  }

  /* 对手副露/舍牌小牌 */
  function drawCpuArea(ctx, game) {
    var y = 100;
    var tw = 26, th = 36;
    var x = 300;
    // 最后一张舍牌明示
    if (game.cpuDiscards.length > 0) {
      MT.draw(ctx, game.cpuDiscards[game.cpuDiscards.length - 1], x, y, tw, th, {});
      x += tw + 4;
    }
    // 4 张牌背
    for (var i = 0; i < 4; i++) {
      MT.draw(ctx, 0, x + i * (tw * 0.72 + 2), y, tw * 0.72, th, { faceDown: true });
    }
  }

  /* 舍牌区 */
  function drawDiscards(ctx, game) {
    var tw = 20, th = 28;
    var x = 300, y = 148;
    var list = game.playerDiscards.slice(-12).concat(game.cpuDiscards.slice(-6));
    for (var i = 0; i < list.length; i++) {
      MT.draw(ctx, list[i], x + (i % 6) * (tw + 1), y + ((i / 6) | 0) * (th + 1), tw, th, {});
    }
  }

  /* ================= ODDS 赔率表 ================= */
  function drawOdds(ctx, game) {
    purpleBG(ctx);
    goldFrame(ctx);
    ribbon(ctx, 'ODDS', 96, 416, 14);

    var rows = [
      ['役滿', '50', '滿貫', '5'],
      ['三倍滿', '30', '三翻', '3'],
      ['二倍滿', '15', '二翻', '2'],
      ['一倍滿', '8', '一翻', '1']
    ];
    var y0 = 66;
    for (var i = 0; i < rows.length; i++) {
      var y = y0 + i * 27;
      ctx.textBaseline = 'middle';
      // 左列
      ctx.textAlign = 'right';
      ctx.font = 'bold 20px "Noto Sans TC","PMingLiU",sans-serif';
      ctx.fillStyle = '#29b6f6';
      ctx.fillText(rows[i][0], 178, y);
      ctx.textAlign = 'left';
      ctx.font = 'bold 25px "Courier New",monospace';
      ctx.fillStyle = '#4dd0e1';
      ctx.fillText(rows[i][1], 190, y);
      // 右列
      ctx.textAlign = 'right';
      ctx.font = 'bold 20px "Noto Sans TC","PMingLiU",sans-serif';
      ctx.fillStyle = '#29b6f6';
      ctx.fillText(rows[i][2], 378, y);
      ctx.textAlign = 'left';
      ctx.font = 'bold 25px "Courier New",monospace';
      ctx.fillStyle = '#4dd0e1';
      ctx.fillText(rows[i][3], 390, y);
    }

    // 中横幅：3分以上，中滿貫，可玩大滿貫
    var bx = 104, by = 172, bw = 304, bh = 24;
    ctx.fillStyle = '#4a3d99';
    rr(ctx, bx, by, bw, bh, 3);
    ctx.fill();
    ctx.strokeStyle = '#9fd8ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    ctx.font = 'bold 17px "Noto Sans TC","PMingLiU",sans-serif';
    ctx.textBaseline = 'middle';
    var tx = bx + 14;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd54f'; ctx.fillText('3', tx, by + bh / 2 + 1); tx += 18;
    ctx.fillStyle = '#7cfc00'; ctx.fillText('分以上，', tx, by + bh / 2 + 1); tx += 72;
    ctx.fillStyle = '#4dd0e1'; ctx.fillText('中滿貫，', tx, by + bh / 2 + 1); tx += 72;
    ctx.fillStyle = '#ffd54f'; ctx.fillText('可玩大滿貫', tx, by + bh / 2 + 1);

    // 底三框
    var fy = 200, fh = 26;
    function oddBox(x, w, label, labelColor, value) {
      ctx.fillStyle = '#4a3d99';
      rr(ctx, x, fy, w, fh, 3);
      ctx.fill();
      ctx.strokeStyle = '#9fd8ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1, fy + 1, w - 2, fh - 2);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px "Courier New",monospace';
      ctx.fillStyle = labelColor;
      ctx.fillText(label, x + w / 2, fy + 8);
      ctx.font = 'bold 17px "Courier New",monospace';
      ctx.fillStyle = '#4dd0e1';
      ctx.fillText(String(value), x + w / 2, fy + 20);
    }
    oddBox(18, 152, 'CREDIT', '#7cfc00', game.credit);
    oddBox(180, 152, '大滿貫BET', '#ffd54f', game.damanguanBet || 0);
    oddBox(342, 152, 'BET', '#7cfc00', game.bet);

    // PUSH START OR BET BUTTON
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Courier New",monospace';
    var py = 231;
    var parts = [['PUSH ', '#ff7ab8'], ['START', '#ffd54f'], [' OR ', '#ff7ab8'], ['BET', '#ffd54f'], [' BUTTON', '#ff7ab8']];
    var totalW = 0, widths = [];
    for (var p = 0; p < parts.length; p++) {
      var wpx = ctx.measureText(parts[p][0]).width;
      widths.push(wpx); totalW += wpx;
    }
    var sx = (W - totalW) / 2;
    ctx.textAlign = 'left';
    for (var q = 0; q < parts.length; q++) {
      if (parts[q][0] === 'START' || parts[q][0] === 'BET') {
        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx - 3, py - 9, widths[q] + 6, 18);
      }
      ctx.fillStyle = parts[q][1];
      ctx.fillText(parts[q][0], sx, py);
      sx += widths[q];
    }
  }

  /* ================= SELECT 選牌交換 ================= */
  function drawSelect(ctx, game) {
    grayBG(ctx);
    wallReds(ctx, 13);
    drawGirl(ctx, 8, 28, 118, 156);
    creditBoxMaroon(ctx, 140, 100, 132, 46, game.credit, game.bet);
    drawCpuArea(ctx, game);
    blueBanner(ctx, 132, 150, 368, 32, '請選擇您要交換的牌！！');
    // DONDEN 小框
    ctx.fillStyle = '#3d0a0a';
    rr(ctx, 8, 190, 112, 22, 3);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#7cfc00';
    ctx.font = 'bold 12px "Courier New",monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DONDEN ' + (game.donden || 4), 64, 202);
    drawHand(ctx, game, { exchange: true });
  }

  /* ================= 对局 ================= */
  function drawGameScreen(ctx, game) {
    grayBG(ctx);
    wallReds(ctx, Math.max(0, game.cpuHand.length));
    drawGirl(ctx, 8, 28, 100, 134);
    creditBoxMaroon(ctx, 122, 100, 132, 46, game.credit, game.bet);
    drawCpuArea(ctx, game);
    if (game.message) blueBanner(ctx, 122, 150, 378, 30, game.message);
    drawDiscards(ctx, game);
    if (game.playerHand.length > 0) drawHand(ctx, game, {});
    else {
      text3d(ctx, '超級大滿貫II', 300, 70, 36, '#ffb300', '#fffde7', '#ff6f00', '#a00000');
    }
  }

  /* ================= 结算 ================= */
  function drawWinScreen(ctx, game) {
    purpleBG(ctx);
    var info = game.lastWin;
    // 大字役名
    var title = UI.announce || (info && info.yakuman ? info.yakuList[0].name : '人胡');
    text3d(ctx, title, 256, 52, 62, '#d6fbff', '#4dd0e1', '#1a8fb5', '#0a3d66');
    if (UI.announceSub) text3d(ctx, UI.announceSub, 256, 100, 26, '#ffe14d', '#ffb300', '#ff6f00', '#7b0000');
    // 中央蓝框
    creditBoxBlue(ctx, 172, 122, 168, 56, game.credit, game.bet);
    // 对手副露（牌背）
    var my = 120;
    for (var m = 0; m < game.cpuMelds.length; m++) {
      var tiles = game.cpuMelds[m].tiles;
      for (var k = 0; k < Math.min(4, tiles.length); k++) {
        MT.draw(ctx, 0, 12 + k * 24, my, 22, 32, { faceDown: true, back: 'cyan' });
      }
      my += 38;
    }
    // 玩家胡牌（底部，胡牌张抬起分离）
    if (info && info.hand) {
      var hand = info.hand.slice().sort(function (a, b) { return a - b; });
      var tw = 30, th = 38;
      var n = hand.length;
      var totalW = n * (tw + 1) + 8;
      var sx = Math.round((W - totalW) / 2);
      var y = H - th - 6;
      var winT = info.winTile;
      var winIdx = hand.indexOf(winT);
      for (var i = 0; i < n; i++) {
        var x = sx + i * (tw + 1);
        var dy = 0;
        if (i === winIdx) { x += 8; dy = -10; }
        MT.draw(ctx, hand[i], x, y + dy, tw, th, {});
      }
    }
    // 得分
    if (info && info.points > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 20px "Courier New",monospace';
      ctx.fillStyle = '#ffe14d';
      ctx.fillText(info.points + ' 點', 256, 208);
      if (info.damanguan) {
        ctx.font = 'bold 16px "Noto Sans TC",sans-serif';
        ctx.fillStyle = '#7cfc00';
        ctx.fillText('3分以上中滿貫，可玩大滿貫！', 256, 228);
      }
    }
  }

  /* ================= 比倍 ================= */
  function drawDouble(ctx, game) {
    purpleBG(ctx);
    goldFrame(ctx);
    text3d(ctx, '比倍', 256, 48, 46, '#ffb300', '#fffde7', '#ff6f00', '#a00000');
    ctx.font = 'bold 20px "Noto Sans TC",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('莊家', 170, 104);
    ctx.fillText('你', 342, 104);
    drawMiniCard(ctx, game.doubleCards[0], 170, 140);
    if (game.doubleResult) drawMiniCard(ctx, game.doubleResult.player, 342, 140);
    else {
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText('?', 342, 142);
    }
    if (game.doubleResult) {
      text3d(ctx, game.doubleResult.win ? '贏！' : '輸', 256, 200, 34,
        '#a5ff9e', '#2ecc40', '#1e8c2c', '#0a4d12');
    }
    ctx.font = '15px "Noto Sans TC",sans-serif';
    ctx.fillStyle = '#ff9ff3';
    ctx.fillText('注額 ' + (game.doubleStake || 0), 256, 224);
  }

  function drawMiniCard(ctx, v, x, y) {
    var w = 36, h = 50;
    var grd = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#dfe5e8');
    ctx.fillStyle = grd;
    rr(ctx, x - w / 2, y - h / 2, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 2; ctx.stroke();
    var txt = v === 1 ? 'A' : v === 11 ? 'J' : v === 12 ? 'Q' : v === 13 ? 'K' : String(v);
    ctx.fillStyle = (v === 1 || v === 11) ? '#c62828' : '#1a1a1a';
    ctx.font = 'bold 24px "Courier New",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }

  /* ================= 待机 ================= */
  function drawIdle(ctx, game) {
    purpleBG(ctx);
    goldFrame(ctx);
    ribbon(ctx, '超級大滿貫II', 60, 452, 60);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px "Noto Sans TC",sans-serif';
    ctx.fillStyle = '#ff7ab8';
    ctx.fillText(game.state === ST.GAMEOVER ? '請投幣' : '投幣開始遊戲', 256, 160);
    creditBoxMaroon(ctx, 190, 180, 132, 40, game.credit, game.bet);
  }

  /* ================= 按钮 ================= */
  function drawButtons(ctx, game) {
    UI.buttons = [];
    var bx = 438, by = 196, bw = 68, bh = 26;
    function btn(label, enabled, action) {
      if (by + bh > H - 2) return;
      UI.buttons.push({ x: bx, y: by, w: bw, h: bh, label: label, enabled: enabled, action: action });
      ctx.fillStyle = enabled ? '#5d4037' : '#424242';
      rr(ctx, bx, by, bw, bh, 4);
      ctx.fill();
      ctx.strokeStyle = enabled ? '#ffd54f' : '#616161';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = enabled ? '#ffe14d' : '#9e9e9e';
      ctx.font = 'bold 14px "Noto Sans TC",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
      by += bh + 4;
    }
    if (game.state === ST.IDLE || game.state === ST.GAMEOVER) btn('投幣', true, 'coin');
    if (game.state === ST.ODDS) {
      btn('投幣', true, 'coin');
      btn('押注', game.credit > 0, 'bet');
      btn('開始', game.bet > 0, 'start');
    }
    if (game.state === ST.SELECT) btn('確定', true, 'confirm');
    if (game.state === ST.DRAW) {
      if (game.selfWin) btn('胡', true, 'tsumo');
      if (game.selfKan >= 0) btn('槓', true, 'selfkan');
    }
    if (game.state === ST.CALL && game.callOptions) {
      var o = game.callOptions;
      if (o.hu) btn('胡', true, 'ron');
      if (o.kan) btn('槓', true, 'kan');
      if (o.pon) btn('碰', true, 'pon');
      if (o.chi && o.chi.length) btn('吃', true, 'chi');
      btn('過', true, 'pass');
    }
    if (game.state === ST.WIN) {
      if (game.lastWin && game.lastWin.winner === 'player' && game.lastWin.points > 0) btn('比倍', true, 'double');
      btn('下一局', true, 'next');
    }
    if (game.state === ST.DOUBLE) {
      btn('大', true, 'big');
      btn('小', true, 'small');
    }
  }

  /* ================= 主渲染 ================= */
  function render() {
    var ctx = UI.ctx, game = UI.game;
    if (!ctx || !game) return;
    ctx.save();
    ctx.scale(UI.scale, UI.scale);

    var isWin = (game.state === ST.WIN && game.lastWin && game.lastWin.points);
    if (game.state === ST.ODDS) drawOdds(ctx, game);
    else if (game.state === ST.SELECT) drawSelect(ctx, game);
    else if (isWin) drawWinScreen(ctx, game);
    else if (game.state === ST.DOUBLE) drawDouble(ctx, game);
    else if (game.state === ST.IDLE || game.state === ST.GAMEOVER) drawIdle(ctx, game);
    else drawGameScreen(ctx, game);

    drawButtons(ctx, game);
    ctx.restore();
  }

  /* ================= 输入 ================= */
  function onClick(e) {
    var rect = UI.canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) / UI.scale;
    var y = (e.clientY - rect.top) / UI.scale;
    var game = UI.game;
    for (var i = 0; i < UI.buttons.length; i++) {
      var b = UI.buttons[i];
      if (b.enabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        doAction(b.action); return;
      }
    }
    // SELECT：点牌切换交换选择
    if (game.state === ST.SELECT) {
      for (var j = 0; j < UI.tileRects.length; j++) {
        var r = UI.tileRects[j];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          game.toggleExchange(r.idx);
          return;
        }
      }
      return;
    }
    if (game.state === ST.DRAW || game.state === ST.DISCARD) {
      for (var k = 0; k < UI.tileRects.length; k++) {
        var r2 = UI.tileRects[k];
        if (x >= r2.x && x <= r2.x + r2.w && y >= r2.y && y <= r2.y + r2.h) {
          if (UI.selected === r2.idx) { game.discard(r2.idx); UI.selected = -1; }
          else { UI.selected = r2.idx; render(); }
          return;
        }
      }
    }
  }

  function doAction(a) {
    var game = UI.game;
    switch (a) {
      case 'coin': game.insertCoin(1); break;
      case 'bet': game.addBet(); break;
      case 'start': game.start(); break;
      case 'confirm': game.confirmExchange(); break;
      case 'tsumo': game.playerWin(true); break;
      case 'ron': game.playerWin(false); break;
      case 'pon': game.playerPon(); break;
      case 'kan': game.playerKan(); break;
      case 'selfkan': game.playerSelfKan(); break;
      case 'chi':
        if (game.callOptions && game.callOptions.chi.length) game.playerChi(game.callOptions.chi[0]);
        break;
      case 'pass': game.playerPass(); break;
      case 'double': game.startDouble(); break;
      case 'big': game.doubleBet(true); break;
      case 'small': game.doubleBet(false); break;
      case 'next': game.nextRound(); UI.announce = ''; UI.announceSub = ''; break;
    }
    UI.selected = -1;
  }

  function onKey(e) {
    var game = UI.game;
    if (e.key === '5') game.insertCoin(1);
    else if (e.key === '3' && game.state === ST.ODDS) game.addBet();
    else if (e.key === '1' && game.state === ST.ODDS) game.start();
    else if (e.key === '1' && game.state === ST.SELECT) game.confirmExchange();
    else if ((e.key === 'y' || e.key === 'Y') && game.selfWin) game.playerWin(true);
    else if (game.state === ST.SELECT) {
      var k = e.key.toUpperCase();
      var idx = 'ABCDEFGHIJKLMN'.indexOf(k);
      if (idx >= 0) game.toggleExchange(idx);
    }
    else if (game.state === ST.DRAW || game.state === ST.DISCARD) {
      var k2 = e.key.toUpperCase();
      var idx2 = 'ABCDEFGHIJKLMN'.indexOf(k2);
      if (idx2 >= 0 && idx2 < UI.tileRects.length) {
        if (UI.selected === idx2) { game.discard(idx2); UI.selected = -1; }
        else { UI.selected = idx2; render(); }
      }
    }
  }

  /* ================= HTML 触屏按钮 ================= */
  /* 与 canvas drawButtons 相同的 state 判断逻辑，按钮更大、手机可点 */
  var HTML_BTNS = [
    { id: 'hb-coin', label: '投幣', action: 'coin' },
    { id: 'hb-bet', label: '押注', action: 'bet' },
    { id: 'hb-start', label: '開始', action: 'start' },
    { id: 'hb-confirm', label: '確定', action: 'confirm' },
    { id: 'hb-tsumo', label: '胡', action: 'tsumo' },
    { id: 'hb-selfkan', label: '槓', action: 'selfkan' },
    { id: 'hb-ron', label: '胡', action: 'ron' },
    { id: 'hb-kan', label: '槓', action: 'kan' },
    { id: 'hb-pon', label: '碰', action: 'pon' },
    { id: 'hb-chi', label: '吃', action: 'chi' },
    { id: 'hb-pass', label: '過', action: 'pass' },
    { id: 'hb-double', label: '比倍', action: 'double' },
    { id: 'hb-next', label: '下一局', action: 'next' },
    { id: 'hb-big', label: '大', action: 'big' },
    { id: 'hb-small', label: '小', action: 'small' }
  ];

  var STATE_TIP = {};
  // state 中文提示在 init 后填充（ST 常量已就绪）

  function buildHTMLButtons() {
    var box = document.getElementById('touchbtns');
    if (!box) return;
    box.innerHTML = '';
    for (var i = 0; i < HTML_BTNS.length; i++) {
      (function (def) {
        var b = document.createElement('button');
        b.id = def.id;
        b.className = 'tbtn hidden';
        b.textContent = def.label;
        b.addEventListener('click', function () {
          b.classList.add('pressed');
          setTimeout(function () { b.classList.remove('pressed'); }, 150);
          doAction(def.action);
          render();
        });
        box.appendChild(b);
      })(HTML_BTNS[i]);
    }
  }

  function showBtn(id, visible, enabled) {
    var b = document.getElementById(id);
    if (!b) return;
    b.classList.toggle('hidden', !visible);
    b.disabled = !enabled;
  }

  function updateHTMLButtons() {
    var game = UI.game;
    if (!game || !document.getElementById('touchbtns')) return;
    var st = game.state;
    // 先全部隐藏
    for (var i = 0; i < HTML_BTNS.length; i++) showBtn(HTML_BTNS[i].id, false, false);
    if (st === ST.IDLE || st === ST.GAMEOVER) {
      showBtn('hb-coin', true, true);
    } else if (st === ST.ODDS) {
      showBtn('hb-coin', true, true);
      showBtn('hb-bet', true, game.credit > 0);
      showBtn('hb-start', true, game.bet > 0);
    } else if (st === ST.SELECT) {
      showBtn('hb-confirm', true, true);
    } else if (st === ST.DRAW) {
      if (game.selfWin) showBtn('hb-tsumo', true, true);
      if (game.selfKan >= 0) showBtn('hb-selfkan', true, true);
    } else if (st === ST.CALL && game.callOptions) {
      var o = game.callOptions;
      if (o.hu) showBtn('hb-ron', true, true);
      if (o.kan) showBtn('hb-kan', true, true);
      if (o.pon) showBtn('hb-pon', true, true);
      if (o.chi && o.chi.length) showBtn('hb-chi', true, true);
      showBtn('hb-pass', true, true);
    } else if (st === ST.WIN) {
      if (game.lastWin && game.lastWin.winner === 'player' && game.lastWin.points > 0)
        showBtn('hb-double', true, true);
      showBtn('hb-next', true, true);
    } else if (st === ST.DOUBLE) {
      showBtn('hb-big', true, true);
      showBtn('hb-small', true, true);
    }
    // 状态提示条
    var tip = document.getElementById('statusbar');
    if (tip) {
      var msg = game.message || stateTip(st);
      tip.textContent = msg;
    }
  }

  function stateTip(st) {
    if (st === ST.IDLE || st === ST.GAMEOVER) return '請投幣';
    if (st === ST.ODDS) return '請押注或按開始';
    if (st === ST.SELECT) return '請選擇要交換的牌，按確定';
    if (st === ST.DRAW) return '請出牌（點選手牌兩次）';
    if (st === ST.DISCARD) return '請出牌';
    if (st === ST.CALL) return '請選擇：吃/碰/槓/胡/過';
    if (st === ST.WIN) return '結算完成';
    if (st === ST.DOUBLE) return '比倍：選大或小';
    return '';
  }

  // render 后同步 HTML 按钮
  var _origRender = render;
  render = function () {
    _origRender();
    try { updateHTMLButtons(); } catch (e) {}
  };

  // init 时构建 HTML 按钮
  var _origInit = init;
  init = function (canvasId, game) {
    _origInit(canvasId, game);
    try { buildHTMLButtons(); updateHTMLButtons(); } catch (e) {}
  };

  g.SDMG2UI = {
    init: init,
    render: render,
    doAction: function (a) { doAction(a); render(); },
    setAnnounce: function (a, sub) { UI.announce = a; UI.announceSub = sub; render(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
