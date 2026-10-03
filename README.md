# 超级大满贯 · MAME 街机版（网页版）

网页版 MAME 模拟器：手机触屏点按 / 电脑鼠标点击即玩街机麻将「超级大满贯」。

- 在线体验：https://curzydj8.github.io/super-grand-slam-mame/
- 模拟器核心：EmulatorJS（mame2003 / mame2003-plus），核心文件已自托管在 `web/ejs/`，不依赖外部 CDN

## 使用方法

1. 打开页面，点「选择 ROM 文件」（手机/电脑均可），载入你自己合法拥有的 ROM（zip 格式）
2. 点「投币」→「开始」进入游戏（街机流程）
3. 手机用手指点麻将按键；电脑用鼠标点按或用键盘

ROM 只保存在本机（IndexedDB），不会上传；**本站不提供、不分发任何 ROM**。

## 按键

默认键位（MAME 街机惯例，可在页面「按键设置」里重绑）：

| 按钮 | 默认键 |
|---|---|
| 投币 | 5 |
| 开始 | 1 |
| A–N（麻将面板） | A–N |

如按键无反应：模拟器画面菜单 → Quick Menu → Options → Input Interface 设为 simultaneous 或 keyboard。

## 目录

```
web/
  index.html / css/style.css
  js/keys.js   按键映射（可单测）
  js/app.js    ROM 载入 + 模拟器启动 + 触屏按键
  ejs/data/    EmulatorJS 自托管文件（loader/核心/样式）
test/app.test.js
```

## 本地运行

```bash
cd web && python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 测试

```bash
node test/app.test.js
```
