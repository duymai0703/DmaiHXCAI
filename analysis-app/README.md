# Pikafish Analyzer

Web UI/backend wrapper for the Pikafish UCI engine.

## Run

```powershell
npm run app
```

Then open:

```text
http://localhost:5174
```

The app looks for `src/pikafish.exe`, `src/pikafish`, `pikafish.exe`, or `pikafish`.
You can also set:

```powershell
$env:PIKAFISH_ENGINE="C:\path\to\pikafish.exe"
npm run app
```

Features included:

- 9x10 xiangqi board with red/black pieces.
- UCI backend that asks Pikafish for best move and MultiPV lines.
- Best-move arrow overlay.
- Manual moves, undo, redo, reset.
- Red AI, black AI, or both sides self-play.
