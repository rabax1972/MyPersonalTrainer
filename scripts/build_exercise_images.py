"""Converte in WebP le immagini degli esercizi usati dall'app.

Legge gli `sourceId` da src/data/exercises.ts, prende le immagini dal dataset
free-exercise-db (pubblico dominio) e le salva in public/exercises/<id>/{0,1}.webp.
Genera anche le icone della PWA in public/icons/.

Uso:
    python scripts/build_exercise_images.py [percorso/free-exercise-db]

Se il percorso non è indicato, il dataset viene clonato in .free-exercise-db/.
Richiede Pillow (pip install pillow).
"""

import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "src" / "data" / "exercises.ts"
OUT_DIR = ROOT / "public" / "exercises"
ICON_DIR = ROOT / "public" / "icons"
REPO_URL = "https://github.com/yuhonas/free-exercise-db.git"

WIDTH = 600  # sufficiente per lo schermo di un telefono, file leggeri
QUALITY = 72


def dataset_dir() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1])
    target = ROOT / ".free-exercise-db"
    if not target.exists():
        subprocess.run(["git", "clone", "--depth", "1", REPO_URL, str(target)], check=True)
    return target


def convert_images(src_root: Path) -> None:
    ids = sorted(set(re.findall(r"sourceId: '([^']+)'", DATA_FILE.read_text(encoding="utf-8"))))
    total = 0
    for source_id in ids:
        out = OUT_DIR / source_id
        out.mkdir(parents=True, exist_ok=True)
        for frame in ("0", "1"):
            src = src_root / "exercises" / source_id / f"{frame}.jpg"
            if not src.exists():
                raise SystemExit(f"Immagine mancante: {src}")
            with Image.open(src) as im:
                im = im.convert("RGB")
                height = round(im.height * WIDTH / im.width)
                im = im.resize((WIDTH, height), Image.LANCZOS)
                dest = out / f"{frame}.webp"
                im.save(dest, "WEBP", quality=QUALITY, method=6)
                total += dest.stat().st_size
    print(f"{len(ids)} esercizi, {len(ids) * 2} immagini, {total / 1024 / 1024:.2f} MB")


def draw_icon(size: int, maskable: bool) -> Image.Image:
    img = Image.new("RGB", (size, size), "#0f1720")
    d = ImageDraw.Draw(img)
    # La zona sicura delle icone maskable è il cerchio centrale all'80%.
    scale = 0.62 if maskable else 0.8
    c = size / 2
    r = size * scale / 2
    d.ellipse([c - r, c - r, c + r, c + r], fill="#22c55e")
    # Manubrio stilizzato
    bar_h = r * 0.16
    d.rounded_rectangle([c - r * 0.62, c - bar_h / 2, c + r * 0.62, c + bar_h / 2], radius=bar_h / 2, fill="#0f1720")
    for side in (-1, 1):
        x = c + side * r * 0.5
        w, h = r * 0.2, r * 0.82
        d.rounded_rectangle([x - w / 2, c - h / 2, x + w / 2, c + h / 2], radius=w / 3, fill="#0f1720")
        x2 = c + side * r * 0.74
        w2, h2 = r * 0.14, r * 0.52
        d.rounded_rectangle([x2 - w2 / 2, c - h2 / 2, x2 + w2 / 2, c + h2 / 2], radius=w2 / 3, fill="#0f1720")
    return img


def build_icons() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    draw_icon(192, False).save(ICON_DIR / "icon-192.png")
    draw_icon(512, False).save(ICON_DIR / "icon-512.png")
    draw_icon(512, True).save(ICON_DIR / "icon-maskable-512.png")
    draw_icon(180, False).save(ICON_DIR / "apple-touch-icon.png")


if __name__ == "__main__":
    convert_images(dataset_dir())
    build_icons()
