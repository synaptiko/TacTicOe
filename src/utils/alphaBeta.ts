import { evaluateBoard } from "./evaluateBoard";
import { isGameOver } from "./isGameOver";
import { returnPlayableCells } from "./returnPlayableCells";

export const alphaBeta = (
  board: Map<string, string>,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizingPlayer: boolean
) => {
  if (depth === 0 || isGameOver(board, 7)) {
    return evaluateBoard(board);
  }

  if (isMaximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of returnPlayableCells(board)) {
      board.set(move, "hotpink"); 
      const evaluation = alphaBeta(board, depth - 1, alpha, beta, false);
      board.set(move, "gray"); 
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) {
        break; 
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of returnPlayableCells(board)) {
      board.set(move, "darkblue"); 
      const evaluation = alphaBeta(board, depth - 1, alpha, beta, true);
      board.set(move, "gray"); 
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) {
        break; 
      }
    }
    return minEval;
  }
};
