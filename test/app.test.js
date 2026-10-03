/* 超级大满贯 MAME 网页版 · 单元测试（Node） */
global.window = {};
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};
const Keys = require("../web/js/keys.js");
const App = require("../web/js/app.js");

let pass = 0, fail = 0;
function eq(a, b, name) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa === sb) pass++;
  else { fail++; console.log("FAIL", name, "\n  got :", sa, "\n  want:", sb); }
}
function ok(c, name) { eq(!!c, true, name); }

// 1. 按钮与默认键位一一对应
const ids = Keys.BUTTONS.map(b => b.id);
eq(ids.length, 16, "16 个按钮（投币/开始/A-N）");
ok(ids.every(id => Keys.DEFAULT_KEYS[id]), "每个按钮都有默认键位");
eq(new Set(ids).size, ids.length, "按钮 id 无重复");

// 2. keyLabel
eq(Keys.keyLabel("Digit5"), "5", "Digit5 → 5");
eq(Keys.keyLabel("KeyA"), "A", "KeyA → A");
eq(Keys.keyLabel("Space"), "空格", "Space → 空格");
eq(Keys.keyLabel("ArrowUp"), "↑", "方向键显示箭头");
eq(Keys.keyLabel("Enter"), "Enter", "Enter 保持");

// 3. isValidCode
ok(Keys.isValidCode("KeyQ"), "KeyQ 合法");
ok(Keys.isValidCode("F12"), "F12 合法");
ok(!Keys.isValidCode("javascript:alert(1)"), "伪协议非法");
ok(!Keys.isValidCode(""), "空串非法");
ok(!Keys.isValidCode("KeyAA"), "KeyAA 非法");

// 4. mergeKeymap：非法值丢弃、合法覆盖
const merged = Keys.mergeKeymap({ a: "KeyQ", b: "nope", zzz: "KeyZ" });
eq(merged.a, "KeyQ", "合法覆盖生效");
eq(merged.b, "KeyB", "非法值被丢弃");
eq(merged.zzz, undefined, "未知按钮被忽略");

// 5. load/save/reset 回环
Keys.saveKeymap({ coin: "Enter", start: "Digit1" });
const loaded = Keys.loadKeymap();
eq(loaded.coin, "Enter", "保存后可读回");
eq(loaded.a, "KeyA", "未改动的保持默认");
Keys.resetKeymap();
eq(Keys.loadKeymap().coin, "Digit5", "reset 恢复默认");

// 6. App 纯函数
eq(App.codeToKey("Digit5"), "5", "codeToKey 数字");
eq(App.codeToKey("KeyA"), "a", "codeToKey 字母小写");
eq(App.codeToKey("Space"), " ", "codeToKey 空格");
eq(App.fmtSize(0), "1 KB", "fmtSize 0 显示为 1 KB");
eq(App.fmtSize(1536), "2 KB", "fmtSize KB");
eq(App.fmtSize(5242880), "5.0 MB", "fmtSize MB");

// 7. sendKey 构造的事件能被 document 监听到
global.KeyboardEvent = function (type, init) {
  this.type = type;
  Object.assign(this, init);
};
let seen = [];
global.document = {
  dispatched: [],
  dispatchEvent(ev) { this.dispatched.push(ev); return true; },
};
App.sendKey("KeyA", true);
App.sendKey("KeyA", false);
eq(global.document.dispatched.map(e => e.type), ["keydown", "keyup"], "keydown/keyup 成对发出");
eq(global.document.dispatched[0].code, "KeyA", "code 正确");
ok(global.document.dispatched[0].bubbles, "bubbles 为 true（document→window 冒泡）");
delete global.document;

console.log(`sgm-mame: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
