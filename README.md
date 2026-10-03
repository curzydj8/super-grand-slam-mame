# 超级大满贯II · MAME 街机版（网页版）

网页版 MAME 模拟器：超級大滿貫II（Chaoji Da Manguan II / sdmg2，IGS 1997）。

- 在线体验：https://curzydj8.github.io/super-grand-slam-mame/
- 模拟器核心：EmulatorJS（mame2003-plus / mame2003），核心文件已自托管在 `ejs/`，不依赖外部 CDN
- ROM：`roms/sdmg2.zip`（MAME 短名 sdmg2，各文件 CRC 已校验），随页面部署在云端，打开即自动载入，无需手动上传

## 使用方法

1. 打开页面，点「点击进入游戏」→ 自动全屏 + 横屏，ROM 从云端自动载入
2. 点「投幣」→「開始」进入游戏（街机流程）
3. 手机用手指点按键；电脑用鼠标点按或用键盘

## 按键

按键布局依据 MAME `igs017.cpp` 中 sdmg2 的真实输入定义（可在页面「按键设置」里重绑）：

| 分组 | 按钮 |
|---|---|
| 系統 | 投幣（5）、開始（1）、退幣（6）、查帳（0） |
| 牌鍵 | A–N |
| 功能 | 吃（Q）、碰（W）、槓（R）、聽（T）、胡（Y）、押注（U）、比倍（P）、大（Z）、小（X）、海底（V）、得分（O） |

如按键无反应：模拟器画面菜单 → Quick Menu → Options → Input Interface 设为 simultaneous 或 keyboard。

## 已知限制

超级大满贯II 是 IGS017 基板（1997），需要 MAME 0.131+ 的驱动；当前内嵌的 mame2003（0.78）/ mame2003-plus 核心暂不支持该驱动。
本页面已备好云端 ROM 与完整按键映射，待有支持的网页核心即可直接游玩。

## 目录

```
index.html      页面（点按进入 → 全屏横屏 → 自动载入云端 ROM）
css/            样式
js/             按键映射与启动逻辑（keys.js / app.js）
ejs/            EmulatorJS 核心文件（自托管）
roms/           云端 ROM（sdmg2.zip）
test/           Node 单元测试
web/            同上文件的归档副本
```

## 本地运行

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 测试

```bash
node test/app.test.js
```
