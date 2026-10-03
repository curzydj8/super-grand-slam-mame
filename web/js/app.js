/* 超级大满贯 MAME 网页版 · app.js
 * ROM 载入（文件/URL/IndexedDB 缓存）+ EmulatorJS 启动 + 触屏/鼠标麻将按键。
 */
(() => {
"use strict";

const NS = (window.SGM = window.SGM || {});
const $ = id => document.getElementById(id);

/* ---------------- IndexedDB：ROM 本地缓存（只存本机） ---------------- */
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

/* ---------------- 模拟器启动 ---------------- */
let booted = false;
function bootEmulator({ core, gameUrl, gameName }) {
  if (booted) return;
  booted = true;
  $("rom-screen").hidden = true;
  $("game-screen").hidden = false;
  window.EJS_player = "#game";
  window.EJS_core = core;
  window.EJS_gameUrl = gameUrl;
  window.EJS_pathtodata = "ejs/data/";
  window.EJS_gameName = gameName || "超级大满贯";
  window.EJS_startOnLoaded = true;
  const s = document.createElement("script");
  s.src = "ejs/data/loader.js";
  s.onerror = () => { $("emu-status").textContent = "模拟器文件加载失败，请检查网络后刷新重试。"; };
  document.body.appendChild(s);
  window.scrollTo(0, 0);
}

/* ---------------- 按键面板 ---------------- */
let keymap = NS.Keys.loadKeymap();
let rebindMode = false;
let rebindTarget = null;

function buildPanel() {
  const panel = $("pad");
  panel.innerHTML = "";
  for (const b of NS.Keys.BUTTONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pad-btn " + b.group;
    btn.dataset.bid = b.id;
    btn.innerHTML = `<span class="pad-label">${b.label}</span><span class="pad-key">${NS.Keys.keyLabel(keymap[b.id])}</span>`;
    panel.appendChild(btn);
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
  document.querySelectorAll(".pad-btn").forEach(el => el.classList.toggle("arming", on));
}

/* 面板事件：pointerdown 发 keydown，pointerup/cancel/leave 发 keyup */
function bindPanel() {
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
      $("rebind-hint").textContent = `请按下键盘上的按键，绑定「${btn.querySelector(".pad-label").textContent}」（Esc 取消）`;
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

/* ---------------- 全屏 ---------------- */
function toggleFullscreen() {
  const wrap = $("game-wrap");
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (wrap.requestFullscreen) {
    wrap.requestFullscreen();
  } else if (wrap.webkitRequestFullscreen) {
    wrap.webkitRequestFullscreen();
  }
}

/* ---------------- 启动流程 ---------------- */
function fmtSize(n) {
  if (!n && n !== 0) return "";
  return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
}

async function refreshCacheUI() {
  const box = $("cache-info");
  try {
    const rec = await IDB.load();
    if (rec) {
      box.innerHTML = `已缓存：<b>${rec.name}</b>（${fmtSize(rec.data.byteLength)}）` +
        ` <button class="btn small" id="btn-start-cached">开始游戏</button>` +
        ` <button class="btn small ghost" id="btn-clear-cache">清除缓存</button>`;
      $("btn-start-cached").onclick = () => startFromCache();
      $("btn-clear-cache").onclick = async () => {
        await IDB.clear();
        sessionStorage.removeItem("sgm.autoboot");
        refreshCacheUI();
      };
    } else {
      box.innerHTML = `<span class="muted">还没有缓存的 ROM。首次载入后会自动保存在本机，下次一点即玩。</span>`;
    }
  } catch (e) {
    box.innerHTML = `<span class="muted">浏览器不支持本地缓存，每次需要重新选择 ROM。</span>`;
  }
}

function selectedCore() {
  const el = document.querySelector('input[name="core"]:checked');
  return el ? el.value : "mame2003";
}

async function startFromCache() {
  const rec = await IDB.load();
  if (!rec) return;
  const url = URL.createObjectURL(new Blob([rec.data], { type: "application/zip" }));
  sessionStorage.setItem("sgm.autoboot", JSON.stringify({ core: selectedCore(), name: rec.name }));
  bootEmulator({ core: selectedCore(), gameUrl: url, gameName: rec.name.replace(/\.zip$/i, "") });
}

function bindRomScreen() {
  $("rom-file").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    $("rom-status").textContent = "正在读取 " + f.name + "…";
    try {
      const buf = await f.arrayBuffer();
      try { await IDB.save(f.name, buf); } catch (_e) {}
      const url = URL.createObjectURL(new Blob([buf], { type: "application/zip" }));
      sessionStorage.setItem("sgm.autoboot", JSON.stringify({ core: selectedCore(), name: f.name }));
      bootEmulator({ core: selectedCore(), gameUrl: url, gameName: f.name.replace(/\.zip$/i, "") });
    } catch (err) {
      $("rom-status").textContent = "读取失败：" + err.message;
    }
    e.target.value = "";
  });
  $("btn-url").addEventListener("click", () => {
    const url = $("rom-url").value.trim();
    if (!url) { $("rom-status").textContent = "请先填写 ROM 地址。"; return; }
    sessionStorage.setItem("sgm.autoboot", JSON.stringify({ core: selectedCore(), name: "url-rom" }));
    bootEmulator({ core: selectedCore(), gameUrl: url, gameName: "超级大满贯" });
  });
}

function bindGameScreen() {
  $("btn-fullscreen").addEventListener("click", toggleFullscreen);
  $("btn-rebind").addEventListener("click", () => setRebindMode(!rebindMode));
  $("btn-reset-keys").addEventListener("click", () => {
    keymap = NS.Keys.resetKeymap();
    buildPanel();
  });
  $("btn-change-rom").addEventListener("click", () => {
    sessionStorage.removeItem("sgm.autoboot");
    location.reload();
  });
}

/* ---------------- 入口 ---------------- */
async function init() {
  buildPanel();
  bindPanel();
  bindRomScreen();
  bindGameScreen();
  await refreshCacheUI();
  /* 更换 ROM 后的自动续玩 */
  const auto = sessionStorage.getItem("sgm.autoboot");
  if (auto && !booted) {
    try {
      const { core, name } = JSON.parse(auto);
      const rec = await IDB.load();
      if (rec) {
        const url = URL.createObjectURL(new Blob([rec.data], { type: "application/zip" }));
        const coreEl = document.querySelector(`input[name="core"][value="${core}"]`);
        if (coreEl) coreEl.checked = true;
        bootEmulator({ core: core || "mame2003", gameUrl: url, gameName: (name || "sgm").replace(/\.zip$/i, "") });
      }
    } catch (e) {}
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}

NS.App = { IDB, sendKey, codeToKey, bootEmulator, fmtSize, selectedCore: null };

if (typeof module !== "undefined") module.exports = NS.App;
})();
