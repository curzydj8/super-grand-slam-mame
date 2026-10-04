# ROM 拆解分析：sdmg2_0_lngk.zip

## 游戏身份

| 项目 | 值 |
|------|-----|
| MAME 短名 | `sdmg2754ca` |
| 标题 | Chaoji Da Manguan II (China, V754C, set 1) / 超級大滿貫II 中国版 |
| 厂商/年份 | IGS, 1997 |
| 基板 | IGS017（IGS031 图形芯片） |
| parent set | `sdmg2`（台版超級大滿貫II） |
| CPU | Motorola 68000 @ 11MHz |
| 声音 | OKI M6295 @ 1MHz |
| 视频 | 60Hz / 15.3kHz |

## ROM 校验（5/5 全部通过，CRC 与 MAME 数据库一致）

| 文件 | 大小 | CRC32 | 用途 | MAME region |
|------|------|-------|------|-------------|
| p0900.u25 | 512KB | 43366f51 | 68000 主程序 | maincpu（16-bit word swap） |
| m0901.u5 | 2MB | 9699db24 | sprite 图形 | sprites（5bpp 打包） |
| m0902.u4 | 512KB | 3298b13b | sprite 图形 | sprites（续） |
| text.u6 | 128KB | cb34cbc0 | tilemap/字库 | tilemaps（8x8 4bpp） |
| s0903.u15 | 512KB | ae5a441c | 音效采样 | oki（ADPCM） |

`readme.html` 为 CoolROM 下载站残留，无用。

## 主程序加密（已破解）

`p0900.u25` 经过两层处理：
1. `ROM_LOAD16_WORD_SWAP`：每 16-bit 字字节交换
2. 地址相关的 XOR 加密（`init_sdmg2754ca`，bit0/bit9/bit12 三层）

解密验证：SP=0x001f4000（RAM），PC=0x000000c0；
PC 处为标准 68000 启动代码 `move #$2000,sr` / `movea.l #$1f4000,a7`。✅

## 图形格式（已解码验证）

**tilemap（text.u6）**：8x8 像素、4bpp planar，
plane 字节偏移 {3,2,1,0}，每 tile 32 字节，共 4096 tiles。
渲染确认：含 ASCII 点阵字库 + 中文点阵字库 + 界面图块。✅

**sprites（m0901+m0902）**：每 16-bit 小端字含 3 个 5-bit 像素
（bits `x-22222-11111-00000`），共 3,932,160 像素。
sprite 为变尺寸，由 sprite RAM 动态定位，裸数据只能看条带。✅ 格式确认

**调色板**：IGS 为可编程调色板，无独立 palette ROM，
需从程序代码逆向或实机截图采样。

## 声音（s0903.u15）

OKI M6295 4-bit ADPCM，标准格式，可解码为 WAV。
512KB ≈ 1M 采样点，约 2 分钟 @8kHz。

## 输入（29 键，已在 overlays/sdmg2_overlay.cfg 定义）

系統：投幣/開始/退幣/查帳；牌鍵 A–N；功能：吃/碰/槓/聽/胡/押注/比倍/大/小/海底/得分。

## 网页版路线结论

**模拟器路线（WASM 跑 MAME）已证实走不通**：
EmulatorJS 的 mame2003/mame2003-plus/FBNeo 均无 IGS017 驱动；
mame2010 WASM 社区确认损坏；现版 MAME 编译 WASM 体积巨大不实用。

**唯一可行路线：素材提取 + JS 重写（remake）**：
1. 素材：tile/sprite 已解码，声音可转 WAV，调色板需逆向
2. 逻辑：16 张台式麻将 + 押注/比倍玩法，需新写引擎（现有日麻引擎不适用）
3. 呈现：Canvas + 已设计的 29 键触控布局
