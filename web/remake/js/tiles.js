/* 超級大滿貫II · 原版风格牌面绘制 —— Canvas 矢量重绘
 * 白底蓝边 + 底部红边（厚度）/ 红牌背 + 白色高光
 * 筒=同心圆 / 索=竹节 / 萬=数字+萬 / 字牌
 * (function 封装，挂 window.MahjongTiles)
 */
(function (g) {
  'use strict';

  var W = 52, H = 68; // 基准牌面尺寸

  var BLUE = '#1565c0', DARKBLUE = '#1a237e', RED = '#c62828',
      GREEN = '#2e7d32', INK = '#212121', PURPLE = '#6a1b9a';

  var NUM_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(ctx, s, x, y, size, color, bold) {
    ctx.fillStyle = color;
    ctx.font = (bold ? 'bold ' : '') + size + 'px "Noto Sans TC","PMingLiU","Microsoft JhengHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }

  /* 牌体：白底蓝边 + 红色底边（厚度） */
  function drawBody(ctx, x, y, w, h) {
    var edgeH = Math.max(3, Math.round(h * 0.13));
    // 底边红条（厚度）
    ctx.fillStyle = '#d32f2f';
    rr(ctx, x + 1, y + 2, w, h, 2);
    ctx.fill();
    // 白牌面
    var grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.85, '#f4f6f7');
    grd.addColorStop(1, '#dfe5e8');
    ctx.fillStyle = grd;
    rr(ctx, x, y, w, h - edgeH + 2, 2);
    ctx.fill();
    // 红底条
    ctx.fillStyle = '#e53935';
    ctx.fillRect(x + 1, y + h - edgeH, w - 1, edgeH - 1);
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(x + 1, y + h - 2, w - 1, 1);
    // 蓝描边
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = Math.max(1, w * 0.045);
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 2);
    ctx.stroke();
  }

  /* 牌背：亮红 + 白色高光竖条；opts.back='cyan' 时为青色背 */
  function drawBackBody(ctx, x, y, w, h, back) {
    var cyan = back === 'cyan';
    ctx.fillStyle = cyan ? '#0d3b66' : '#b71c1c';
    rr(ctx, x + 1, y + 2, w, h, 2);
    ctx.fill();
    var grd = ctx.createLinearGradient(x, 0, x + w, 0);
    if (cyan) {
      grd.addColorStop(0, '#9fd8ff');
      grd.addColorStop(0.3, '#29b6f6');
      grd.addColorStop(1, '#0277bd');
    } else {
      grd.addColorStop(0, '#ff8a80');
      grd.addColorStop(0.3, '#f44336');
      grd.addColorStop(1, '#c62828');
    }
    ctx.fillStyle = grd;
    rr(ctx, x, y, w, h - 3, 2);
    ctx.fill();
    // 白高光竖条
    var hg = ctx.createLinearGradient(x, 0, x + w * 0.3, 0);
    hg.addColorStop(0, 'rgba(255,255,255,0.75)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(x + w * 0.18, y + 3, w * 0.16, h - 9);
    // 白底边
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(x + 1, y + h - 4, w - 2, 3);
    ctx.strokeStyle = '#4a1414';
    ctx.lineWidth = 1;
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 2);
    ctx.stroke();
  }

  /* 筒：同心圆 */
  function drawPinDot(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2); ctx.fill();
  }

  /* 索：竹节 */
  function drawSouStick(ctx, cx, cy, len, color) {
    var w = Math.max(2.5, len * 0.28);
    ctx.fillStyle = color;
    rr(ctx, cx - w / 2, cy - len / 2, w, len, w / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(cx - w / 2, cy - 1.5, w, 3);
  }

  var PIN_POS = {
    1: [[0, 0]], 2: [[0, -0.5], [0, 0.5]],
    3: [[0, -0.68], [0, 0], [0, 0.68]],
    4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]],
    5: [[-0.5, -0.55], [0.5, -0.55], [0, 0], [-0.5, 0.55], [0.5, 0.55]],
    6: [[-0.5, -0.62], [0.5, -0.62], [-0.5, 0], [0.5, 0], [-0.5, 0.62], [0.5, 0.62]],
    7: [[-0.5, -0.65], [0.5, -0.65], [0, -0.25], [-0.5, 0.2], [0.5, 0.2], [-0.45, 0.65], [0.45, 0.65]],
    8: [[-0.5, -0.68], [0.5, -0.68], [-0.5, -0.23], [0.5, -0.23], [-0.5, 0.23], [0.5, 0.23], [-0.5, 0.68], [0.5, 0.68]],
    9: [[-0.5, -0.68], [0, -0.68], [0.5, -0.68], [-0.5, 0], [0, 0], [0.5, 0], [-0.5, 0.68], [0, 0.68], [0.5, 0.68]]
  };

  function drawMan(ctx, x, y, w, h, rank) {
    var cx = x + w / 2;
    var color = (rank === 5) ? RED : INK;
    text(ctx, NUM_CN[rank], cx, y + h * 0.30, h * 0.34, color, true);
    text(ctx, '萬', cx, y + h * 0.68, h * 0.38, color, true);
  }

  function drawPin(ctx, x, y, w, h, rank) {
    var cx = x + w / 2, cy = y + h / 2;
    var R = Math.min(w, h) * 0.30;
    var pos = PIN_POS[rank];
    for (var i = 0; i < pos.length; i++) {
      var px = cx + pos[i][0] * w * 0.62;
      var py = cy + pos[i][1] * h * 0.62;
      var c = BLUE;
      if (rank === 5 && i === 2) c = RED;
      if (rank === 1) c = [BLUE, RED, GREEN][i % 3];
      drawPinDot(ctx, px, py, R * (rank === 1 ? 1.5 : 1), c);
    }
  }

  function drawSou(ctx, x, y, w, h, rank) {
    var cx = x + w / 2, cy = y + h / 2;
    if (rank === 1) {
      // 一索：简化鸟形（蓝身/红翅/绿尾）
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      ctx.ellipse(cx, cy - h * 0.05, w * 0.16, h * 0.22, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.02, cy - h * 0.08, w * 0.20, h * 0.10, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = GREEN;
      for (var i = -1; i <= 1; i++) {
        drawSouStick(ctx, cx + i * w * 0.14, cy + h * 0.28, h * 0.22, GREEN);
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx + w * 0.06, cy - h * 0.14, 2.2, 0, Math.PI * 2); ctx.fill();
      return;
    }
    var cols = rank <= 4 ? 1 : (rank <= 6 ? 2 : 3);
    var perCol = Math.ceil(rank / cols);
    var idx = 0;
    for (var c = 0; c < cols && idx < rank; c++) {
      var colX = cols === 1 ? cx : cx + (c - (cols - 1) / 2) * w * 0.40;
      for (var r = 0; r < perCol && idx < rank; r++, idx++) {
        var ry = cy + (r - (perCol - 1) / 2) * h * 0.20;
        var col = (rank === 5 && idx === 2) ? RED : GREEN;
        drawSouStick(ctx, colX, ry, h * 0.15, col);
      }
    }
  }

  var HONOR_TXT = { 27: '東', 28: '南', 29: '西', 30: '北', 32: '發', 33: '中' };
  var HONOR_COL = { 27: INK, 28: INK, 29: INK, 30: INK, 32: GREEN, 33: RED };

  function drawHonor(ctx, x, y, w, h, t) {
    var cx = x + w / 2, cy = y + h / 2;
    if (t === 31) { // 白板：蓝框
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = Math.max(2, w * 0.08);
      ctx.strokeRect(cx - w * 0.22, y + h * 0.20, w * 0.44, h * 0.60);
      return;
    }
    text(ctx, HONOR_TXT[t], cx, cy, h * 0.52, HONOR_COL[t], true);
  }

  /** 绘制一张牌到 ctx 的 (x,y)，w/h 可缩放；opts: faceDown/highlight/dim */
  function drawTile(ctx, t, x, y, w, h, opts) {
    opts = opts || {};
    x = Math.round(x); y = Math.round(y);
    if (opts.faceDown) {
      drawBackBody(ctx, x, y, w, h, opts.back);
      return;
    }
    drawBody(ctx, x, y, w, h);
    var edgeH = Math.max(3, Math.round(h * 0.13));
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 3, y + 3, w - 6, h - edgeH - 4);
    ctx.clip();
    var fx = x + 3, fy = y + 3, fw = w - 6, fh = h - edgeH - 4;
    if (t <= 8) drawMan(ctx, fx, fy, fw, fh, t + 1);
    else if (t <= 17) drawPin(ctx, fx, fy, fw, fh, t - 9 + 1);
    else if (t <= 26) drawSou(ctx, fx, fy, fw, fh, t - 18 + 1);
    else drawHonor(ctx, fx, fy, fw, fh, t);
    ctx.restore();
    if (opts.highlight) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      rr(ctx, x - 1, y - 1, w + 2, h + 2, 3);
      ctx.stroke();
    }
    if (opts.dim) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      rr(ctx, x, y, w, h, 2);
      ctx.fill();
    }
  }

  g.MahjongTiles = {
    draw: drawTile,
    W: W, H: H,
    tileName: function (t) {
      if (t <= 8) return NUM_CN[t + 1] + '萬';
      if (t <= 17) return NUM_CN[t - 9 + 1] + '筒';
      if (t <= 26) return NUM_CN[t - 18 + 1] + '索';
      return { 27: '東', 28: '南', 29: '西', 30: '北', 31: '白', 32: '發', 33: '中' }[t];
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
