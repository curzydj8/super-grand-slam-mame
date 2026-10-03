/* 超级大满贯II (sdmg2) · app.js
 * 云端 ROM 自动载入 + 点按进入（全屏+横屏）+ EmulatorJS 启动 + 触屏/鼠标麻将按键。
 */
(() => {
"use strict";

const NS = (window.SGM = window.SGM || {});
const $ = id => document.getElementById(id);

/* 云端 ROM：随页面一起部署，用户打开即用，无需自己传 ROM */
const CLOUD_ROM_URL = "roms/sdmg2.zip";
const CLOUD_ROM_NAME = "sdmg2";

/* ---------------- IndexedDB：手动载入的 ROM 本地缓存（只存本机） ---------------- */
const IDB = {
  DB: "sgm-mame", STORE: "roms", KEY: "last",
  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(this.STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async save(name, buf) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).put({ name, data: buf, at: Date.now() }, this.KEY);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  },
  async load() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readonly");
      const req = tx.objectStore(this.STORE).get(this.KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  async clear() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).delete(this.KEY);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  },
};

/* ---------------- 按键 → 合成键盘事件 ---------------- */
function codeToKey(code) {
  const d = /^Digit(\d)$/.exec(code); if (d) return d[1];
  const k = /^Key([A-Z])$/.exec(code); if (k) return k[1].toLowerCase();
  if (code === "Space") return " ";
  return code;
}
function sendKey(code, down) {
  const init = { code, key: codeToKey(code), bubbles: true, cancelable: true };
  document.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", init));
}

/* ---------------- 全屏 + 横屏 ---------------- */
async function enterFullscreenLandscape() {
  const wrap = $("game-wrap");
  try {
    if (document.fullscreenElement) { /* 已在全屏 */ }
    else if (wrap.requestFullscreen) await wrap.requestFullscreen();
    else if (wrap.webkitRequestFullscreen) await wrap.webkitRequestFullscreen();
  } catch (e) { /* 用户拒绝或不支持：继续 */ }
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape");
    }
  } catch (e) { /* iOS 等不支持横屏锁定：继续 */ }
}
function toggleFullscreen() {
  const wrap = $("game-wrap");
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
  } else {
    enterFullscreenLandscape();
  }
}

/* ---------------- 模拟器启动 ---------------- */
let booted = false;
function bootEmulator({ core, gameUrl, gameName }) {
  if (booted) return;
  booted = true;
  window.EJS_player = "#game";
  window.EJS_core = core;
  window.EJS_gameUrl = gameUrl;
  window.EJS_pathtodata = "ejs/data/";
  window.EJS_gameName = gameName || "超级大满贯II";
  window.EJS_startOnLoaded = true;
  const s = document.createElement("script");
  s.src = "ejs/data/loader.js";
  s.onerror = () => { $("emu-status").textContent = "模拟器文件加载失败，请检查网络后刷新重试。"; };
  document.body.appendChild(s);
  window.scrollTo(0, 0);
}

/* 点按进入：隐藏封面 → 全屏横屏 → 从云端自动载入 ROM 启动 */
async function enterGame() {
  if (booted) return;
  $("enter-overlay").hidden = true;
  $("game-screen").hidden = false;
  buildPanel();
  bindPanel();
  await enterFullscreenLandscape();
  bootEmulator({ core: selectedCore(), gameUrl: CLOUD_ROM_URL, gameName: CLOUD_ROM_NAME });
}

/* ---------------- 按键面板（按 系统/牌鍵/功能 分组） ---------------- */
let keymap = NS.Keys.loadKeymap();
let rebindMode = false;
let rebindTarget = null;
let panelBound = false;

function buildPanel() {
  const panel = $("pad");
  panel.innerHTML = "";
  const groups = {};
  for (const b of NS.Keys.BUTTONS) {
    (groups[b.group] = groups[b.group] || []).push(b);
  }
  for (const g of ["sys", "mj", "fn"]) {
    if (!groups[g]) continue;
    const sec = document.createElement("div");
    sec.className = "pad-group pad-group-" + g;
    const h = document.createElement("div");
    h.className = "pad-group-title";
    h.textContent = NS.Keys.GROUP_NAMES[g];
    sec.appendChild(h);
    const grid = document.createElement("div");
    grid.className = "pad-grid";
    for (const b of groups[g]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pad-btn " + b.group;
      btn.dataset.bid = b.id;
      const lab = document.createElement("span");
      lab.className = "pad-label";
      lab.textContent = b.label;
      const key = document.createElement("span");
      key.className = "pad-key";
      key.textContent = NS.Keys.keyLabel(keymap[b.id]);
      btn.appendChild(lab);
      btn.appendChild(key);
      grid.appendChild(btn);
    }
    sec.appendChild(grid);
    panel.appendChild(sec);
  }
  refreshHelpTable();
}

function refreshHelpTable() {
  const tb = $("key-table");
  if (!tb) return;
  tb.innerHTML = NS.Keys.BUTTONS.map(b =>
    `<tr><td>${b.label}</td><td class="mono">${NS.Keys.keyLabel(keymap[b.id])}</td></tr>`).join("");
}

function setRebindMode(on) {
  rebindMode = on;
  rebindTarget = null;
  $("btn-rebind").classList.toggle("on", on);
  $("rebind-hint").hidden = !on;
  if (on) $("rebind-hint").textContent = "点一个按钮，再按键盘上的按键进行绑定（Esc 取消）";
  document.querySelectorAll(".pad-btn").forEach(el => el.classList.toggle("arming", on));
}

/* 面板事件：pointerdown 发 keydown，pointerup/cancel/leave 发 keyup */
function bindPanel() {
  if (panelBound) return;
  panelBound = true;
  const panel = $("pad");
  const down = e => {
    const btn = e.target.closest(".pad-btn");
    if (!btn) return;
    e.preventDefault();
    const bid = btn.dataset.bid;
    if (rebindMode) {
      rebindTarget = bid;
      document.querySelectorAll(".pad-btn").forEach(el => el.classList.remove("waiting"));
      btn.classList.add("waiting");
      const label = btn.querySelector(".pad-label").textContent;
      $("rebind-hint").textContent = `请按下键盘上的按键，绑定「${label}」（Esc 取消）`;
      return;
    }
    btn.classList.add("pressed");
    try { btn.setPointerCapture(e.pointerId); } catch (_e) {}
    sendKey(keymap[bid], true);
  };
  const up = e => {
    const btn = e.target.closest(".pad-btn");
    if (!btn || rebindMode) return;
    btn.classList.remove("pressed");
    sendKey(keymap[btn.dataset.bid], false);
  };
  panel.addEventListener("pointerdown", down);
  panel.addEventListener("pointerup", up);
  panel.addEventListener("pointercancel", up);
  panel.addEventListener("lostpointercapture", up);
  panel.addEventListener("contextmenu", e => e.preventDefault());

  /* 重绑定：捕获真实键盘 */
  document.addEventListener("keydown", e => {
    if (!rebindMode || !rebindTarget) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.code === "Escape") { setRebindMode(false); return; }
    if (!NS.Keys.isValidCode(e.code)) {
      $("rebind-hint").textContent = "该按键不支持，请换一个（Esc 取消）";
      return;
    }
    keymap[rebindTarget] = e.code;
    NS.Keys.saveKeymap(keymap);
    buildPanel();
    setRebindMode(false);
  }, true);
}

/* ---------------- 手动 ROM 兜底（云端 ROM 载入失败时用） ---------------- */
function selectedCore() {
  const el = document.querySelector('input[name="core"]:checked');
  return el ? el.value : "mame2003_plus";
}

function bindFallback() {
  $("rom-file").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    $("rom-status").textContent = "正在读取 " + f.name + "…";
    try {
      const buf = await f.arrayBuffer();
      try { await IDB.save(f.name, buf); } catch (_e) {}
      const url = URL.createObjectURL(new Blob([buf], { type: "application/zip" }));
      bootEmulator({ core: selectedCore(), gameUrl: url, gameName: f.name.replace(/\.zip$/i, "") });
      $("rom-status").textContent = "";
    } catch (err) {
      $("rom-status").textContent = "读取失败：" + err.message;
    }
    e.target.value = "";
  });
  $("btn-url").addEventListener("click", () => {
    const url = $("rom-url").value.trim();
    if (!url) { $("rom-status").textContent = "请先填写 ROM 地址。"; return; }
    bootEmulator({ core: selectedCore(), gameUrl: url, gameName: "手动载入" });
  });
}

function bindGameScreen() {
  $("btn-enter").addEventListener("click", enterGame);
  $("btn-fullscreen").addEventListener("click", toggleFullscreen);
  $("btn-rebind").addEventListener("click", () => setRebindMode(!rebindMode));
  $("btn-reset-keys").addEventListener("click", () => {
    keymap = NS.Keys.resetKeymap();
    buildPanel();
  });
}

/* ---------------- 入口 ---------------- */
function init() {
  bindGameScreen();
  bindFallback();
  refreshHelpTable();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}

NS.App = { IDB, sendKey, codeToKey, bootEmulator, enterGame, enterFullscreenLandscape, selectedCore, CLOUD_ROM_URL, CLOUD_ROM_NAME };

if (typeof module !== "undefined") module.exports = NS.App;
})();
