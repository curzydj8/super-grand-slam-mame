#!/usr/bin/env python3
"""从 sdmg2754ca ROM 提取素材.

用法: python3 extract.py <rom_zip> <out_dir>

提取内容:
- font_tiles.png : text.u6 的 4096 个 8x8 4bpp tile（字库/界面图块）
- sprites_raw.bin : m0901.u5+m0902.u4 解包后的 5bpp 像素流（每字节1像素，值0-31）
- sound_raw.wav   : s0903.u15 OKI M6295 ADPCM 解码
- maincpu_dec.bin : p0900.u25 解密后的 68000 程序（word swap + XOR 还原）

ROM 格式依据: MAME src/mame/igs/igs017.cpp (init_sdmg2754ca, igs017_igs031_device)
"""
import struct
import sys
import wave
import zipfile
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None


def decrypt_maincpu(data: bytes) -> bytes:
    sw = bytearray()
    for i in range(0, len(data), 2):
        sw += bytes([data[i + 1], data[i]])  # word swap
    rom = list(struct.unpack(">%dH" % (len(sw) // 2), sw))
    for i in range(len(rom)):
        x = rom[i]
        if i & (0x20 // 2):
            if i & (0x02 // 2):
                x ^= 0x0001
        if not (i & (0x4000 // 2)):
            if not (i & (0x300 // 2)):
                x ^= 0x0001
        if i & (0x20000 // 2):
            x ^= 0x0200
        else:
            if not (i & (0x400 // 2)):
                x ^= 0x0200
        if i & (0x20000 // 2):
            x ^= 0x1000
        rom[i] = x
    return struct.pack(">%dH" % len(rom), *rom)


def decode_tiles(data: bytes):
    """8x8 4bpp planar -> list of 8x8 pen arrays."""
    tiles = []
    for off in range(0, len(data), 32):
        px = []
        for y in range(8):
            base = off + y * 4
            b0, b1, b2, b3 = data[base], data[base + 1], data[base + 2], data[base + 3]
            row = [(((b3 >> x) & 1) << 3) | (((b2 >> x) & 1) << 2) |
                   (((b1 >> x) & 1) << 1) | ((b0 >> x) & 1) for x in range(8)]
            px.append(row)
        tiles.append(px)
    return tiles


def decode_sprites(d1: bytes, d2: bytes) -> bytes:
    """5bpp packed (3 pixels/LE word) -> bytes, one pixel per byte."""
    raw = d1 + d2
    out = bytearray()
    for i in range(0, len(raw), 2):
        w = raw[i] | (raw[i + 1] << 8)
        out += bytes([(w >> 0) & 0x1f, (w >> 5) & 0x1f, (w >> 10) & 0x1f])
    return bytes(out)


def decode_oki_adpcm(data: bytes, rate: int = 8000) -> bytes:
    step_table = [16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66,
                  73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253,
                  279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876,
                  963, 1060, 1166, 1282, 1411, 1552]
    index_table = [-1, -1, -1, -1, 2, 5, 7, 9]
    signal, index = 0, 0
    pcm = bytearray()
    for b in data:
        for nib in (b & 0x0f, (b >> 4) & 0x0f):
            step = step_table[index]
            diff = step * ((nib & 7) * 2 + 1) // 8
            signal = signal - diff if nib & 8 else signal + diff
            signal = max(-2048, min(2047, signal))
            index = max(0, min(48, index + index_table[nib & 7]))
            pcm += struct.pack("<h", signal * 16)
    return bytes(pcm)


def main():
    zp, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    z = zipfile.ZipFile(zp)
    r = {n: z.read(n) for n in z.namelist() if not n.endswith(".html")}

    (out / "maincpu_dec.bin").write_bytes(decrypt_maincpu(r["p0900.u25"]))
    print("maincpu_dec.bin ok")

    (out / "sprites_raw.bin").write_bytes(decode_sprites(r["m0901.u5"], r["m0902.u4"]))
    print("sprites_raw.bin ok")

    pcm = decode_oki_adpcm(r["s0903.u15"])
    with wave.open(str(out / "sound_raw.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(8000)
        w.writeframes(pcm)
    print("sound_raw.wav ok (%.1fs)" % (len(pcm) / 2 / 8000))

    if Image:
        tiles = decode_tiles(r["text.u6"])
        cols = 64
        rows = (len(tiles) + cols - 1) // cols
        img = Image.new("RGB", (cols * 8, rows * 8))
        pal = [(i * 17, i * 17, i * 17) for i in range(16)]
        for t, tile in enumerate(tiles):
            ox, oy = (t % cols) * 8, (t // cols) * 8
            for y in range(8):
                for x in range(8):
                    img.putpixel((ox + x, oy + y), pal[tile[y][x]])
        img.save(out / "font_tiles.png")
        print("font_tiles.png ok (%d tiles)" % len(tiles))
    else:
        print("PIL 未安装，跳过 font_tiles.png")


if __name__ == "__main__":
    main()
