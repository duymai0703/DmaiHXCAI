(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.XiangqiCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const START_FEN = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1";
  const FILES = "abcdefghi";
  const PIECE_CODES = { k: "Tg", a: "S", b: "T", r: "X", c: "P", n: "M", p: "B" };

  function parseFenState(fen) {
    const parts = String(fen || START_FEN).trim().split(/\s+/);
    return {
      board: parseFen(parts[0] || START_FEN.split(" ")[0]),
      side: parts[1] === "b" ? "b" : "w"
    };
  }

  function parseFen(fenBoard) {
    const rows = String(fenBoard || "").split("/");
    const board = Array.from({ length: 10 }, () => Array(9).fill(""));
    rows.forEach((row, rowIndex) => {
      let x = 0;
      const y = 9 - rowIndex;
      for (const char of row) {
        if (/\d/.test(char)) x += Number(char);
        else board[y][x++] = char;
      }
    });
    return board;
  }

  function boardToCompactFen(board, side) {
    const rows = [];
    for (let y = 9; y >= 0; y--) {
      let row = "";
      let empty = 0;
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (!piece) {
          empty += 1;
        } else {
          if (empty) row += empty;
          empty = 0;
          row += piece;
        }
      }
      if (empty) row += empty;
      rows.push(row);
    }
    return `${rows.join("/")} ${side === "b" ? "b" : "w"}`;
  }

  function boardToFen(board, side) {
    return `${boardToCompactFen(board, side)} - - 0 1`;
  }

  function cloneBoard(board) {
    return board.map((row) => [...row]);
  }

  function emptyBoard() {
    return Array.from({ length: 10 }, () => Array(9).fill(""));
  }

  function squareToUci(square) {
    return `${FILES[square.x]}${square.y}`;
  }

  function uciToSquare(text) {
    return { x: FILES.indexOf(text[0]), y: Number(text[1]) };
  }

  function pieceColor(piece) {
    if (!piece) return "";
    return piece === piece.toUpperCase() ? "w" : "b";
  }

  function inside(x, y) {
    return x >= 0 && x < 9 && y >= 0 && y < 10;
  }

  function inPalace(x, y, side) {
    return x >= 3 && x <= 5 && (side === "w" ? y >= 0 && y <= 2 : y >= 7 && y <= 9);
  }

  function applyMoveToBoard(board, move) {
    if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return;
    const from = uciToSquare(move.slice(0, 2));
    const to = uciToSquare(move.slice(2, 4));
    board[to.y][to.x] = board[from.y][from.x];
    board[from.y][from.x] = "";
  }

  function slideOnBoard(board, square, dirs, add) {
    for (const [dx, dy] of dirs) {
      let x = square.x + dx;
      let y = square.y + dy;
      while (inside(x, y)) {
        add(x, y);
        if (board[y][x]) break;
        x += dx;
        y += dy;
      }
    }
  }

  function cannonOnBoard(board, square, add) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let x = square.x + dx;
      let y = square.y + dy;
      let screen = false;
      while (inside(x, y)) {
        const target = board[y][x];
        if (!screen) {
          if (!target) add(x, y);
          else screen = true;
        } else if (target) {
          add(x, y);
          break;
        }
        x += dx;
        y += dy;
      }
    }
  }

  function knightOnBoard(board, square, add) {
    const jumps = [
      [1, 2, 0, 1], [-1, 2, 0, 1], [1, -2, 0, -1], [-1, -2, 0, -1],
      [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0]
    ];
    jumps.forEach(([dx, dy, bx, by]) => {
      if (!board[square.y + by]?.[square.x + bx]) add(square.x + dx, square.y + dy);
    });
  }

  function bishopOnBoard(board, square, add, side) {
    [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dx, dy]) => {
      const y = square.y + dy;
      if (side === "w" && y > 4) return;
      if (side === "b" && y < 5) return;
      if (!board[square.y + dy / 2]?.[square.x + dx / 2]) add(square.x + dx, y);
    });
  }

  function advisorOnBoard(square, add, side) {
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => {
      const x = square.x + dx;
      const y = square.y + dy;
      if (inPalace(x, y, side)) add(x, y);
    });
  }

  function kingOnBoard(square, add, side) {
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const x = square.x + dx;
      const y = square.y + dy;
      if (inPalace(x, y, side)) add(x, y);
    });
  }

  function pawnOnBoard(square, add, side) {
    const forward = side === "w" ? 1 : -1;
    add(square.x, square.y + forward);
    const crossed = side === "w" ? square.y >= 5 : square.y <= 4;
    if (crossed) {
      add(square.x + 1, square.y);
      add(square.x - 1, square.y);
    }
  }

  function pseudoMovesOnBoard(board, square) {
    const piece = board[square.y]?.[square.x] || "";
    if (!piece) return [];
    const side = pieceColor(piece);
    const moves = [];
    const add = (x, y) => {
      if (!inside(x, y)) return;
      const target = board[y][x];
      if (target?.toLowerCase() === "k") return;
      if (!target || pieceColor(target) !== side) moves.push({ x, y });
    };
    switch (piece.toLowerCase()) {
      case "r":
        slideOnBoard(board, square, [[1, 0], [-1, 0], [0, 1], [0, -1]], add);
        break;
      case "c":
        cannonOnBoard(board, square, add);
        break;
      case "n":
        knightOnBoard(board, square, add);
        break;
      case "b":
        bishopOnBoard(board, square, add, side);
        break;
      case "a":
        advisorOnBoard(square, add, side);
        break;
      case "k":
        kingOnBoard(square, add, side);
        break;
      case "p":
        pawnOnBoard(square, add, side);
        break;
      default:
        break;
    }
    return moves;
  }

  function clearLine(board, from, target) {
    if (from.x !== target.x && from.y !== target.y) return Infinity;
    const stepX = Math.sign(target.x - from.x);
    const stepY = Math.sign(target.y - from.y);
    let x = from.x + stepX;
    let y = from.y + stepY;
    let blockers = 0;
    while (x !== target.x || y !== target.y) {
      if (board[y][x]) blockers += 1;
      x += stepX;
      y += stepY;
    }
    return blockers;
  }

  function attacksSquare(board, from, target) {
    const piece = board[from.y]?.[from.x] || "";
    if (!piece) return false;
    const side = pieceColor(piece);
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    switch (piece.toLowerCase()) {
      case "r":
        return (dx === 0 || dy === 0) && clearLine(board, from, target) === 0;
      case "c":
        return (dx === 0 || dy === 0) && clearLine(board, from, target) === 1;
      case "n":
        return ((adx === 1 && ady === 2 && !board[from.y + dy / 2]?.[from.x]) ||
          (adx === 2 && ady === 1 && !board[from.y]?.[from.x + dx / 2]));
      case "b":
        return adx === 2 && ady === 2 &&
          !(side === "w" && target.y > 4) &&
          !(side === "b" && target.y < 5) &&
          !board[from.y + dy / 2]?.[from.x + dx / 2];
      case "a":
        return adx === 1 && ady === 1 && inPalace(target.x, target.y, side);
      case "k":
        return (from.x === target.x && clearLine(board, from, target) === 0) ||
          (adx + ady === 1 && inPalace(target.x, target.y, side));
      case "p": {
        const forward = side === "w" ? 1 : -1;
        const crossed = side === "w" ? from.y >= 5 : from.y <= 4;
        return (dx === 0 && dy === forward) || (crossed && adx === 1 && dy === 0);
      }
      default:
        return false;
    }
  }

  function findKing(board, side) {
    const king = side === "w" ? "K" : "k";
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        if (board[y][x] === king) return { x, y };
      }
    }
    return null;
  }

  function isSquareAttacked(board, square, bySide) {
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (piece && pieceColor(piece) === bySide && attacksSquare(board, { x, y }, square)) return true;
      }
    }
    return false;
  }

  function isKingInCheck(board, side) {
    const kingSquare = findKing(board, side);
    if (!kingSquare) return true;
    return isSquareAttacked(board, kingSquare, side === "w" ? "b" : "w");
  }

  function isLegalMove(board, move, side) {
    if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return false;
    const from = uciToSquare(move.slice(0, 2));
    const to = uciToSquare(move.slice(2, 4));
    if (!inside(from.x, from.y) || !inside(to.x, to.y)) return false;
    const piece = board[from.y]?.[from.x] || "";
    if (!piece || pieceColor(piece) !== side) return false;
    const target = board[to.y]?.[to.x] || "";
    if (target && (pieceColor(target) === side || target.toLowerCase() === "k")) return false;
    const pseudo = pseudoMovesOnBoard(board, from);
    if (!pseudo.some((square) => square.x === to.x && square.y === to.y)) return false;
    const next = cloneBoard(board);
    applyMoveToBoard(next, move);
    return !isKingInCheck(next, side);
  }

  function hasLegalMoves(board, side) {
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board[y][x];
        if (!piece || pieceColor(piece) !== side) continue;
        const from = { x, y };
        const moves = pseudoMovesOnBoard(board, from);
        if (moves.some((to) => isLegalMove(board, squareToUci(from) + squareToUci(to), side))) return true;
      }
    }
    return false;
  }

  function getLegalMovesForSquare(board, side, square) {
    const piece = board[square.y]?.[square.x] || "";
    if (!piece || pieceColor(piece) !== side) return [];
    return pseudoMovesOnBoard(board, square)
      .filter((to) => isLegalMove(board, squareToUci(square) + squareToUci(to), side));
  }

  function determineGameState(board, sideToMove) {
    const redKing = findKing(board, "w");
    const blackKing = findKing(board, "b");
    if (!redKing && !blackKing) return { finished: true, winnerSide: null, loserSide: null, reason: "draw" };
    if (!redKing) return { finished: true, winnerSide: "b", loserSide: "w", reason: "king-lost" };
    if (!blackKing) return { finished: true, winnerSide: "w", loserSide: "b", reason: "king-lost" };
    const inCheck = isKingInCheck(board, sideToMove);
    const movable = hasLegalMoves(board, sideToMove);
    if (!movable) {
      return {
        finished: true,
        winnerSide: sideToMove === "w" ? "b" : "w",
        loserSide: sideToMove,
        reason: inCheck ? "checkmate" : "no-moves"
      };
    }
    return { finished: false, winnerSide: null, loserSide: null, reason: "" };
  }

  function fileNumber(x, color) {
    return color === "w" ? 9 - x : x + 1;
  }

  function formatMoveNotation(move, board, side) {
    if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return move;
    const from = uciToSquare(move.slice(0, 2));
    const to = uciToSquare(move.slice(2, 4));
    const piece = board[from.y]?.[from.x] || "";
    if (!piece) return move;
    const color = pieceColor(piece) || side;
    const code = PIECE_CODES[piece.toLowerCase()] || piece.toUpperCase();
    const fromFile = fileNumber(from.x, color);
    const toFile = fileNumber(to.x, color);
    if (from.y === to.y) return `${code}${fromFile}-${toFile}`;
    const forward = color === "w" ? to.y > from.y : to.y < from.y;
    const sign = forward ? "." : "/";
    const lower = piece.toLowerCase();
    const target = lower === "n" || lower === "b" || lower === "a" ? toFile : Math.abs(to.y - from.y);
    return `${code}${fromFile}${sign}${target}`;
  }

  return {
    START_FEN,
    FILES,
    PIECE_CODES,
    parseFenState,
    parseFen,
    boardToCompactFen,
    boardToFen,
    cloneBoard,
    emptyBoard,
    squareToUci,
    uciToSquare,
    pieceColor,
    inside,
    applyMoveToBoard,
    isLegalMove,
    hasLegalMoves,
    getLegalMovesForSquare,
    isKingInCheck,
    findKing,
    determineGameState,
    formatMoveNotation
  };
});
