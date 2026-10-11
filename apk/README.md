# 超級大滿貫II 网页重制版 · 安卓 App（WebView 套壳 demo）

- 包名: com.marsgeek.sdmg2remake / 应用名: 超級大滿貫II / v1.0
- 内容: `app/src/main/assets/www/` = super-grand-slam-mame/web/remake 原样拷贝（纯离线，无远程依赖）
- 行为: 横屏全屏 WebView（immersive sticky）、JS+DOM Storage 开、KEEP_SCREEN_ON、返回键走 WebView 历史
- 构建: `./build.sh`（手动 aapt2 流程，本机 Gradle 不可用；详见 ~/AGENTS.md）
- 发布: 上传到仓库 curzydj8/super-grand-slam-mame 的 main 根目录 `apk/`，
  并在根目录 `android.html` 加下载卡片：
  `python3 ~/workspace/skills/github/bin/gh_deploy.py --repo super-grand-slam-mame --dir <含 apk/... 与 android.html 的 staging 目录> --files apk/sdmg2-remake-v1.0.apk android.html`
  线上: https://curzydj8.github.io/super-grand-slam-mame/apk/sdmg2-remake-v1.0.apk
- 签名: debug.keystore（与 sdmg2-launcher / mars-vpn 同级 demo 签名，非正式发布签名）
- 已知限制: 未在真机/模拟器实测（本机无模拟器）；游戏本体 CPU 偏弱 + 音效占位问题继承自 remake
