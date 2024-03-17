import { alphaBeta } from "./alphaBeta";
import { returnPlayableCells } from "./returnPlayableCells";

export const findBestMove = (board: Map<string, string>, depth: number = 7) => {
    let bestMove = '';
    let bestScore = -Infinity;
    for (const move of returnPlayableCells(board)) {
        board.set(move, 'hotpink'); // computer
        const score = alphaBeta(board, depth - 1, -Infinity, Infinity, false);
        board.set(move, 'gray'); // reset
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}