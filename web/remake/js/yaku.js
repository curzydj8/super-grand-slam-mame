/* 超級大滿貫II · 役种判定与计分
 * 考据（实机视频）：役满=750點、合計13（=13翻）
 * 役满：大三元/大四喜/小四喜/国士无双/九莲宝灯/绿一色/清老头/大車輪/四连刻/天和
 */
(function (g) {
  'use strict';
  var E = g.SDMG2Engine;

  /* 役满判定，返回役满名（中文）或 null */
  function checkYakuman(hand, winInfo, isTenhou) {
    if (isTenhou) return '天和';
    if (winInfo.special === 'kokushi') return '国士无双';
    var c = E.counts(hand);

    // 大三元：白發中各刻
    if (c[31] >= 3 && c[32] >= 3 && c[33] >= 3) return '大三元';
    // 大四喜：東南西北各刻
    if (c[27] >= 3 && c[28] >= 3 && c[29] >= 3 && c[30] >= 3) return '大四喜';
    // 小四喜：四风三刻+一雀头
    var windPon = 0, windPair = 0;
    for (var w = 27; w <= 30; w++) {
      if (c[w] >= 3) windPon++;
      else if (c[w] === 2) windPair++;
    }
    if (windPon === 3 && windPair === 1) return '小四喜';
    // 九莲宝灯：同种 1112345678999 + 任意一张同花色
    var nine = checkNineGates(c);
    if (nine) return '九莲宝灯';
    // 绿一色：23468索+發
    if (checkAllGreen(c)) return '绿一色';
    // 清老头：全部是1/9
    if (checkAllTerminals(c)) return '清老头';
    // 大車輪：22334455667788筒
    if (checkBigWheels(c)) return '大車輪';
    // 四连刻：四组连续的刻子（如333444555666）
    if (checkFourConsecutivePon(winInfo)) return '四连刻';
    return null;
  }

  function checkNineGates(c) {
    for (var s = 0; s < 3; s++) {
      var base = s * 9;
      if (c[base] >= 3 && c[base + 8] >= 3) {
        var ok = true;
        for (var r = 1; r <= 7; r++) {
          if (c[base + r] < 1) { ok = false; break; }
        }
        if (!ok) continue;
        // 总数14且全是该花色
        var total = 0, onlySuit = true;
        for (var t = 0; t < 34; t++) {
          if (c[t] > 0) {
            total += c[t];
            if (E.suit(t) !== s) onlySuit = false;
          }
        }
        if (total === 14 && onlySuit) return true;
      }
    }
    return false;
  }

  var GREEN_TILES = [19, 20, 21, 23, 25, 32]; // 23468索+發

  function checkAllGreen(c) {
    for (var t = 0; t < 34; t++) {
      if (c[t] > 0 && GREEN_TILES.indexOf(t) < 0) return false;
    }
    return true;
  }

  function checkAllTerminals(c) {
    for (var t = 0; t < 34; t++) {
      if (c[t] > 0 && !E.isTerminal(t)) return false;
    }
    return true;
  }

  function checkBigWheels(c) {
    // 22334455667788筒 = tile 10..17, each exactly 2
    for (var t = 10; t <= 17; t++) {
      if (c[t] !== 2) return false;
    }
    for (var t = 0; t < 34; t++) {
      if ((t < 10 || t > 17) && c[t] > 0) return false;
    }
    return true;
  }

  function checkFourConsecutivePon(winInfo) {
    if (!winInfo.melds || winInfo.melds.length !== 4) return false;
    var pons = [];
    for (var i = 0; i < winInfo.melds.length; i++) {
      var m = winInfo.melds[i];
      if (m.type !== 'pon') return false;
      pons.push(m.tiles[0]);
    }
    pons.sort(function (a, b) { return a - b; });
    for (var i = 1; i < 4; i++) {
      if (pons[i] !== pons[i - 1] + 1) return false;
      if (E.suit(pons[i]) !== E.suit(pons[0])) return false;
    }
    return true;
  }

  /* 一般役种，返回 [{name, han}] */
  function checkYaku(hand, winInfo, opts) {
    opts = opts || {};
    var yaku = [];
    var c = E.counts(hand);
    var melds = winInfo.melds || [];
    var menzen = !opts.called; // 门清

    // 断幺九
    var allSimples = true;
    for (var t = 0; t < 34; t++) {
      if (c[t] > 0 && (E.isHonor(t) || E.isTerminal(t))) { allSimples = false; break; }
    }
    if (allSimples) yaku.push({ name: '断幺九', han: 1 });

    // 役牌：白發中刻 / 自风/场风刻（简化：东为自风）
    var dragons = [[31, '白'], [32, '發'], [33, '中']];
    for (var i = 0; i < dragons.length; i++) {
      if (c[dragons[i][0]] >= 3) yaku.push({ name: '役牌' + dragons[i][1], han: 1 });
    }
    if (c[27] >= 3) yaku.push({ name: '役牌東', han: 1 });

    // 对对和
    var allPon = true;
    for (var i = 0; i < melds.length; i++) {
      if (melds[i].type !== 'pon') { allPon = false; break; }
    }
    if (winInfo.special !== 'sevenpairs' && winInfo.special !== 'kokushi' && allPon && melds.length === 4)
      yaku.push({ name: '对对和', han: menzen ? 2 : 2 });

    // 七对子
    if (winInfo.special === 'sevenpairs')
      yaku.push({ name: '七对子', han: 2 });

    // 混一色 / 清一色
    var suits = {};
    for (var t = 0; t < 34; t++) if (c[t] > 0) suits[E.suit(t)] = true;
    var suitCount = Object.keys(suits).length;
    var hasHonor = suits[3];
    if (suitCount === 1 && !hasHonor)
      yaku.push({ name: '清一色', han: menzen ? 6 : 5 });
    else if (suitCount === 2 && hasHonor)
      yaku.push({ name: '混一色', han: menzen ? 3 : 2 });

    // 平和（简化：门清全顺子+两面听，略过精确听牌判定，给1翻）
    // 一杯口
    if (menzen && checkIipeiko(c)) yaku.push({ name: '一杯口', han: 1 });

    // 自摸
    if (opts.tsumo && menzen) yaku.push({ name: '自摸', han: 1 });

    // 岭上/海底（简化标记）
    if (opts.rinshan) yaku.push({ name: '嶺上開花', han: 1 });

    return yaku;
  }

  function checkIipeiko(c) {
    for (var s = 0; s < 3; s++) {
      for (var r = 1; r <= 7; r++) {
        var t = s * 9 + r - 1;
        if (c[t] >= 2 && c[t + 1] >= 2 && c[t + 2] >= 2) return true;
      }
    }
    return false;
  }

  /* 计分：返回 {han, points, yakuman} 
   * 赔付表（BET=10时役满750點 → 倍率表）：
   */
  var PAY_TABLE = [
    { han: 1, mult: 3 }, { han: 2, mult: 6 }, { han: 3, mult: 12 },
    { han: 4, mult: 20 }, { han: 5, mult: 30 }, { han: 6, mult: 40 },
    { han: 8, mult: 50 }, { han: 11, mult: 60 }, { han: 13, mult: 75 }
  ];

  function calcScore(han, bet, isYakuman) {
    if (isYakuman) return { han: 13, points: bet * 75, yakuman: true };
    var mult = 2;
    for (var i = 0; i < PAY_TABLE.length; i++) {
      if (han >= PAY_TABLE[i].han) mult = PAY_TABLE[i].mult;
    }
    return { han: han, points: bet * mult, yakuman: false };
  }

  g.SDMG2Yaku = {
    checkYakuman: checkYakuman,
    checkYaku: checkYaku,
    calcScore: calcScore
  };
})(typeof window !== 'undefined' ? window : globalThis);
