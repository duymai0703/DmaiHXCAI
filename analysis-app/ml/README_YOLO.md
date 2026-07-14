# DmaiHXCAI YOLO vision

This folder adds an optional YOLO pipeline for Xiangqi board recognition.

Pipeline:

1. User crops the board in the web UI.
2. Server receives a canonical 960x1080 board image.
3. YOLO detects 14 Xiangqi piece classes.
4. Detection centers are mapped to the nearest 9x10 board intersection.
5. The board is returned to the existing manual setup screen, so users can fix mistakes.

Classes:

- Red: `red_king`, `red_advisor`, `red_elephant`, `red_knight`, `red_rook`, `red_cannon`, `red_pawn`
- Black: `black_king`, `black_advisor`, `black_elephant`, `black_knight`, `black_rook`, `black_cannon`, `black_pawn`

Local training:

```powershell
cd C:\Users\Admin\Downloads\DmaiHXCAI-deploy
python -m venv analysis-app\ml\.venv
analysis-app\ml\.venv\Scripts\python -m pip install -r analysis-app\ml\requirements-yolo.txt
analysis-app\ml\.venv\Scripts\python analysis-app\ml\generate_yolo_dataset.py --count 2500 --photos D:\anhbanco
analysis-app\ml\.venv\Scripts\python analysis-app\ml\train_yolo.py --epochs 80 --imgsz 960
```

After training, copy or rename the best model:

```powershell
New-Item -ItemType Directory -Force analysis-app\ml\models
Copy-Item analysis-app\ml\runs\xiangqi-yolo\weights\best.pt analysis-app\ml\models\xiangqi-yolo.pt
```

To force the server to use YOLO first:

```powershell
$env:DMAIHXCAI_VISION_PROVIDER="yolo"
$env:XIANGQI_YOLO_PYTHON="analysis-app\ml\.venv\Scripts\python.exe"
$env:XIANGQI_YOLO_MODEL="analysis-app\ml\models\xiangqi-yolo.pt"
npm run app
```

On Render, keep YOLO disabled until the model/runtime is ready. The app still works with the existing local template recognizer.
