"""Generate vertical short videos (1080x1920, 30 fps) for Azenha.AI socials.

  python3 make_videos.py levada   -> 6 "Guess the levada" clips (data: ativa/levadas.json)
  python3 make_videos.py papagaio -> 4 PapaGaio PT-PT vs PT-BR word clips
Output: social/out/<slug>.mp4 + <slug>_cover.png
"""
import json, math, os, struct, subprocess, sys, wave
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)
FD = "/usr/share/fonts/opentype/inter/"
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
_fc = {}


def font(size, w="Bold", display=True):
    key = (size, w, display)
    if key not in _fc:
        _fc[key] = ImageFont.truetype(f"{FD}{'InterDisplay' if display else 'Inter'}-{w}.otf", size)
    return _fc[key]


def hexc(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def back(x):  # ease-out-back, small overshoot
    x = clamp(x)
    c = 1.7
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


def prog(t, t0, dur):
    return clamp((t - t0) / dur)


def ctext(d, y, s, f, fill, cx=W // 2):
    w = d.textlength(s, font=f)
    d.text((cx - w / 2, y), s, font=f, fill=fill)


def fit(d, s, w="Black", start=150, maxw=900):
    size = start
    while size > 30 and d.textlength(s, font=font(size, w)) > maxw:
        size -= 4
    return font(size, w)


def overlay(base, layer, alpha):
    if alpha <= 0:
        return
    if alpha < 1:
        a = layer.getchannel("A").point(lambda v: int(v * alpha))
        layer = layer.copy()
        layer.putalpha(a)
    base.paste(layer, (0, 0), layer)


def emoji(ch, size):
    f = ImageFont.truetype(EMOJI, 109)
    im = Image.new("RGBA", (160, 136), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((0, 0), ch, font=f, embedded_color=True)
    im = im.crop(im.getbbox())
    return im.resize((int(im.width * size / im.height), size), Image.LANCZOS)


# ---------------------------------------------------------------- audio
def write_audio(path, dur, events):
    """events: list of (time_s, freq_hz, length_s, volume)."""
    sr = 44100
    buf = [0.0] * int(sr * dur)
    for t0, fq, ln, vol in events:
        s0 = int(t0 * sr)
        for i in range(int(ln * sr)):
            if s0 + i >= len(buf):
                break
            tt = i / sr
            env = min(1, tt / 0.005) * math.exp(-tt * 9 / ln)
            buf[s0 + i] += vol * env * (math.sin(2 * math.pi * fq * tt) + 0.3 * math.sin(4 * math.pi * fq * tt))
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"".join(struct.pack("<h", int(clamp(v, -1, 1) * 32000)) for v in buf))


def encode(slug, dur, frame_fn, audio_events):
    wav = os.path.join(OUT, f"{slug}.wav")
    write_audio(wav, dur, audio_events)
    mp4 = os.path.join(OUT, f"{slug}.mp4")
    p = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "medium", "-crf", "18",
         "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "aac", "-b:a", "160k", "-shortest",
         "-movflags", "+faststart", mp4], stdin=subprocess.PIPE)
    for i in range(int(dur * FPS)):
        p.stdin.write(frame_fn(i / FPS).convert("RGB").tobytes())
    p.stdin.close()
    p.wait()
    os.remove(wav)
    print("wrote", mp4)


# ---------------------------------------------------------------- Ativa: guess the levada
GREEN, CREAM, YEL = "#1f4d32", "#f5f2ea", "#ffd229"
CX0, CX1, CY0, CY1 = 110, 970, 560, 1150  # chart box (inside TikTok safe zone)
SS = 2  # supersampling for the chart line

LEVADAS = ["PR 6", "PR 1", "PR 9", "PR 8", "PR 1.2", "PR 1.1"]


def fmt(n):
    return f"{n:,}"


def chart_layers(prof):
    lo, hi = min(prof), max(prof)
    pad = max(20, (hi - lo) * 0.12)
    lo2, hi2 = lo - pad, hi + pad
    n = len(prof)
    pts = [(CX0 + (CX1 - CX0) * i / (n - 1), CY1 - (CY1 - CY0) * (v - lo2) / (hi2 - lo2)) for i, v in enumerate(prof)]
    # smooth via Catmull-Rom for a nicer line
    dense = []
    for i in range(n - 1):
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, n - 1)]
        for k in range(12):
            t = k / 12
            dense.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                                      + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in (0, 1)))
    dense.append(pts[-1])
    big = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    poly = [(x * SS, y * SS) for x, y in dense]
    d.polygon(poly + [(CX1 * SS, CY1 * SS), (CX0 * SS, CY1 * SS)], fill=hexc(YEL, 46))
    d.line(poly, fill=hexc(YEL), width=9 * SS, joint="curve")
    for x, y in (poly[0], poly[-1]):
        r = 4.5 * SS
        d.ellipse((x - r, y - r, x + r, y + r), fill=hexc(YEL))
    line = big.resize((W, H), Image.LANCZOS)
    return line, dense, (lo, hi), (lo2, hi2)


def alt_at(dense, x, lo2, hi2):
    for a, b in zip(dense, dense[1:]):
        if a[0] <= x <= b[0]:
            y = a[1] + (b[1] - a[1]) * ((x - a[0]) / max(b[0] - a[0], 1e-6))
            return y, lo2 + (CY1 - y) / (CY1 - CY0) * (hi2 - lo2)
    y = dense[-1][1]
    return y, lo2 + (CY1 - y) / (CY1 - CY0) * (hi2 - lo2)


def levada_base(idx, n, lo, hi, lo2, hi2):
    im = Image.new("RGB", (W, H), hexc(GREEN)[:3])
    d = ImageDraw.Draw(im, "RGBA")
    # subtle topo rings
    for r in range(260, 1500, 70):
        d.ellipse((900 - r, 1750 - r, 900 + r, 1750 + r), outline=hexc("#ffffff", 9), width=2)
    ctext(d, 190, "GUESS THE", font(64, "Bold"), hexc(CREAM, 220))
    ctext(d, 262, "LEVADA", font(170, "Black"), hexc(YEL))
    ctext(d, 455, f"MADEIRA TRAIL  ·  {idx}/{n}", font(36, "SemiBold", False), hexc(CREAM, 170))
    # chart frame + altitude grid (the hint)
    d.rounded_rectangle((CX0 - 40, CY0 - 50, CX1 + 40, CY1 + 70), 36, fill=hexc("#ffffff", 14))
    for v in (lo, hi):
        y = CY1 - (CY1 - CY0) * (v - lo2) / (hi2 - lo2)
        for x in range(CX0, CX1, 22):
            d.line((x, y, x + 10, y), fill=hexc(CREAM, 70), width=2)
        lab = f"{fmt(v)} m"
        f = font(28, "SemiBold", False)
        tw = d.textlength(lab, font=f)
        lx = W / 2 - tw / 2
        d.rounded_rectangle((lx - 12, y - 22, lx + tw + 12, y + 20), 12, fill=hexc("#0f2a1b", 200))
        d.text((lx, y - 18), lab, font=f, fill=hexc(CREAM, 200))
    d.text((CX0, CY1 + 18), "START", font=font(26, "SemiBold", False), fill=hexc(CREAM, 120))
    d.text((CX1 - d.textlength("? km", font=font(26, "SemiBold", False)), CY1 + 18), "? km",
           font=font(26, "SemiBold", False), fill=hexc(CREAM, 120))
    return im


def make_levada(tr, idx, n):
    prof = tr["profile"]
    line, dense, (lo, hi), (lo2, hi2) = chart_layers(prof)
    base = levada_base(idx, n, lo, hi, lo2, hi2)
    slug = f"levada_{idx:02d}_{tr['code'].replace(' ', '').replace('.', '-').lower()}"
    DRAW0, DRAW1, CD0, REV, DUR = 0.9, 6.9, 7.4, 10.4, 16.0

    # cover (question only, no answer)
    cov = base.copy()
    cov.paste(line, (0, 0), line)
    d = ImageDraw.Draw(cov, "RGBA")
    ctext(d, 1300, "Can you name", font(78, "Black"), hexc(CREAM))
    ctext(d, 1395, "this trail?", font(78, "Black"), hexc(CREAM))
    ctext(d, 1530, "Answer in 3 · 2 · 1", font(44, "SemiBold", False), hexc(YEL))
    cov.convert("RGB").save(os.path.join(OUT, f"{slug}_cover.png"))

    def frame(t):
        im = base.copy()
        # reveal line left->right
        xr = CX0 - 12 + (CX1 - CX0 + 24) * ease((t - DRAW0) / (DRAW1 - DRAW0)) if t >= DRAW0 else 0
        if xr > 0:
            crop = line.crop((0, 0, int(xr), H))
            im.paste(crop, (0, 0), crop)
        d = ImageDraw.Draw(im, "RGBA")
        if DRAW0 <= t < DRAW1 + 0.3:
            x = clamp(xr, CX0, CX1)
            y, alt = alt_at(dense, x, lo2, hi2)
            d.ellipse((x - 16, y - 16, x + 16, y + 16), fill=hexc(CREAM), outline=hexc(YEL), width=6)
            lab = f"{fmt(int(round(alt)))} m"
            f = font(34, "Bold", False)
            tw = d.textlength(lab, font=f)
            lx = clamp(x - tw / 2, CX0 - 20, CX1 + 20 - tw)
            ly = y - 72 if y - 72 > CY0 - 40 else y + 30
            d.rounded_rectangle((lx - 14, ly - 6, lx + tw + 14, ly + 44), 14, fill=hexc("#0f2a1b", 220))
            d.text((lx, ly), lab, font=f, fill=hexc(CREAM))
        if t < REV:
            a = int(255 * ease((t - 0.3) / 0.6))
            ctext(d, 1290, "Which levada is this?", font(64, "Black"), hexc(CREAM, a))
            ctext(d, 1375, "Comment your guess before the reveal", font(36, "Medium", False), hexc(CREAM, int(a * 0.75)))
        if CD0 <= t < REV:
            k = int(t - CD0)
            ph = (t - CD0) - k
            num = str(3 - k)
            s = back(ph / 0.35)
            f = font(int(250 * (0.6 + 0.4 * s)), "Black")
            alpha = int(255 * (1 - clamp((ph - 0.75) / 0.25)))
            lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ld = ImageDraw.Draw(lay)
            bb = ld.textbbox((0, 0), num, font=f)
            ld.text((W / 2 - (bb[0] + bb[2]) / 2, 1640 - (bb[1] + bb[3]) / 2 - 60), num, font=f, fill=hexc(YEL, alpha))
            im.paste(lay, (0, 0), lay)
        if t >= REV:
            p = ease((t - REV) / 0.5)
            lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ld = ImageDraw.Draw(lay)
            y0 = 1230 + int(60 * (1 - p))
            # PR code pill
            code = tr["code"]
            f = font(120, "Black")
            tw = ld.textlength(code, font=f)
            ld.rounded_rectangle((W / 2 - tw / 2 - 44, y0, W / 2 + tw / 2 + 44, y0 + 160), 80, fill=hexc(YEL))
            ctext(ld, y0 + 8, code, f, hexc(GREEN))
            nf = fit(ld, tr["name"], "Black", 84, 920)
            ctext(ld, y0 + 195, tr["name"], nf, hexc(CREAM))
            stats = f"{tr['distance_km']} km   ↑ {fmt(tr['ascent_m'])} m   ↓ {fmt(tr['descent_m'])} m"
            ctext(ld, y0 + 310, stats, font(48, "Bold", False), hexc(CREAM, 230))
            ctext(ld, y0 + 380, f"{fmt(lo)}–{fmt(hi)} m altitude · one way", font(34, "Medium", False), hexc(CREAM, 170))
            overlay(im, lay, p)
            p2 = ease((t - REV - 1.6) / 0.5)
            lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ld = ImageDraw.Draw(lay)
            ctext(ld, 1690, "Play the levada game", font(42, "Bold", False), hexc(YEL))
            ctext(ld, 1745, "azenha.ai/ativa  ·  link in bio", font(36, "Medium", False), hexc(CREAM, 210))
            overlay(im, lay, p2)
            d = ImageDraw.Draw(im, "RGBA")
            # flash
            if t - REV < 0.25:
                fl = Image.new("RGBA", (W, H), hexc(CREAM, int(120 * (1 - (t - REV) / 0.25))))
                im.paste(fl, (0, 0), fl)
        return im

    audio = [(CD0 + k, 880, 0.18, 0.35) for k in range(3)]
    audio += [(REV, 1046.5, 0.6, 0.25), (REV, 1318.5, 0.6, 0.2), (REV, 1568, 0.7, 0.18)]
    audio += [(DRAW0 + i * 0.5, 440 + 30 * i, 0.06, 0.06) for i in range(12)]
    encode(slug, DUR, frame, audio)
    return slug


# ---------------------------------------------------------------- PapaGaio: PT vs BR
DARK, PG, RED = "#0e1a14", "#34d17b", "#c8102e"
WORDS = [
    ("train", "comboio", "trem"),
    ("bus", "autocarro", "ônibus"),
    ("mobile phone", "telemóvel", "celular"),
    ("breakfast", "pequeno-almoço", "café da manhã"),
]


def make_papagaio(i, en, pt, br):
    slug = f"papagaio_{i:02d}_{en.replace(' ', '-')}"
    DUR = 13.0
    T_EN, T_PT, T_BR, T_Q, T_CTA = 0.9, 3.2, 5.4, 8.0, 10.0
    fpt, fbr = emoji("🇵🇹", 76), emoji("🇧🇷", 76)

    base = Image.new("RGB", (W, H), hexc(DARK)[:3])
    d = ImageDraw.Draw(base, "RGBA")
    for k in range(0, H, 6):  # soft glow
        a = int(28 * max(0, 1 - abs(k - 760) / 900))
        d.line((0, k, W, k), fill=hexc(PG, a), width=6)
    ctext(d, 190, "PapaGaio", font(46, "Bold"), hexc(PG))
    ctext(d, 250, "PORTUGAL  vs  BRAZIL", font(36, "SemiBold", False), hexc("#ffffff", 150))

    def card(im, y, flag, country, word, accent, p, highlight):
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        dx = int(140 * (1 - p))
        x0, x1 = 90 + dx, 990 + dx
        ld.rounded_rectangle((x0, y, x1, y + 300), 40, fill=hexc("#ffffff", 16 if not highlight else 24),
                             outline=hexc(accent), width=5)
        lay.alpha_composite(flag, (x0 + 50, y + 44))
        ld.text((x0 + 50 + flag.width + 24, y + 52), country, font=font(40, "Bold", False), fill=hexc("#ffffff", 200))
        f = fit(ld, word, "Black", 120, 800)
        ld.text((x0 + 50, y + 135), word, font=f, fill=hexc("#ffffff"))
        overlay(im, lay, p)

    def frame(t):
        im = base.copy()
        d = ImageDraw.Draw(im, "RGBA")
        # hook
        a = ease((t - 0.1) / 0.5)
        ctext(d, 400, "Same thing. Two words.", font(60, "Black"), hexc("#ffffff", int(255 * a)))
        if t >= T_EN:
            p = back((t - T_EN) / 0.45)
            lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ld = ImageDraw.Draw(lay)
            ctext(ld, 520, "in English:", font(40, "Medium", False), hexc("#ffffff", 160))
            f = fit(ld, en.upper(), "Black", int(150 * (0.7 + 0.3 * p)), 900)
            ctext(ld, 575, en.upper(), f, hexc(PG))
            overlay(im, lay, clamp(p))
        if t >= T_PT:
            card(im, 820, fpt, "PORTUGAL", pt, RED, ease((t - T_PT) / 0.5), True)
        if t >= T_BR:
            card(im, 1160, fbr, "BRAZIL", br, PG, ease((t - T_BR) / 0.5), False)
        if t >= T_Q:
            p = ease((t - T_Q) / 0.5)
            lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ld = ImageDraw.Draw(lay)
            ctext(ld, 1510, "Which one do you say?", font(62, "Black"), hexc("#ffffff"))
            overlay(im, lay, p)
        if t >= T_CTA:
            p = ease((t - T_CTA) / 0.5)
            lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ld = ImageDraw.Draw(lay)
            ctext(ld, 1610, "Learn European Portuguese", font(42, "Bold", False), hexc(PG))
            ctext(ld, 1665, "PapaGaio app  ·  link in bio", font(36, "Medium", False), hexc("#ffffff", 200))
            overlay(im, lay, p)
        return im

    cov = frame(DUR - 0.1)
    cov.convert("RGB").save(os.path.join(OUT, f"{slug}_cover.png"))
    audio = [(T_EN, 660, 0.25, 0.3), (T_PT, 784, 0.3, 0.3), (T_BR, 988, 0.3, 0.3), (T_Q, 1175, 0.4, 0.2)]
    encode(slug, DUR, frame, audio)
    return slug


if __name__ == "__main__":
    what = sys.argv[1:] or ["levada", "papagaio"]
    if "levada" in what:
        data = {x["code"]: x for x in json.load(open(os.path.join(HERE, "..", "ativa", "levadas.json")))["levadas"]
                if x["island"] == "Madeira"}
        for k, code in enumerate(LEVADAS, 1):
            make_levada(data[code], k, len(LEVADAS))
    if "papagaio" in what:
        for k, (en, pt, br) in enumerate(WORDS, 1):
            make_papagaio(k, en, pt, br)
