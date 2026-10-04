/* 程序化麻将牌绘制 —— Canvas 矢量牌面
 * 34 种数牌 + 字牌 + 8 花牌，3D 立体效果
 * (function 封装，挂 window.MahjongTiles)
 */
(function (g) {
  'use strict';

  var W = 52, H = 68; // 牌面尺寸

  var RED = '#c0392b', GREEN = '#1e8449', BLUE = '#2471a3', BLACK = '#2c3e50';

  var NUM_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var FLOWER_CN = ['春', '夏', '秋', '冬', '梅', '蘭', '竹', '菊'];

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 牌体：象牙白 + 渐变 + 底部阴影营造厚度
  function drawBody(ctx, x, y, w, h, faceDown) {
    // 厚度
    ctx.fillStyle = '#b8a888';
    roundRect(ctx, x + 2, y + 4, w, h, 6);
    ctx.fill();
    // 正面
    var grd = ctx.createLinearGradient(x, y, x, y + h);
    if (faceDown) {
      grd.addColorStop(0, '#2e86c1');
      grd.addColorStop(1, '#1a5276');
    } else {
      grd.addColorStop(0, '#fdfbf5');
      grd.addColorStop(0.7, '#f5efe0');
      grd.addColorStop(1, '#e8dfc8');
    }
    ctx.fillStyle = grd;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,70,40,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (faceDown) {
      // 牌背花纹
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      roundRect(ctx, x + 7, y + 7, w - 14, h - 14, 4);
      ctx.stroke();
    }
  }

  function circle(ctx, x, y, r, color, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill === false) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.fillStyle = color; ctx.fill(); }
  }

  // 筒子：同心圆
  function drawPin(ctx, cx, cy, r, color) {
    circle(ctx, cx, cy, r, color, true);
    circle(ctx, cx, cy, r * 0.62, '#fdfbf5', true);
    circle(ctx, cx, cy, r * 0.38, color, true);
  }

  // 索子：竹节
  function drawSou(ctx, cx, cy, len, color, vertical) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    if (vertical) {
      var w = 5;
      roundRect(ctx, cx - w / 2, cy - len / 2, w, len, 2.5);
      ctx.fill();
      ctx.fillStyle = '#fdfbf5';
      ctx.fillRect(cx - w / 2, cy - 1.5, w, 3);
    } else {
      var h = 5;
      roundRect(ctx, cx - len / 2, cy - h / 2, len, h, 2.5);
      ctx.fill();
      ctx.fillStyle = '#fdfbf5';
      ctx.fillRect(cx - 1.5, cy - h / 2, 3, h);
    }
  }

  function text(ctx, s, x, y, size, color, bold) {
    ctx.fillStyle = color;
    ctx.font = (bold ? 'bold ' : '') + size + 'px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }

  // 万子布局：上为数字下为萬
  function drawMan(ctx, x, y, w, h, rank) {
    var cx = x + w / 2;
    var color = (rank === 5) ? RED : BLACK;
    text(ctx, NUM_CN[rank], cx, y + h * 0.32, 20, color, true);
    text(ctx, '萬', cx, y + h * 0.68, 22, color, true);
  }

  // 筒子布局点位
  var PIN_POS = {
    1: [[0, 0, 1.6]],
    2: [[0, -0.55, 1], [0, 0.55, 1]],
    3: [[0, -0.7, 0.9], [0, 0, 0.9], [0, 0.7, 0.9]],
    4: [[-0.5, -0.5, 0.95], [0.5, -0.5, 0.95], [-0.5, 0.5, 0.95], [0.5, 0.5, 0.95]],
    5: [[-0.5, -0.55, 0.9], [0.5, -0.55, 0.9], [0, 0, 1.05], [-0.5, 0.55, 0.9], [0.5, 0.55, 0.9]],
    6: [[-0.5, -0.6, 0.9], [0.5, -0.6, 0.9], [-0.5, 0, 0.9], [0.5, 0, 0.9], [-0.5, 0.6, 0.9], [0.5, 0.6, 0.9]],
    7: [[-0.55, -0.62, 0.85], [0.55, -0.62, 0.85], [0, -0.28, 0.85], [-0.55, 0.12, 0.85], [0.55, 0.12, 0.85], [-0.55, 0.55, 0.85], [0.55, 0.55, 0.85]],
    8: [[-0.5, -0.65, 0.85], [0.5, -0.65, 0.85], [-0.5, -0.22, 0.85], [0.5, -0.22, 0.85], [-0.5, 0.22, 0.85], [0.5, 0.22, 0.85], [-0.5, 0.65, 0.85], [0.5, 0.65, 0.85]],
    9: [[-0.55, -0.68, 0.8], [0, -0.68, 0.8], [0.55, -0.68, 0.8], [-0.55, 0, 0.8], [0, 0, 0.95], [0.55, 0, 0.8], [-0.55, 0.68, 0.8], [0, 0.68, 0.8], [0.55, 0.68, 0.8]]
  };
  var PIN_COLORS = { 1: [BLUE], 5: [GREEN] }; // 特殊色

  function drawPinTile(ctx, x, y, w, h, rank) {
    var cx = x + w / 2, cy = y + h / 2;
    var R = Math.min(w, h) * 0.30;
    var pos = PIN_POS[rank];
    for (var i = 0; i < pos.length; i++) {
      var px = cx + pos[i][0] * w * 0.62;
      var py = cy + pos[i][1] * h * 0.62;
      var c = BLUE;
      if (rank === 5 && i === 2) c = RED;
      if (rank === 1) c = [BLUE, RED, GREEN][i % 3];
      drawPin(ctx, px, py, R * pos[i][2], c);
    }
  }

  // 索子布局
  function drawSouTile(ctx, x, y, w, h, rank) {
    var cx = x + w / 2, cy = y + h / 2;
    if (rank === 1) {
      // 一索：大鸟（简化为红色大竹节 + 装饰）
      drawSou(ctx, cx, cy, h * 0.62, RED, true);
      circle(ctx, cx, cy - h * 0.18, 5, BLUE, true);
      circle(ctx, cx, cy + h * 0.05, 4, GREEN, true);
      return;
    }
    var cols, rowsPer;
    if (rank <= 4) { cols = 1; }
    else if (rank <= 6) { cols = 2; }
    else { cols = 3; }
    var perCol = Math.ceil(rank / cols);
    var colorAlt = (rank === 5);
    var idx = 0;
    for (var c = 0; c < cols && idx < rank; c++) {
      var colX = cols === 1 ? cx : cx + (c - (cols - 1) / 2) * w * 0.42;
      for (var r = 0; r < perCol && idx < rank; r++, idx++) {
        var ry = cy + (r - (perCol - 1) / 2) * h * 0.20;
        var col = GREEN;
        if (colorAlt && idx === 2) col = RED;
        drawSou(ctx, colX, ry, h * 0.15, col, true);
      }
    }
  }

  var HONOR_CN = { 27: '東', 28: '南', 29: '西', 30: '北', 31: '', 32: '發', 33: '中' };

  function drawHonor(ctx, x, y, w, h, t) {
    var cx = x + w / 2, cy = y + h / 2;
    if (t === 31) { // 白板：蓝框
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 3;
      roundRect(ctx, x + w * 0.22, y + h * 0.18, w * 0.56, h * 0.64, 4);
      ctx.stroke();
      return;
    }
    var color = (t === 32) ? GREEN : (t === 33) ? RED : BLACK;
    text(ctx, HONOR_CN[t], cx, cy, 30, color, true);
  }

  function drawFlower(ctx, x, y, w, h, t) {
    var cx = x + w / 2, cy = y + h / 2;
    var idx = t - 34;
    var color = idx < 4 ? BLUE : RED;
    text(ctx, FLOWER_CN[idx], cx, cy - 8, 24, color, true);
    text(ctx, idx < 4 ? '季' : '君', cx, cy + 16, 13, '#7f8c8d', false);
  }

  /** 绘制一张牌到 ctx 的 (x,y)，w/h 可缩放 */
  function drawTile(ctx, t, x, y, w, h, opts) {
    opts = opts || {};
    drawBody(ctx, x, y, w, h, !!opts.faceDown);
    if (opts.faceDown) return;
    // 按比例缩放绘制内容：用 save/scale 归一化到标准尺寸
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(w / W, h / H);
    ctx.translate(-x, -y);
    if (t <= 8) drawMan(ctx, x, y, W, H, t + 1);
    else if (t <= 17) drawPinTile(ctx, x, y, W, H, t - 9 + 1);
    else if (t <= 26) drawSouTile(ctx, x, y, W, H, t - 18 + 1);
    else if (t <= 33) drawHonor(ctx, x, y, W, H, t);
    else drawFlower(ctx, x, y, W, H, t);
    if (opts.highlight) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3;
      roundRect(ctx, x + 1, y + 1, W - 2, H - 2, 6);
      ctx.stroke();
    }
    if (opts.dim) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, x, y, W, H, 6);
      ctx.fill();
    }
    ctx.restore();
  }

  g.MahjongTiles = {
    draw: drawTile,
    W: W, H: H,
    tileName: function (t) {
      if (t <= 8) return NUM_CN[t + 1] + '萬';
      if (t <= 17) return NUM_CN[t - 9 + 1] + '筒';
      if (t <= 26) return NUM_CN[t - 18 + 1] + '索';
      if (t <= 33) return { 27: '東', 28: '南', 29: '西', 30: '北', 31: '白', 32: '發', 33: '中' }[t];
      return FLOWER_CN[t - 34];
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
