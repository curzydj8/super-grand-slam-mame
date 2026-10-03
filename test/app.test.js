/* 超级大满贯II (sdmg2) · 单元测试（Node） */
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

// 1. 按钮与默认键位一一对应（29 个：4 系统 + 14 牌键 + 11 功能）
const ids = Keys.BUTTONS.map(b => b.id);
eq(ids.length, 29, "29 个按钮（系统4/牌键14/功能11）");
ok(ids.every(id => Keys.DEFAULT_KEYS[id]), "每个按钮都有默认键位");
eq(new Set(ids).size, ids.length, "按钮 id 无重复");
eq(Keys.BUTTONS.filter(b => b.group === "sys").length, 4, "系统组 4 个");
eq(Keys.BUTTONS.filter(b => b.group === "mj").length, 14, "牌键组 14 个");
eq(Keys.BUTTONS.filter(b => b.group === "fn").length, 11, "功能组 11 个");
ok(["coin","start","payout","book"].every(id => ids.includes(id)), "系统键齐全");
ok(["chi","pon","kan","reach","ron","bet","doubleup","big","small","lastchance","score"].every(id => ids.includes(id)), "功能键齐全");
eq(Object.keys(Keys.GROUP_NAMES).sort(), ["fn","mj","sys"], "分组名齐全");

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
const merged = Keys.mergeKeymap({ a: "KeyQ", chi: "nope", zzz: "KeyZ" });
eq(merged.a, "KeyQ", "合法覆盖生效");
eq(merged.chi, "KeyQ", "非法值被丢弃");
eq(merged.zzz, undefined, "未知按钮被忽略");

// 5. load/save/reset 回环
Keys.saveKeymap({ coin: "Enter", start: "Digit1" });
const loaded = Keys.loadKeymap();
eq(loaded.coin, "Enter", "保存后可读回");
eq(loaded.a, "KeyA", "未改动的保持默认");
Keys.resetKeymap();
eq(Keys.loadKeymap().coin, "Digit5", "reset 恢复默认");

// 6. App 纯函数与云端 ROM 配置
eq(App.codeToKey("Digit5"), "5", "codeToKey 数字");
eq(App.codeToKey("KeyA"), "a", "codeToKey 字母小写");
eq(App.codeToKey("Space"), " ", "codeToKey 空格");
eq(App.CLOUD_ROM_URL, "roms/sdmg2.zip", "云端 ROM 地址");
eq(App.CLOUD_ROM_NAME, "sdmg2", "云端 ROM 名（MAME 短名）");
ok(typeof App.enterGame === "function", "enterGame 导出");
ok(typeof App.enterFullscreenLandscape === "function", "enterFullscreenLandscape 导出");

// 7. sendKey 构造的事件能被 document 监听到
global.KeyboardEvent = function (type, init) {
  this.type = type;
  Object.assign(this, init);
};
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
