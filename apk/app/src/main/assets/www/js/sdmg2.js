/* 超級大滿貫II · 双人日式麻将引擎
 * 原版考据（2026-10-04 实机视频）：
 * - 双人对战：玩家（底部14张） vs CPU（左侧）
 * - 136张牌，日式 13+1=14 张手牌
 * - 轮流摸打，可吃/碰/槓/胡
 * - 日式役种 + 役满体系
 * 编码：0-8萬 9-17筒 18-26索 27東28南29西30北31白32發33中
 */
(function (g) {
  'use strict';

  var T = {
    MAN: 0, PIN: 9, SOU: 18,
    TON: 27, NAN: 28, SHA: 29, PEI: 30,
    HAKU: 31, HATSU: 32, CHUN: 33
  };

  function newWall() {
    var w = [];
    for (var t = 0; t < 34; t++)
      for (var i = 0; i < 4; i++) w.push(t);
    // Fisher-Yates
    for (var i = w.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = w[i]; w[i] = w[j]; w[j] = tmp;
    }
    return w;
  }

  function suit(t) { return t < 9 ? 0 : t < 18 ? 1 : t < 27 ? 2 : 3; }
  function rank(t) { return (t % 9) + 1; }
  function isHonor(t) { return t >= 27; }
  function isTerminal(t) { return !isHonor(t) && (rank(t) === 1 || rank(t) === 9); }

  function counts(hand) {
    var c = new Array(34).fill(0);
    for (var i = 0; i < hand.length; i++) c[hand[i]]++;
    return c;
  }

  /* 标准和牌判定：4面子+1雀头 / 七对 / 国士无双
   * hand: 14张数组；返回 {win, melds:[{type,tiles}], pair} 或 null
   */
  function checkWin(hand) {
    if (hand.length !== 14) return null;
    // 国士无双
    var kokushi = checkKokushi(hand);
    if (kokushi) return kokushi;
    // 七对子
    var pairs7 = checkSevenPairs(hand);
    if (pairs7) return pairs7;
    // 标准型
    return checkStandard(hand);
  }

  function checkKokushi(hand) {
    var terminals = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
    var c = counts(hand);
    var pairFound = false;
    for (var i = 0; i < terminals.length; i++) {
      var t = terminals[i];
      if (c[t] === 0) return null;
      if (c[t] === 2) {
        if (pairFound) return null;
        pairFound = true;
      } else if (c[t] !== 1) return null;
    }
    // 其他牌不能有
    for (var t = 0; t < 34; t++) {
      if (terminals.indexOf(t) < 0 && c[t] > 0) return null;
    }
    return { win: true, yakuman: 'kokushi', melds: [], pair: -1, special: 'kokushi' };
  }

  function checkSevenPairs(hand) {
    var c = counts(hand);
    var pairCount = 0;
    for (var t = 0; t < 34; t++) {
      if (c[t] === 2) pairCount++;
      else if (c[t] !== 0) return null;
    }
    if (pairCount !== 7) return null;
    return { win: true, melds: [], pair: -1, special: 'sevenpairs' };
  }

  function checkStandard(hand) {
    var c = counts(hand);
    // 枚举雀头
    for (var p = 0; p < 34; p++) {
      if (c[p] < 2) continue;
      c[p] -= 2;
      var melds = [];
      if (extractMelds(c, melds)) {
        c[p] += 2;
        return { win: true, melds: melds, pair: p, special: null };
      }
      c[p] += 2;
    }
    return null;
  }

  function extractMelds(c, melds) {
    for (var t = 0; t < 34; t++) {
      if (c[t] === 0) continue;
      // 刻子
      if (c[t] >= 3) {
        c[t] -= 3;
        melds.push({ type: 'pon', tiles: [t, t, t] });
        if (extractMelds(c, melds)) return true;
        melds.pop();
        c[t] += 3;
      }
      // 顺子
      if (suit(t) < 3 && rank(t) <= 7) {
        if (c[t + 1] > 0 && c[t + 2] > 0) {
          c[t]--; c[t + 1]--; c[t + 2]--;
          melds.push({ type: 'chi', tiles: [t, t + 1, t + 2] });
          if (extractMelds(c, melds)) return true;
          melds.pop();
          c[t]++; c[t + 1]++; c[t + 2]++;
        }
      }
      return false;
    }
    return true;
  }

  /* 向听数（简化版，用于CPU AI） */
  function shanten(hand) {
    if (hand.length % 3 !== 1) return 8;
    var c = counts(hand);
    var best = 8;
    // 标准型向听
    best = Math.min(best, shantenStandard(c));
    // 七对向听
    var pairs = 0, kinds = 0;
    for (var t = 0; t < 34; t++) {
      if (c[t] >= 2) pairs++;
      if (c[t] >= 1) kinds++;
    }
    best = Math.min(best, 7 - pairs + Math.max(0, 7 - kinds));
    // 国士向听
    var terminals = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
    var tk = 0, tp = false;
    for (var i = 0; i < terminals.length; i++) {
      if (c[terminals[i]] > 0) tk++;
      if (c[terminals[i]] >= 2) tp = true;
    }
    best = Math.min(best, 13 - tk - (tp ? 1 : 0));
    return best;
  }

  function shantenStandard(c) {
    var best = 8;
    function dfs(pos, melds, pairs, taatsu) {
      while (pos < 34 && c[pos] === 0) pos++;
      if (pos >= 34) {
        var s = 8 - melds * 2 - taatsu - pairs;
        if (s < best) best = s;
        return;
      }
      // 刻子
      if (c[pos] >= 3) {
        c[pos] -= 3; dfs(pos, melds + 1, pairs, taatsu); c[pos] += 3;
      }
      // 顺子
      if (suit(pos) < 3 && rank(pos) <= 7 && c[pos + 1] > 0 && c[pos + 2] > 0) {
        c[pos]--; c[pos + 1]--; c[pos + 2]--;
        dfs(pos, melds + 1, pairs, taatsu);
        c[pos]++; c[pos + 1]++; c[pos + 2]++;
      }
      // 雀头
      if (pairs === 0 && c[pos] >= 2) {
        c[pos] -= 2; dfs(pos, melds, 1, taatsu); c[pos] += 2;
      }
      // 搭子（两面/边张）
      if (suit(pos) < 3 && rank(pos) <= 8 && c[pos + 1] > 0) {
        c[pos]--; c[pos + 1]--; dfs(pos, melds, pairs, taatsu + 1); c[pos]++; c[pos + 1]++;
      }
      if (suit(pos) < 3 && rank(pos) <= 7 && c[pos + 2] > 0) {
        c[pos]--; c[pos + 2]--; dfs(pos, melds, pairs, taatsu + 1); c[pos]++; c[pos + 2]++;
      }
      // 对子搭子
      if (c[pos] >= 2) {
        c[pos] -= 2; dfs(pos, melds, pairs, taatsu + 1); c[pos] += 2;
      }
      // 丢弃
      c[pos]--; dfs(pos + 1, melds, pairs, taatsu); c[pos]++;
    }
    dfs(0, 0, 0, 0);
    return best;
  }

  /* 吃碰槓判定 */
  function canPon(hand, discard) {
    var n = 0;
    for (var i = 0; i < hand.length; i++) if (hand[i] === discard) n++;
    return n >= 2;
  }

  function canKan(hand, discard) {
    var n = 0;
    for (var i = 0; i < hand.length; i++) if (hand[i] === discard) n++;
    return n >= 3;
  }

  function canChi(hand, discard) {
    if (suit(discard) === 3) return [];
    var r = rank(discard), s = suit(discard), base = s * 9;
    var has = function (t) { return hand.indexOf(t) >= 0; };
    var opts = [];
    if (r >= 3 && has(base + r - 3) && has(base + r - 2))
      opts.push([base + r - 3, base + r - 2]);
    if (r >= 2 && r <= 8 && has(base + r - 2) && has(base + r))
      opts.push([base + r - 2, base + r]);
    if (r <= 7 && has(base + r) && has(base + r + 1))
      opts.push([base + r, base + r + 1]);
    return opts;
  }

  /* CPU AI：选一张打出的牌（打向听数最低、进张最广的） */
  function aiDiscard(hand) {
    var best = -1, bestScore = 999;
    var tried = {};
    for (var i = 0; i < hand.length; i++) {
      var t = hand[i];
      if (tried[t]) continue;
      tried[t] = true;
      var rest = hand.slice();
      rest.splice(i, 1);
      var s = shanten(rest);
      // 进张数：能让向听下降的牌种类数
      var ukeire = 0;
      if (s > 0) {
        var c = counts(rest);
        for (var u = 0; u < 34; u++) {
          if (c[u] >= 4) continue;
          c[u]++;
          var rs = rest.concat([u]);
          if (shanten(rs) < s) ukeire += (4 - (c[u] - 1));
          c[u]--;
        }
      }
      // 优先打孤张字牌/幺九
      var bonus = 0;
      var cnt = 0;
      for (var j = 0; j < rest.length; j++) if (rest[j] === t) cnt++;
      if (cnt === 0) {
        if (isHonor(t)) bonus = -2;
        else if (isTerminal(t)) bonus = -1;
      }
      var score = s * 100 - ukeire + bonus;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  g.SDMG2Engine = {
    T: T, newWall: newWall,
    suit: suit, rank: rank, isHonor: isHonor, isTerminal: isTerminal,
    counts: counts, checkWin: checkWin, shanten: shanten,
    canPon: canPon, canKan: canKan, canChi: canChi,
    aiDiscard: aiDiscard
  };
})(typeof window !== 'undefined' ? window : globalThis);
