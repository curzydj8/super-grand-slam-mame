/* 超級大滿貫II · UI（1:1 还原实机截图）
 * 512×240，灰底细格纹、金色大字、深红CREDIT框、白底红边牌
 */
(function (g) {
  'use strict';
  var ST = g.SDMG2_ST;

  var W = 512, H = 240;

  var UI = {
    canvas: null, ctx: null, game: null,
    scale: 1,
    selected: -1,
    announce: '', announceSub: '',
    tileRects: [], buttons: []
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
    document.addEventListener('keydown', onKey);
    render();
  }

  function resize() {
    var ww = window.innerWidth, wh = window.innerHeight;
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
      if (info.yakuman) { UI.announce = info.yakuList[0].name; UI.announceSub = '役滿'; }
      else { UI.announce = '人胡'; UI.announceSub = ''; }
    } else if (info.winner === 'cpu') { UI.announce = '電腦胡'; UI.announceSub = ''; }
    else { UI.announce = '流局'; UI.announceSub = ''; }
    render();
    setTimeout(function () { UI.announce = ''; UI.announceSub = ''; render(); }, 5000);
  }

  /* ========== 背景：灰底 + 细十字格纹 ========== */
  function drawBG(ctx) {
    ctx.fillStyle = '#8b8b8b';
    ctx.fillRect(0, 0, W, H);
    // 细格纹：小十字点阵
    ctx.fillStyle = '#7e7e7e';
    for (var y = 4; y < H; y += 8) {
      for (var x = 4; x < W; x += 8) {
        ctx.fillRect(x, y, 3, 1);
        ctx.fillRect(x + 1, y - 1, 1, 3);
      }
    }
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ========== 金色渐变大字（红描边） ========== */
  function goldText(ctx, str, x, y, size) {
    ctx.font = 'bold ' + size + 'px "Noto Sans TC","PMingLiU","Microsoft JhengHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var grd = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55);
    grd.addColorStop(0, '#ff3d00');
    grd.addColorStop(0.35, '#ffb300');
    grd.addColorStop(0.55, '#fffde7');
    grd.addColorStop(0.75, '#ffc107');
    grd.addColorStop(1, '#ff6f00');
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = '#a00000';
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = grd;
    ctx.fillText(str, x, y);
  }

  /* ========== 原版牌：白底 + 红底边 ========== */
  function drawTile(ctx, t, x, y, w, h, opts) {
    opts = opts || {};
    x = Math.round(x); y = Math.round(y);
    // 红底边（厚度）
    var edgeH = Math.max(3, Math.round(h * 0.12));
    ctx.fillStyle = '#d32f2f';
    rr(ctx, x + 1, y + 2, w, h, 2);
    ctx.fill();
    // 白牌面
    var grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.85, '#f0f0f0');
    grd.addColorStop(1, '#e0e0e0');
    ctx.fillStyle = grd;
    rr(ctx, x, y, w, h - edgeH + 2, 2);
    ctx.fill();
    // 红底条
    ctx.fillStyle = '#e53935';
    ctx.fillRect(x + 1, y + h - edgeH, w - 1, edgeH - 1);
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(x + 1, y + h - 2, w - 1, 1);
    // 黑描边
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 2);
    ctx.stroke();

    // 牌面
    drawFace(ctx, t, x, y, w, h - edgeH);

    if (opts.highlight) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      rr(ctx, x - 1, y - 1, w + 2, h + 2, 3);
      ctx.stroke();
    }
  }

  /* ========== 牌背：亮红 + 白高光条 ========== */
  function drawBack(ctx, x, y, w, h) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = '#b71c1c';
    rr(ctx, x + 1, y + 2, w, h, 2);
    ctx.fill();
    var grd = ctx.createLinearGradient(x, 0, x + w, 0);
    grd.addColorStop(0, '#ff8a80');
    grd.addColorStop(0.25, '#f44336');
    grd.addColorStop(1, '#c62828');
    ctx.fillStyle = grd;
    rr(ctx, x, y, w, h - 3, 2);
    ctx.fill();
    // 白底边
    ctx.fillStyle = '#ececec';
    ctx.fillRect(x + 1, y + h - 4, w - 2, 3);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 2);
    ctx.stroke();
  }

  /* ========== 牌面点数 ========== */
  function drawFace(ctx, t, x, y, w, h) {
    var cx = x + w / 2, cy = y + h / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 2, y + 2, w - 4, h - 4);
    ctx.clip();

    if (t < 9) {
      var N = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
      var fs = h * 0.36;
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold ' + fs + 'px "Noto Sans TC",sans-serif';
      ctx.fillText(N[t + 1], cx, y + h * 0.28);
      ctx.font = 'bold ' + fs * 1.05 + 'px "Noto Sans TC",sans-serif';
      ctx.fillText('萬', cx, y + h * 0.68);
    } else if (t < 18) {
      drawPips(ctx, cx, cy, w, h, t - 9 + 1, 'pin');
    } else if (t < 27) {
      drawPips(ctx, cx, cy, w, h, t - 18 + 1, 'sou');
    } else {
      var H_TXT = { 27: '東', 28: '南', 29: '西', 30: '北', 32: '發', 33: '中' };
      var H_COL = { 27: '#1a1a1a', 28: '#1a1a1a', 29: '#1a1a1a', 30: '#1a1a1a', 32: '#2e7d32', 33: '#c62828' };
      if (t === 31) {
        ctx.strokeStyle = '#1565c0';
        ctx.lineWidth = Math.max(2, w * 0.07);
        ctx.strokeRect(cx - w * 0.22, y + h * 0.2, w * 0.44, h * 0.6);
      } else {
        ctx.fillStyle = H_COL[t];
        ctx.font = 'bold ' + h * 0.52 + 'px "Noto Sans TC",sans-serif';
        ctx.fillText(H_TXT[t], cx, cy);
      }
    }
    ctx.restore();
  }

  var PIP_POS = {
    1: [[0, 0]], 2: [[0, -0.5], [0, 0.5]],
    3: [[0, -0.68], [0, 0], [0, 0.68]],
    4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]],
    5: [[-0.5, -0.55], [0.5, -0.55], [0, 0], [-0.5, 0.55], [0.5, 0.55]],
    6: [[-0.5, -0.62], [0.5, -0.62], [-0.5, 0], [0.5, 0], [-0.5, 0.62], [0.5, 0.62]],
    7: [[-0.5, -0.65], [0.5, -0.65], [0, -0.25], [-0.5, 0.2], [0.5, 0.2], [-0.45, 0.65], [0.45, 0.65]],
    8: [[-0.5, -0.68], [0.5, -0.68], [-0.5, -0.23], [0.5, -0.23], [-0.5, 0.23], [0.5, 0.23], [-0.5, 0.68], [0.5, 0.68]],
    9: [[-0.5, -0.68], [0, -0.68], [0.5, -0.68], [-0.5, 0], [0, 0], [0.5, 0], [-0.5, 0.68], [0, 0.68], [0.5, 0.68]]
  };

  function drawPips(ctx, cx, cy, w, h, rank, kind) {
    var pos = PIP_POS[rank];
    var R = Math.min(w, h) * 0.13;
    for (var i = 0; i < pos.length; i++) {
      var px = cx + pos[i][0] * w * 0.62;
      var py = cy + pos[i][1] * h * 0.62;
      var col;
      if (kind === 'pin') {
        col = '#1565c0';
        if (rank === 5 && i === 2) col = '#c62828';
        if (rank === 1) col = ['#1565c0', '#c62828', '#2e7d32'][i % 3];
        // 同心圆
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(px, py, R * 0.62, 0, 7); ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(px, py, R * 0.36, 0, 7); ctx.fill();
      } else {
        col = '#2e7d32';
        if (rank === 5 && i === 2) col = '#c62828';
        if (rank === 1) {
          // 一索画鸟简化：红绿蓝竖条
          var cols1 = ['#c62828', '#1565c0', '#2e7d32'];
          ctx.fillStyle = cols1[i % 3];
        } else ctx.fillStyle = col;
        var bw = Math.max(2, R * 0.55);
        rr(ctx, px - bw / 2, py - R * 1.1, bw, R * 2.2, 1);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(px - bw / 2, py - 1, bw, 2);
      }
    }
  }

  /* ========== CREDIT/BET 框（深红底+金色角饰） ========== */
  function drawCreditBox(ctx, game) {
    var x = 140, y = 108, w = 132, h = 44;
    // 深红底
    ctx.fillStyle = '#3d0a0a';
    rr(ctx, x, y, w, h, 4);
    ctx.fill();
    // 金色边框
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 3);
    ctx.stroke();
    // 四角金饰（「」形）
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    var c = 8;
    // 左上
    ctx.beginPath(); ctx.moveTo(x - 2, y + c); ctx.lineTo(x - 2, y - 2); ctx.lineTo(x + c, y - 2); ctx.stroke();
    // 右上
    ctx.beginPath(); ctx.moveTo(x + w - c, y - 2); ctx.lineTo(x + w + 2, y - 2); ctx.lineTo(x + w + 2, y + c); ctx.stroke();
    // 左下
    ctx.beginPath(); ctx.moveTo(x - 2, y + h - c); ctx.lineTo(x - 2, y + h + 2); ctx.lineTo(x + c, y + h + 2); ctx.stroke();
    // 右下
    ctx.beginPath(); ctx.moveTo(x + w - c, y + h + 2); ctx.lineTo(x + w + 2, y + h + 2); ctx.lineTo(x + w + 2, y + h - c); ctx.stroke();
    // 中分隔线
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 4, y + h / 2); ctx.lineTo(x + w - 4, y + h / 2); ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px "Courier New",monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7cfc00';
    ctx.fillText('CREDIT', x + 8, y + 12);
    ctx.fillText('B E T', x + 8, y + 32);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff6ec7';
    ctx.font = 'bold 15px "Courier New",monospace';
    ctx.fillText(String(game.credit), x + w - 10, y + 12);
    ctx.fillText(String(game.bet), x + w - 10, y + 32);
  }

  /* ========== CREDIT右侧小牌（發+牌背，对手牌） ========== */
  function drawSideTiles(ctx, game) {
    var x = 282, y = 108;
    var tw = 22, th = 32;
    // 第一张明牌（对手舍牌或指示）
    if (game.cpuDiscards.length > 0) {
      drawTile(ctx, game.cpuDiscards[game.cpuDiscards.length - 1], x, y, tw, th, {});
    } else {
      drawTile(ctx, 32, x, y, tw, th, {}); // 發
    }
    x += tw + 2;
    for (var i = 0; i < 4; i++) {
      drawBack(ctx, x + i * (tw * 0.7 + 1), y, tw * 0.7, th);
    }
  }

  /* ========== 顶部大标题 ========== */
  function drawTitle(ctx, game) {
    var txt = UI.announce;
    if (!txt) {
      // 待机标题：金色渐变（原版风格）
      if (game.state === ST.IDLE || game.state === ST.BET || game.state === ST.GAMEOVER) {
        goldText(ctx, '超級大滿貫II', 256, 42, 38);
      }
      return;
    }
    goldText(ctx, txt, 256, 48, 54);
    if (UI.announceSub) goldText(ctx, UI.announceSub, 256, 92, 26);
  }

  /* ========== 结算行：役滿 / 合計 13 / 750點 ========== */
  function drawScoreLine(ctx, game) {
    var info = game.lastWin;
    if (!info || !info.points) return;
    var y = 122;
    // 役滿（金色，最左）
    if (info.yakuman) {
      ctx.font = 'bold 26px "Noto Sans TC",sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      var grd0 = ctx.createLinearGradient(0, y - 14, 0, y + 14);
      grd0.addColorStop(0, '#ff3d00'); grd0.addColorStop(0.5, '#ffd700'); grd0.addColorStop(1, '#ff8f00');
      ctx.lineWidth = 2; ctx.strokeStyle = '#a00000';
      ctx.strokeText('役滿', 150, y);
      ctx.fillStyle = grd0;
      ctx.fillText('役滿', 150, y);
    }
    // 合計（青色）
    ctx.font = 'bold 18px "Noto Sans TC",sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4dd0e1';
    ctx.fillText('合計', 225, y);
    // 13（橙色）
    ctx.font = 'bold 28px "Courier New",monospace';
    var grd = ctx.createLinearGradient(0, y - 15, 0, y + 15);
    grd.addColorStop(0, '#ffb300'); grd.addColorStop(1, '#ff3d00');
    ctx.lineWidth = 2; ctx.strokeStyle = '#7b0000';
    ctx.strokeText(String(info.han), 285, y);
    ctx.fillStyle = grd;
    ctx.fillText(String(info.han), 285, y);
    // 750點（右側，大字）
    var py = 165;
    ctx.font = 'bold 36px "Courier New",monospace';
    var grd2 = ctx.createLinearGradient(0, py - 19, 0, py + 19);
    grd2.addColorStop(0, '#ffca28'); grd2.addColorStop(0.5, '#fff176'); grd2.addColorStop(1, '#ff8f00');
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#a00000';
    ctx.textAlign = 'left';
    ctx.strokeText(String(info.points), 340, py);
    ctx.fillStyle = grd2;
    ctx.fillText(String(info.points), 340, py);
    ctx.font = 'bold 22px "Noto Sans TC",sans-serif';
    ctx.fillStyle = '#29b6f6';
    ctx.fillText('點', 340 + String(info.points).length * 22, py);
  }

  /* ========== 白色滑杆 ========== */
  function drawSlider(ctx) {
    var x = 336, y = 204, w = 92, h = 7;
    var grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#bdbdbd');
    ctx.fillStyle = grd;
    rr(ctx, x, y, w, h, 3);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 指示点（红绿）
    var ix = x + w / 2;
    ctx.fillStyle = '#c62828';
    ctx.beginPath(); ctx.arc(ix - 3, y + h / 2, 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.arc(ix + 3, y + h / 2, 4, 0, 7); ctx.fill();
  }

  /* ========== 顶部牌墙（一排红牌背） ========== */
  function drawWall(ctx, game) {
    var n = 13;
    var bw = 28, bh = 22;
    var totalW = n * (bw + 1);
    var x0 = Math.round((W - totalW) / 2);
    for (var i = 0; i < n; i++) {
      drawBack(ctx, x0 + i * (bw + 1), 2, bw, bh);
    }
  }

  /* ========== 人物立绘（左侧，占位风格化） ========== */
  function drawPortrait(ctx) {
    var x = 6, y = 28, w = 118, h = 150;
    // 背景
    ctx.fillStyle = '#5d4037';
    rr(ctx, x, y, w, h, 6);
    ctx.fill();
    // 脸
    ctx.fillStyle = '#ffccaa';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 52, 28, 34, 0, 0, 7);
    ctx.fill();
    // 头发
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 38, 32, 26, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x + w / 2 - 32, y + 30, 10, 50);
    ctx.fillRect(x + w / 2 + 22, y + 30, 10, 50);
    // 眼睛
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(x + w / 2 - 11, y + 52, 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w / 2 + 11, y + 52, 3, 0, 7); ctx.fill();
    // 嘴
    ctx.strokeStyle = '#b71c1c';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + w / 2, y + 68, 8, 0.3, Math.PI - 0.3); ctx.stroke();
    // 衣服（格纹衬衫示意）
    ctx.fillStyle = '#37474f';
    rr(ctx, x + 8, y + 92, w - 16, h - 100, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(x + 14 + i * 26, y + 94); ctx.lineTo(x + 14 + i * 26, y + h - 8); ctx.stroke();
    }
    for (var j = 0; j < 3; j++) {
      ctx.beginPath(); ctx.moveTo(x + 10, y + 100 + j * 16); ctx.lineTo(x + w - 10, y + 100 + j * 16); ctx.stroke();
    }
  }

  /* ========== DONDEN 指示器 ========== */
  function drawDonden(ctx, game) {
    var x = 4, y = 182, w = 112, h = 24;
    ctx.fillStyle = '#3d0a0a';
    rr(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 3);
    ctx.stroke();
    ctx.fillStyle = '#7cfc00';
    ctx.font = 'bold 14px "Courier New",monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DONDEN ' + (game.donden || 4), x + w / 2, y + h / 2 + 1);
  }

  /* ========== CPU牌（左侧：1明+4暗） ========== */
  function drawCpuTiles(ctx, game) {
    var y = 118;
    var tw = 30, th = 42;
    var x = 8;
    // 最后一张舍牌明示
    if (game.cpuDiscards.length > 0) {
      drawTile(ctx, game.cpuDiscards[game.cpuDiscards.length - 1], x, y, tw, th, {});
      x += tw + 4;
    }
    // 4张牌背
    var bw = 30;
    for (var i = 0; i < 4; i++) {
      drawBack(ctx, x + i * (bw + 2), y, bw, th);
    }
    // CPU副露（下方小牌）
    var my = y + th + 6;
    for (var m = 0; m < game.cpuMelds.length; m++) {
      var tiles = game.cpuMelds[m].tiles;
      var mx = 8;
      for (var k = 0; k < Math.min(3, tiles.length); k++) {
        drawTile(ctx, tiles[k], mx, my, 20, 28, {});
        mx += 22;
      }
      my += 30;
    }
  }

  /* ========== 玩家舍牌（中右） ========== */
  function drawDiscards(ctx, game) {
    var tw = 20, th = 28;
    var x = 352, y = 118;
    var list = game.playerDiscards.slice(-12);
    for (var i = 0; i < list.length; i++) {
      drawTile(ctx, list[i], x + (i % 6) * (tw + 1), y + ((i / 6) | 0) * (th + 1), tw, th, {});
    }
  }

  /* ========== 玩家手牌（底部14张，带A-N键位标签） ========== */
  function drawPlayerHand(ctx, game) {
    var hand = game.playerHand;
    var tw = 31, th = 38;
    var gap = 2;
    var labelH = 12;
    var totalW = hand.length * (tw + gap);
    var startX = Math.round((W - totalW) / 2) + 6;
    var y = H - th - labelH - 3;
    UI.tileRects = [];
    var KEYS = 'ABCDEFGHIJKLMN';
    for (var i = 0; i < hand.length; i++) {
      var x = startX + i * (tw + gap);
      var dy = (i === UI.selected) ? -8 : 0;
      var isDraw = (i === hand.length - 1 && game.lastDraw >= 0 && game.state === ST.DRAW);
      if (isDraw) x += 5;
      drawTile(ctx, hand[i], x, y + dy, tw, th, { highlight: i === UI.selected });
      // A-N 标签
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 10px "Courier New",monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(KEYS[i] || '', x + tw / 2, y + th + 2 + dy);
      UI.tileRects.push({ x: x, y: y + dy, w: tw, h: th + labelH, idx: i });
    }
    // 副露（右上小牌）
    var melds = game.playerMelds;
    var mx = W - 14;
    for (var m = melds.length - 1; m >= 0; m--) {
      var tiles = melds[m].tiles;
      for (var k = tiles.length - 1; k >= 0; k--) {
        mx -= 22;
        drawTile(ctx, tiles[k], mx, 60, 20, 28, {});
      }
      mx -= 5;
    }
  }

  /* ========== 按钮 ========== */
  function drawButtons(ctx, game) {
    UI.buttons = [];
    var bx = 440, by = 200, bw = 66, bh = 24;
    function btn(label, enabled, action) {
      if (by + bh > 236) return;
      UI.buttons.push({ x: bx, y: by, w: bw, h: bh, label: label, enabled: enabled, action: action });
      ctx.fillStyle = enabled ? '#ffd54f' : '#616161';
      rr(ctx, bx, by, bw, bh, 4);
      ctx.fill();
      ctx.strokeStyle = enabled ? '#a00000' : '#424242';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = enabled ? '#4a0000' : '#9e9e9e';
      ctx.font = 'bold 14px "Noto Sans TC",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
      by += bh + 4;
    }
    // 游戏进行中的按钮放右侧上方
    if (game.state === ST.DRAW || game.state === ST.CALL || game.state === ST.DISCARD) {
      by = 56;
    }
    if (game.state === ST.IDLE || game.state === ST.GAMEOVER) btn('投幣', true, 'coin');
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

  /* ========== 比倍 ========== */
  function drawDouble(ctx, game) {
    if (game.state !== ST.DOUBLE) return;
    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    goldText(ctx, '比倍', 256, 50, 44);
    ctx.font = 'bold 22px "Courier New",monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('莊家', 170, 110);
    ctx.fillText('你', 342, 110);
    // 庄家牌
    drawMiniCard(ctx, game.doubleCards[0], 170, 140);
    // 玩家牌（未开显示？）
    if (game.doubleResult) drawMiniCard(ctx, game.doubleResult.player, 342, 140);
    else { ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 40px sans-serif'; ctx.fillText('?', 342, 150); }
    if (game.doubleResult) {
      goldText(ctx, game.doubleResult.win ? '贏!' : '輸', 256, 200, 34);
    }
  }

  function drawMiniCard(ctx, v, x, y) {
    var w = 34, h = 48;
    ctx.fillStyle = '#fff';
    rr(ctx, x - w / 2, y - h / 2, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
    var txt = v === 1 ? 'A' : v === 11 ? 'J' : v === 12 ? 'Q' : v === 13 ? 'K' : String(v);
    ctx.fillStyle = (v === 1 || v === 11) ? '#c62828' : '#1a1a1a';
    ctx.font = 'bold 24px "Courier New",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }

  function render() {
    var ctx = UI.ctx, game = UI.game;
    if (!ctx || !game) return;
    ctx.save();
    ctx.scale(UI.scale, UI.scale);
    drawBG(ctx);

    var isWin = (game.state === ST.WIN && game.lastWin && game.lastWin.points);

    if (isWin) {
      // 胡牌画面：大字 + 结算（沿用之前1:1还原）
      drawTitle(ctx, game);
      drawCpuTiles(ctx, game);
      drawDiscards(ctx, game);
      drawPlayerHand(ctx, game);
      // WIN时CREDIT框回到中央
      drawCreditBoxWin(ctx, game);
      drawScoreLine(ctx, game);
      drawSlider(ctx);
    } else {
      // 对局画面：牌墙 + 人物 + DONDEN + A-N手牌（按实机截图）
      drawWall(ctx, game);
      drawPortrait(ctx);
      drawDonden(ctx, game);
      drawCreditBox(ctx, game);
      drawSideTiles(ctx, game);
      if (game.playerHand.length > 0) {
        drawPlayerHand(ctx, game);
      } else {
        // 待机标题
        goldText(ctx, '超級大滿貫II', 300, 60, 36);
      }
      // 舍牌区（人物右侧）
      drawDiscardsGame(ctx, game);
    }
    drawButtons(ctx, game);
    drawDouble(ctx, game);
    // 提示
    if (game.message && game.state !== ST.WIN) {
      ctx.font = '13px "Noto Sans TC",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(game.message, 300, 170);
    }
    ctx.restore();
  }

  /* WIN时中央CREDIT框 */
  function drawCreditBoxWin(ctx, game) {
    var x = 168, y = 143, w = 168, h = 54;
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
    ctx.font = 'bold 15px "Courier New",monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7cfc00';
    ctx.fillText('CREDIT', x + 10, y + 14);
    ctx.fillText('B E T', x + 10, y + 40);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff6ec7';
    ctx.font = 'bold 17px "Courier New",monospace';
    ctx.fillText(String(game.credit), x + w - 12, y + 14);
    ctx.fillText(String(game.bet), x + w - 12, y + 40);
  }

  /* 对局舍牌区（人物右侧中央） */
  function drawDiscardsGame(ctx, game) {
    var tw = 20, th = 28;
    var x = 140, y = 158;
    var list = game.playerDiscards.slice(-8).concat(game.cpuDiscards.slice(-4));
    for (var i = 0; i < list.length; i++) {
      drawTile(ctx, list[i], x + (i % 8) * (tw + 1), y + ((i / 8) | 0) * (th + 1), tw, th, {});
    }
  }

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
    if (game.state === ST.DRAW || game.state === ST.DISCARD) {
      for (var j = 0; j < UI.tileRects.length; j++) {
        var r = UI.tileRects[j];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          if (UI.selected === r.idx) { game.discard(r.idx); UI.selected = -1; }
          else { UI.selected = r.idx; render(); }
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
    else if (e.key === '1' && game.state === ST.BET) game.start();
    else if (e.key === 'u' || e.key === 'U') game.addBet();
    else if ((e.key === 'y' || e.key === 'Y') && game.selfWin) game.playerWin(true);
    // A-N 选牌（原版14个牌键）
    else if (game.state === ST.DRAW || game.state === ST.DISCARD) {
      var k = e.key.toUpperCase();
      var idx = 'ABCDEFGHIJKLMN'.indexOf(k);
      if (idx >= 0 && idx < UI.tileRects.length) {
        if (UI.selected === idx) { game.discard(idx); UI.selected = -1; }
        else { UI.selected = idx; render(); }
      }
    }
  }

  g.SDMG2UI = { init: init, render: render, setAnnounce: function(a, sub) { UI.announce = a; UI.announceSub = sub; render(); } };
})(typeof window !== 'undefined' ? window : globalThis);
