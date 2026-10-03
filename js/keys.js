/* 超级大满贯II (sdmg2) · keys.js
 * 按键映射纯逻辑：默认键位、键名显示、重绑定校验。Node 可直接 require 单测。
 * 按键布局依据 MAME igs017.cpp 中 sdmg2 的真实输入定义：
 *   系统：投幣 / 開始 / 退幣 / 查帳
 *   牌鍵：A-N（14）
 *   功能：吃 / 碰 / 槓 / 聽 / 胡 / 押注 / 比倍 / 大 / 小 / 海底 / 得分（11）
 */
(() => {
"use strict";

const NS = (window.SGM = window.SGM || {});

/* 按钮定义：id / 显示名 / 分组（sys=系统, mj=牌键, fn=功能） */
const BUTTONS = [
  { id: "coin",   label: "投幣", group: "sys" },
  { id: "start",  label: "開始", group: "sys" },
  { id: "payout", label: "退幣", group: "sys" },
  { id: "book",   label: "查帳", group: "sys" },
  { id: "a", label: "A", group: "mj" },
  { id: "b", label: "B", group: "mj" },
  { id: "c", label: "C", group: "mj" },
  { id: "d", label: "D", group: "mj" },
  { id: "e", label: "E", group: "mj" },
  { id: "f", label: "F", group: "mj" },
  { id: "g", label: "G", group: "mj" },
  { id: "h", label: "H", group: "mj" },
  { id: "i", label: "I", group: "mj" },
  { id: "j", label: "J", group: "mj" },
  { id: "k", label: "K", group: "mj" },
  { id: "l", label: "L", group: "mj" },
  { id: "m", label: "M", group: "mj" },
  { id: "n", label: "N", group: "mj" },
  { id: "chi",        label: "吃",   group: "fn" },
  { id: "pon",        label: "碰",   group: "fn" },
  { id: "kan",        label: "槓",   group: "fn" },
  { id: "reach",      label: "聽",   group: "fn" },
  { id: "ron",        label: "胡",   group: "fn" },
  { id: "bet",        label: "押注", group: "fn" },
  { id: "doubleup",   label: "比倍", group: "fn" },
  { id: "big",        label: "大",   group: "fn" },
  { id: "small",      label: "小",   group: "fn" },
  { id: "lastchance", label: "海底", group: "fn" },
  { id: "score",      label: "得分", group: "fn" },
];

const GROUP_NAMES = { sys: "系統", mj: "牌鍵", fn: "功能" };

/* 默认键位（KeyboardEvent.code）：MAME 街机默认投币=5、开始=1 */
const DEFAULT_KEYS = {
  coin: "Digit5", start: "Digit1", payout: "Digit6", book: "Digit0",
  a: "KeyA", b: "KeyB", c: "KeyC", d: "KeyD", e: "KeyE", f: "KeyF", g: "KeyG",
  h: "KeyH", i: "KeyI", j: "KeyJ", k: "KeyK", l: "KeyL", m: "KeyM", n: "KeyN",
  chi: "KeyQ", pon: "KeyW", kan: "KeyR", reach: "KeyT", ron: "KeyY",
  bet: "KeyU", doubleup: "KeyP", big: "KeyZ", small: "KeyX",
  lastchance: "KeyV", score: "KeyO",
};

const LS_KEYMAP = "sgm.keymap.v2";

/* code → 可读键名：Digit5→5，KeyA→A，其余原样 */
function keyLabel(code) {
  if (!code) return "";
  let m = /^Digit(\d)$/.exec(code);
  if (m) return m[1];
  m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1];
  const pretty = {
    Enter: "Enter", Space: "空格", Tab: "Tab", ShiftLeft: "左Shift", ShiftRight: "右Shift",
    ControlLeft: "左Ctrl", ControlRight: "右Ctrl", AltLeft: "左Alt", AltRight: "右Alt",
    ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
  };
  return pretty[code] || code;
}

/* 校验：必须是合法的 KeyboardEvent.code（字母/数字/常用功能键） */
function isValidCode(code) {
  return typeof code === "string" &&
    /^(Digit\d|Key[A-Z]|Numpad\d|F\d{1,2}|Enter|Space|Tab|ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(code);
}

/* 合并：用户自定义覆盖默认，非法值丢弃 */
function mergeKeymap(saved) {
  const out = Object.assign({}, DEFAULT_KEYS);
  if (saved && typeof saved === "object") {
    for (const b of BUTTONS) {
      if (isValidCode(saved[b.id])) out[b.id] = saved[b.id];
    }
  }
  return out;
}

function loadKeymap() {
  try {
    const raw = localStorage.getItem(LS_KEYMAP);
    return mergeKeymap(raw ? JSON.parse(raw) : null);
  } catch (e) {
    return mergeKeymap(null);
  }
}
function saveKeymap(map) {
  try { localStorage.setItem(LS_KEYMAP, JSON.stringify(map)); } catch (e) {}
}
function resetKeymap() {
  try { localStorage.removeItem(LS_KEYMAP); } catch (e) {}
  return mergeKeymap(null);
}

NS.Keys = { BUTTONS, GROUP_NAMES, DEFAULT_KEYS, LS_KEYMAP, keyLabel, isValidCode, mergeKeymap, loadKeymap, saveKeymap, resetKeymap };

if (typeof module !== "undefined") module.exports = NS.Keys;
})();
