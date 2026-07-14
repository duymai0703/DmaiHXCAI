import argparse
from pathlib import Path

from ultralytics import YOLO


def main():
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default=str(root / "datasets" / "xiangqi-yolo" / "data.yaml"))
    parser.add_argument("--base", default="yolo11n.pt")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--imgsz", type=int, default=960)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--device", default="")
    parser.add_argument("--project", default=str(root / "runs"))
    parser.add_argument("--name", default="xiangqi-yolo")
    args = parser.parse_args()

    model = YOLO(args.base)
    kwargs = {
        "data": args.data,
        "epochs": args.epochs,
        "imgsz": args.imgsz,
        "batch": args.batch,
        "project": args.project,
        "name": args.name,
        "patience": 20,
        "exist_ok": True,
        "workers": 2,
        "cache": False,
    }
    if args.device:
        kwargs["device"] = args.device
    model.train(**kwargs)


if __name__ == "__main__":
    main()
