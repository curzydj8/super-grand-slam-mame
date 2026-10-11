/* WebAudio 合成音效 —— 无需外部文件，街机感
 * 挂 window.Sfx
 */
(function (g) {
  'use strict';

  var ctx = null;
  var enabled = true;

  function ac() {
    if (!ctx) {
      var AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (!enabled) return;
    var c = ac();
    if (!c) return;
    var t = c.currentTime + (when || 0);
    var o = c.createOscillator();
    var gn = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gn.gain.setValueAtTime(vol || 0.12, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(gn);
    gn.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, when, filterFreq) {
    if (!enabled) return;
    var c = ac();
    if (!c) return;
    var t = c.currentTime + (when || 0);
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource();
    src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filterFreq || 2000;
    var gn = c.createGain();
    gn.gain.value = vol || 0.15;
    src.connect(f); f.connect(gn); gn.connect(c.destination);
    src.start(t);
  }

  var Sfx = {
    toggle: function () { enabled = !enabled; return enabled; },
    isEnabled: function () { return enabled; },
    unlock: function () { ac(); }, // 首次用户手势调用

    click: function () { tone(880, 0.06, 'square', 0.08); },
    select: function () { tone(660, 0.07, 'square', 0.1); tone(990, 0.09, 'square', 0.1, 0.07); },
    draw: function () { noise(0.08, 0.10, 0, 3000); },
    discard: function () { tone(440, 0.08, 'triangle', 0.12, 0, 330); noise(0.05, 0.06, 0, 4500); },
    pong: function () { tone(523, 0.1, 'square', 0.12); tone(784, 0.12, 'square', 0.12, 0.09); },
    kong: function () { tone(523, 0.09, 'square', 0.12); tone(659, 0.09, 'square', 0.12, 0.08); tone(784, 0.14, 'square', 0.12, 0.16); },
    chow: function () { tone(587, 0.1, 'square', 0.1); tone(880, 0.1, 'square', 0.1, 0.08); },
    win: function () {
      var seq = [523, 659, 784, 1047, 784, 1047, 1319];
      for (var i = 0; i < seq.length; i++) tone(seq[i], 0.16, 'square', 0.11, i * 0.12);
      noise(0.5, 0.05, 0.2, 6000);
    },
    lose: function () { tone(392, 0.2, 'sawtooth', 0.08, 0, 196); tone(196, 0.35, 'sawtooth', 0.08, 0.18); },
    coin: function () { tone(988, 0.08, 'square', 0.1); tone(1319, 0.25, 'square', 0.1, 0.08); },
    doubleWin: function () { var s = [659, 784, 988, 1175, 1319, 1568]; for (var i = 0; i < s.length; i++) tone(s[i], 0.12, 'square', 0.11, i * 0.09); },
    deal: function () { for (var i = 0; i < 4; i++) noise(0.06, 0.08, i * 0.09, 2500); }
  };

  g.Sfx = Sfx;
})(typeof window !== 'undefined' ? window : globalThis);
