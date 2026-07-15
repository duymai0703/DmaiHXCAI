import argparse
import json
import math
import sys
from pathlib import Path

from PIL import Image
from ultralytics import YOLO


CLASS_TO_PIECE = {
    "red_king": "K",
    "red_advisor": "A",
    "red_elephant": "B",
    "red_knight": "N",
    "red_rook": "R",
    "red_cannon": "C",
    "red_pawn": "P",
    "black_king": "k",
    "black_advisor": "a",
    "black_elephant": "b",
    "black_knight": "n",
    "black_rook": "r",
    "black_cannon": "c",
    "black_pawn": "p",
}
PIECE_MAX_COUNTS = {
    "K": 1, "A": 2, "B": 2, "N": 2, "R": 2, "C": 2, "P": 5,
    "k": 1, "a": 2, "b": 2, "n": 2, "r": 2, "c": 2, "p": 5,
}


def class_name(model, cls_id):
    names = getattr(model, "names", {}) or {}
    value = names.get(int(cls_id), str(cls_id)) if isinstance(names, dict) else str(cls_id)
    return str(value)


def nearest_square(cx, cy, width, height, inset_x, inset_y):
    grid_left = width * inset_x
    grid_top = height * inset_y
    grid_width = width * (1 - 2 * inset_x)
    grid_height = height * (1 - 2 * inset_y)
    cell_x = grid_width / 8
    cell_y = grid_height / 9
    top_x = int(round((cx - grid_left) / cell_x))
    top_y = int(round((cy - grid_top) / cell_y))
    if top_x < 0 or top_x > 8 or top_y < 0 or top_y > 9:
        return None
    snapped_x = grid_left + top_x * cell_x
    snapped_y = grid_top + top_y * cell_y
    distance = math.hypot((cx - snapped_x) / max(1, cell_x), (cy - snapped_y) / max(1, cell_y))
    if distance > 0.68:
        return None
    return top_x, 9 - top_y, distance


def is_advisor_square(x, y, black):
    allowed = [(3, 9), (5, 9), (4, 8), (3, 7), (5, 7)] if black else [(3, 0), (5, 0), (4, 1), (3, 2), (5, 2)]
    return (x, y) in allowed


def is_elephant_square(x, y, black):
    allowed = [(2, 9), (6, 9), (0, 7), (4, 7), (8, 7), (2, 5), (6, 5)] if black else [(2, 0), (6, 0), (0, 2), (4, 2), (8, 2), (2, 4), (6, 4)]
    return (x, y) in allowed


def is_legal_piece_square(piece, x, y):
    if piece == "K":
        return 3 <= x <= 5 and 0 <= y <= 2
    if piece == "k":
        return 3 <= x <= 5 and 7 <= y <= 9
    if piece == "A":
        return is_advisor_square(x, y, False)
    if piece == "a":
        return is_advisor_square(x, y, True)
    if piece == "B":
        return is_elephant_square(x, y, False)
    if piece == "b":
        return is_elephant_square(x, y, True)
    if piece == "P":
        return y >= 3 and (y >= 5 or x % 2 == 0)
    if piece == "p":
        return y <= 6 and (y <= 4 or x % 2 == 0)
    return 0 <= x <= 8 and 0 <= y <= 9


def enforce_piece_counts(items):
    grouped = {}
    for item in items:
        grouped.setdefault(item["piece"], []).append(item)
    kept = []
    for piece, group in grouped.items():
        group.sort(key=lambda item: item["score"], reverse=True)
        kept.extend(group[:PIECE_MAX_COUNTS.get(piece, len(group))])
    return kept


def predict(args):
    image_path = Path(args.image)
    with Image.open(image_path) as image:
        width, height = image.size
    model = YOLO(args.model)
    result = model.predict(
        source=str(image_path),
        imgsz=args.imgsz,
        conf=args.conf,
        verbose=False,
    )[0]

    board = [["" for _ in range(9)] for _ in range(10)]
    pieces_by_square = {}
    warnings = []
    boxes = result.boxes
    if boxes is None:
        boxes_iter = []
    else:
        boxes_iter = boxes

    for box in boxes_iter:
        cls_id = int(box.cls[0].item())
        name = class_name(model, cls_id)
        piece = CLASS_TO_PIECE.get(name)
        if not piece:
            continue
        confidence = float(box.conf[0].item())
        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        square = nearest_square(cx, cy, width, height, args.inset_x, args.inset_y)
        if not square:
            continue
        x, y, distance = square
        if not is_legal_piece_square(piece, x, y):
            continue
        current = pieces_by_square.get((x, y))
        score = confidence - distance * 0.06
        if current and current["score"] >= score:
            continue
        pieces_by_square[(x, y)] = {
            "x": x,
            "y": y,
            "piece": piece,
            "confidence": round(confidence, 4),
            "className": name,
            "score": score,
        }

    filtered_pieces = enforce_piece_counts(list(pieces_by_square.values()))
    for item in filtered_pieces:
        board[item["y"]][item["x"]] = item["piece"]
    pieces = sorted(
        [{k: v for k, v in item.items() if k != "score"} for item in filtered_pieces],
        key=lambda item: (9 - item["y"], item["x"]),
    )
    if not pieces:
        warnings.append("YOLO did not detect any Xiangqi piece.")
    return {
        "board": board,
        "pieces": pieces,
        "side": "b" if args.side == "b" else "w",
        "sideToMove": "b" if args.side == "b" else "w",
        "warnings": warnings,
        "recognizer": "yolo-xiangqi",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--side", default="w", choices=["w", "b"])
    parser.add_argument("--conf", type=float, default=0.28)
    parser.add_argument("--imgsz", type=int, default=960)
    parser.add_argument("--inset-x", type=float, default=0.075)
    parser.add_argument("--inset-y", type=float, default=0.0666667)
    args = parser.parse_args()
    try:
        print(json.dumps(predict(args), ensure_ascii=False))
    except Exception as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
