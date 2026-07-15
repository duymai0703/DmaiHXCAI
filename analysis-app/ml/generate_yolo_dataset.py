import argparse
import json
import math
import random
import shutil
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps


APP_DIR = Path(__file__).resolve().parents[1]
PUBLIC_DIR = APP_DIR / "public"
PIECE_DIR = PUBLIC_DIR / "assets" / "pieces"

WIDTH = 960
HEIGHT = 1080
GRID_LEFT = 72
GRID_TOP = 72
GRID_RIGHT = WIDTH - 72
GRID_BOTTOM = HEIGHT - 72
CELL_X = (GRID_RIGHT - GRID_LEFT) / 8
CELL_Y = (GRID_BOTTOM - GRID_TOP) / 9

CLASS_NAMES = [
    "red_king",
    "red_advisor",
    "red_elephant",
    "red_knight",
    "red_rook",
    "red_cannon",
    "red_pawn",
    "black_king",
    "black_advisor",
    "black_elephant",
    "black_knight",
    "black_rook",
    "black_cannon",
    "black_pawn",
]
CLASS_ID = {name: index for index, name in enumerate(CLASS_NAMES)}
PIECE_TO_CLASS = {
    "K": "red_king",
    "A": "red_advisor",
    "B": "red_elephant",
    "N": "red_knight",
    "R": "red_rook",
    "C": "red_cannon",
    "P": "red_pawn",
    "k": "black_king",
    "a": "black_advisor",
    "b": "black_elephant",
    "n": "black_knight",
    "r": "black_rook",
    "c": "black_cannon",
    "p": "black_pawn",
}
CLASS_TO_FILE = {
    "red_king": "red-king.png",
    "red_advisor": "red-advisor.png",
    "red_elephant": "red-elephant.png",
    "red_knight": "red-knight.png",
    "red_rook": "red-rook.png",
    "red_cannon": "red-cannon.png",
    "red_pawn": "red-pawn.png",
    "black_king": "black-king.png",
    "black_advisor": "black-advisor.png",
    "black_elephant": "black-elephant.png",
    "black_knight": "black-knight.png",
    "black_rook": "black-rook.png",
    "black_cannon": "black-cannon.png",
    "black_pawn": "black-pawn.png",
}

START_TOP_BOARD = [
    list("rnbakabnr"),
    list("........."),
    list(".c.....c."),
    list("p.p.p.p.p"),
    list("........."),
    list("........."),
    list("P.P.P.P.P"),
    list(".C.....C."),
    list("........."),
    list("RNBAKABNR"),
]

XQBASIC_POSTS_URL = "http://api.xqbasic.com/posts?page={page}"


def load_piece_assets():
    roots = [PIECE_DIR] + sorted((PIECE_DIR / "sets").glob("boquan*"))
    assets = {name: [] for name in CLASS_NAMES}
    for root in roots:
        if not root.exists():
            continue
        for class_name, filename in CLASS_TO_FILE.items():
            path = root / filename
            if path.exists():
                img = Image.open(path).convert("RGBA")
                assets[class_name].append(trim_alpha(img))
    missing = [name for name, items in assets.items() if not items]
    if missing:
        raise RuntimeError(f"Missing piece assets: {', '.join(missing)}")
    return assets


def trim_alpha(image):
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return image
    return image.crop(bbox)


def load_photo_backgrounds(photo_dir):
    if not photo_dir:
        return []
    root = Path(photo_dir)
    if not root.exists():
        return []
    items = []
    for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp"):
        items.extend(root.glob(ext))
    backgrounds = []
    for path in items[:500]:
        try:
            backgrounds.append(Image.open(path).convert("RGB"))
        except Exception:
            pass
    return backgrounds


def fen_to_layout(fen):
    board = str(fen or "").strip().split()[0]
    rows = board.split("/")
    if len(rows) != 10:
        return None
    pieces = []
    for top_y, row in enumerate(rows):
        x = 0
        for char in row:
            if char.isdigit():
                x += int(char)
                continue
            if char not in PIECE_TO_CLASS:
                return None
            if x > 8:
                return None
            pieces.append((x, top_y, char))
            x += 1
        if x != 9:
            return None
    has_red_king = any(piece == "K" for _, _, piece in pieces)
    has_black_king = any(piece == "k" for _, _, piece in pieces)
    if not has_red_king or not has_black_king:
        return None
    return pieces


def read_xqbasic_cache(cache_path):
    path = Path(cache_path)
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    if isinstance(payload, list):
        return [item for item in payload if fen_to_layout(item)]
    if isinstance(payload, dict):
        return [item.get("fen", "") for item in payload.get("items", []) if fen_to_layout(item.get("fen", ""))]
    return []


def fetch_json(url, timeout=15):
    request = urllib.request.Request(url, headers={"User-Agent": "DmaiHXCAI-YOLO-Trainer/1.0"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8", errors="replace"))


def fetch_xqbasic_fens(cache_path, pages=0, limit=0, pause=0.03):
    cached = read_xqbasic_cache(cache_path)
    if cached:
        print(f"Loaded {len(cached)} cached XqBasic FENs from {cache_path}")
        return cached[:limit] if limit else cached

    first = fetch_json(XQBASIC_POSTS_URL.format(page=1))
    total_pages = int(first.get("totalPage") or 1)
    if pages and pages > 0:
        total_pages = min(total_pages, pages)

    fens = []
    seen = set()

    def add_items(payload):
        for item in payload.get("items", []):
            fen = str(item.get("fen", "")).strip()
            if fen in seen or not fen_to_layout(fen):
                continue
            seen.add(fen)
            fens.append(fen)

    add_items(first)
    for page in range(2, total_pages + 1):
        if limit and len(fens) >= limit:
            break
        try:
            add_items(fetch_json(XQBASIC_POSTS_URL.format(page=page)))
        except Exception as error:
            print(f"Warning: failed to fetch XqBasic page {page}: {error}")
        if page % 50 == 0:
            print(f"Fetched {page}/{total_pages} XqBasic pages, {len(fens)} FENs")
        if pause > 0:
            time.sleep(pause)

    if limit:
        fens = fens[:limit]
    path = Path(cache_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(fens, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Cached {len(fens)} XqBasic FENs at {path}")
    return fens


def point_for(top_x, top_y, jitter=0.0):
    x = GRID_LEFT + top_x * CELL_X + random.uniform(-jitter, jitter)
    y = GRID_TOP + top_y * CELL_Y + random.uniform(-jitter, jitter)
    return x, y


def random_layout():
    pieces = []
    for top_y, row in enumerate(START_TOP_BOARD):
        for x, piece in enumerate(row):
            if piece != ".":
                pieces.append((x, top_y, piece))
    if random.random() < 0.72:
        keep = []
        for item in pieces:
            piece = item[2]
            if piece.lower() == "k" or random.random() > random.uniform(0.05, 0.38):
                keep.append(item)
        pieces = keep
        occupied = {(x, y) for x, y, _ in pieces}
        shifted = []
        for x, y, piece in pieces:
            if random.random() < 0.16 and piece.lower() not in ("k", "a", "b"):
                for _ in range(4):
                    nx = max(0, min(8, x + random.choice([-2, -1, 1, 2])))
                    ny = max(0, min(9, y + random.choice([-2, -1, 1, 2])))
                    if (nx, ny) not in occupied:
                        occupied.discard((x, y))
                        occupied.add((nx, ny))
                        x, y = nx, ny
                        break
            shifted.append((x, y, piece))
        return shifted

    occupied = set()
    pieces = []
    keys = list(PIECE_TO_CLASS)
    for piece in ("K", "k"):
        x = random.randint(3, 5)
        y = random.choice([0, 1, 2]) if piece == "K" else random.choice([7, 8, 9])
        top_y = 9 - y
        occupied.add((x, top_y))
        pieces.append((x, top_y, piece))
    for _ in range(random.randint(10, 30)):
        for _attempt in range(30):
            x = random.randint(0, 8)
            top_y = random.randint(0, 9)
            if (x, top_y) not in occupied:
                occupied.add((x, top_y))
                pieces.append((x, top_y, random.choice(keys)))
                break
    return pieces


def board_background(backgrounds):
    if backgrounds and random.random() < 0.28:
        src = random.choice(backgrounds).copy()
        src = ImageOps.fit(src, (WIDTH, HEIGHT), method=Image.Resampling.BICUBIC)
        src = src.filter(ImageFilter.GaussianBlur(random.uniform(1.0, 3.0)))
        overlay = Image.new("RGB", (WIDTH, HEIGHT), random.choice([(230, 198, 139), (205, 227, 232), (190, 196, 186)]))
        img = Image.blend(src, overlay, random.uniform(0.55, 0.82))
    else:
        base = random.choice([(231, 196, 128), (210, 236, 241), (204, 197, 181), (222, 176, 151), (34, 128, 116)])
        img = Image.new("RGB", (WIDTH, HEIGHT), base)
    noise = Image.effect_noise((WIDTH, HEIGHT), random.uniform(6, 18)).convert("L")
    noise_rgb = Image.merge("RGB", (noise, noise, noise))
    img = Image.blend(img, noise_rgb, random.uniform(0.025, 0.07))
    draw = ImageDraw.Draw(img, "RGBA")
    line = random.choice([(42, 42, 34, 210), (20, 96, 136, 220), (132, 88, 28, 220)])
    width = random.choice([2, 2, 3])
    for col in range(9):
        x = GRID_LEFT + col * CELL_X
        draw.line((x, GRID_TOP, x, GRID_TOP + 4 * CELL_Y), fill=line, width=width)
        draw.line((x, GRID_TOP + 5 * CELL_Y, x, GRID_BOTTOM), fill=line, width=width)
    for row in range(10):
        y = GRID_TOP + row * CELL_Y
        draw.line((GRID_LEFT, y, GRID_RIGHT, y), fill=line, width=width)
    draw.line((GRID_LEFT + 3 * CELL_X, GRID_TOP, GRID_LEFT + 5 * CELL_X, GRID_TOP + 2 * CELL_Y), fill=line, width=width)
    draw.line((GRID_LEFT + 5 * CELL_X, GRID_TOP, GRID_LEFT + 3 * CELL_X, GRID_TOP + 2 * CELL_Y), fill=line, width=width)
    draw.line((GRID_LEFT + 3 * CELL_X, GRID_TOP + 7 * CELL_Y, GRID_LEFT + 5 * CELL_X, GRID_BOTTOM), fill=line, width=width)
    draw.line((GRID_LEFT + 5 * CELL_X, GRID_TOP + 7 * CELL_Y, GRID_LEFT + 3 * CELL_X, GRID_BOTTOM), fill=line, width=width)
    draw_corner_marks(draw, line, width)
    return img.convert("RGBA")


def draw_corner_marks(draw, line, width):
    points = [(1, 2), (7, 2), (0, 3), (2, 3), (4, 3), (6, 3), (8, 3), (0, 6), (2, 6), (4, 6), (6, 6), (8, 6), (1, 7), (7, 7)]
    length = 16
    gap = 8
    for col, row in points:
        x, y = point_for(col, row)
        dirs = []
        if col > 0:
            dirs.extend([(-1, -1), (-1, 1)])
        if col < 8:
            dirs.extend([(1, -1), (1, 1)])
        for sx, sy in dirs:
            draw.line((x + sx * gap, y + sy * gap, x + sx * (gap + length), y + sy * gap), fill=line, width=width)
            draw.line((x + sx * gap, y + sy * gap, x + sx * gap, y + sy * (gap + length)), fill=line, width=width)


def paste_piece(image, piece_image, center, size):
    piece = piece_image.resize((size, size), Image.Resampling.LANCZOS)
    if random.random() < 0.12:
        piece = piece.rotate(random.uniform(-5, 5), resample=Image.Resampling.BICUBIC, expand=True)
    shadow = Image.new("RGBA", piece.size, (0, 0, 0, 0))
    alpha = piece.getchannel("A").filter(ImageFilter.GaussianBlur(max(1, size // 22)))
    shadow.putalpha(alpha.point(lambda value: int(value * 0.28)))
    x = int(center[0] - piece.width / 2)
    y = int(center[1] - piece.height / 2)
    image.alpha_composite(shadow, (x + max(2, size // 26), y + max(2, size // 26)))
    image.alpha_composite(piece, (x, y))
    return x, y, piece.width, piece.height


def degrade_like_mobile_capture(image):
    if random.random() < 0.42:
        scale = random.uniform(0.52, 0.82)
        small = image.resize((max(16, int(WIDTH * scale)), max(16, int(HEIGHT * scale))), Image.Resampling.BICUBIC)
        image = small.resize((WIDTH, HEIGHT), Image.Resampling.BICUBIC)
    if random.random() < 0.4:
        image = ImageEnhance.Sharpness(image).enhance(random.uniform(0.65, 1.28))
    if random.random() < 0.45:
        image = ImageEnhance.Contrast(image.convert("RGB")).enhance(random.uniform(0.82, 1.22)).convert("RGBA")
    if random.random() < 0.38:
        image = ImageEnhance.Brightness(image.convert("RGB")).enhance(random.uniform(0.88, 1.16)).convert("RGBA")
    if random.random() < 0.28:
        image = ImageEnhance.Color(image.convert("RGB")).enhance(random.uniform(0.85, 1.22)).convert("RGBA")
    return image


def render_sample(assets, backgrounds, layout=None):
    image = board_background(backgrounds)
    labels = []
    jitter = random.uniform(0.0, 3.8)
    pieces = layout if layout else random_layout()
    for x, top_y, piece in pieces:
        class_name = PIECE_TO_CLASS[piece]
        asset = random.choice(assets[class_name])
        size = random.randint(74, 104)
        cx, cy = point_for(x, top_y, jitter=jitter)
        left, top, w, h = paste_piece(image, asset, (cx, cy), size)
        labels.append((CLASS_ID[class_name], (left + w / 2) / WIDTH, (top + h / 2) / HEIGHT, w / WIDTH, h / HEIGHT))
    if random.random() < 0.35:
        image = image.filter(ImageFilter.GaussianBlur(random.uniform(0.0, 0.45)))
    if random.random() < 0.35:
        image = ImageOps.autocontrast(image.convert("RGB"), cutoff=random.uniform(0, 1.5)).convert("RGBA")
    image = degrade_like_mobile_capture(image)
    return image.convert("RGB"), labels


def write_data_yaml(output):
    names = "\n".join(f"  {index}: {name}" for index, name in enumerate(CLASS_NAMES))
    text = f"""path: {output.as_posix()}
train: images/train
val: images/val
names:
{names}
"""
    (output / "data.yaml").write_text(text, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(Path(__file__).resolve().parent / "datasets" / "xiangqi-yolo"))
    parser.add_argument("--count", type=int, default=1500)
    parser.add_argument("--val-ratio", type=float, default=0.1)
    parser.add_argument("--photos", default="")
    parser.add_argument("--seed", type=int, default=703)
    parser.add_argument("--xqbasic", action="store_true", help="Fetch and mix real puzzle FENs from xqbasic.com")
    parser.add_argument("--xqbasic-cache", default=str(Path(__file__).resolve().parent / "datasets" / "xqbasic_fens.json"))
    parser.add_argument("--xqbasic-pages", type=int, default=0, help="0 means all XqBasic pages")
    parser.add_argument("--xqbasic-limit", type=int, default=0, help="0 means no FEN limit")
    parser.add_argument("--xqbasic-ratio", type=float, default=0.85)
    args = parser.parse_args()

    random.seed(args.seed)
    output = Path(args.output)
    if output.exists():
        shutil.rmtree(output)
    for split in ("train", "val"):
        (output / "images" / split).mkdir(parents=True, exist_ok=True)
        (output / "labels" / split).mkdir(parents=True, exist_ok=True)

    assets = load_piece_assets()
    backgrounds = load_photo_backgrounds(args.photos)
    layouts = []
    if args.xqbasic:
        fens = fetch_xqbasic_fens(args.xqbasic_cache, pages=args.xqbasic_pages, limit=args.xqbasic_limit)
        layouts = [layout for layout in (fen_to_layout(fen) for fen in fens) if layout]
        print(f"Using {len(layouts)} XqBasic layouts")

    val_every = max(2, int(1 / max(0.01, min(0.5, args.val_ratio))))
    for index in range(args.count):
        split = "val" if index % val_every == 0 else "train"
        layout = random.choice(layouts) if layouts and random.random() < args.xqbasic_ratio else None
        image, labels = render_sample(assets, backgrounds, layout=layout)
        stem = f"xiangqi_{index:06d}"
        image.save(output / "images" / split / f"{stem}.jpg", quality=random.randint(76, 94), optimize=True)
        label_text = "\n".join(
            f"{cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}" for cls, cx, cy, w, h in labels
        )
        (output / "labels" / split / f"{stem}.txt").write_text(label_text + "\n", encoding="utf-8")
    write_data_yaml(output)
    print(f"Generated {args.count} YOLO samples at {output}")


if __name__ == "__main__":
    main()
