export const returnPlayableCells = (board: Map<string,string>): string[] => {
    return Array.from(board.entries()).filter(([, value]) => value === 'gray').map(([key]) => key);
}