#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';

type Side = 'w' | 'b';
type Piece = string;
type Move = { from: string; to: string; promotion?: string };

const FILES = 'abcdefgh';
const RANKS = '12345678';

function parseFen(fen: string) {
  const [placement, side] = fen.trim().split(/\s+/);
  const rows = placement.split('/');
  const board: string[] = [];
  for (const row of rows) {
    for (const ch of row) {
      if (/\d/.test(ch)) board.push(...'.'.repeat(Number(ch)));
      else board.push(ch);
    }
  }
  return { board, side: side as Side };
}

function idxToSquare(idx: number) {
  const row = Math.floor(idx / 8);
  const col = idx % 8;
  return `${FILES[col]}${8 - row}`;
}

function squareToIdx(square: string) {
  const col = FILES.indexOf(square[0]);
  const row = 8 - Number(square[1]);
  return row * 8 + col;
}

function colorOf(piece: Piece) {
  if (piece === '.') return null;
  return piece === piece.toUpperCase() ? 'w' : 'b';
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function generateLegalMoves(board: string[], side: Side): Move[] {
  const moves: Move[] = [];

  function pushIfLegal(fromIdx: number, toIdx: number, promotion?: string) {
    const from = idxToSquare(fromIdx);
    const to = idxToSquare(toIdx);
    moves.push({ from, to, promotion });
  }

  for (let i = 0; i < 64; i++) {
    const piece = board[i];
    if (piece === '.' || colorOf(piece) !== side) continue;
    const r = Math.floor(i / 8);
    const c = i % 8;
    const lower = piece.toLowerCase();

    if (lower === 'p') {
      const dir = side === 'w' ? -1 : 1;
      const startRank = side === 'w' ? 6 : 1;
      const promoRank = side === 'w' ? 0 : 7;

      const oneR = r + dir;
      if (inBounds(oneR, c) && board[oneR * 8 + c] === '.') {
        if (oneR === promoRank) pushIfLegal(i, oneR * 8 + c, 'q');
        else pushIfLegal(i, oneR * 8 + c);

        const twoR = r + dir * 2;
        if (r === startRank && board[twoR * 8 + c] === '.') {
          pushIfLegal(i, twoR * 8 + c);
        }
      }

      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr * 8 + nc];
        if (target !== '.' && colorOf(target) !== side) {
          if (nr === promoRank) pushIfLegal(i, nr * 8 + nc, 'q');
          else pushIfLegal(i, nr * 8 + nc);
        }
      }
      continue;
    }

    const knightDeltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    if (lower === 'n') {
      for (const [dr, dc] of knightDeltas) {
        const nr = r + dr, nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr * 8 + nc];
        if (target === '.' || colorOf(target) !== side) pushIfLegal(i, nr * 8 + nc);
      }
      continue;
    }

    const deltas: Record<string, number[][]> = {
      b: [[-1,-1],[-1,1],[1,-1],[1,1]],
      r: [[-1,0],[1,0],[0,-1],[0,1]],
      q: [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]],
      k: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
    };

    for (const [dr, dc] of deltas[lower] || []) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr * 8 + nc];
        if (target === '.' || colorOf(target) !== side) pushIfLegal(i, nr * 8 + nc);
        if (target !== '.' || lower === 'k') break;
        nr += dr;
        nc += dc;
      }
    }
  }

  return moves;
}

function main() {
  const fen = readFileSync(0, 'utf8').trim();
  const { board, side } = parseFen(fen);
  const legal = generateLegalMoves(board, side);
  if (!legal.length) return;
  const choice = legal[Math.floor(Math.random() * legal.length)];
  const move = `${choice.from}${choice.to}${choice.promotion || ''}`;
  process.stdout.write(move + '\n');
}

main();
