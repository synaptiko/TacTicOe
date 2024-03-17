export const evaluateBoard = (board: Map<string, string>): number => {
    const boardArray: string[][] = [];
    for (let i = 0; i < 7; i++) {
        boardArray.push([]);
        for (let j = 0; j < 7; j++) {
            boardArray[i].push(board.get(`${i},${j}`) || 'gray');
        }
    }

    for (let i = 0; i < 7; i++) {
        if (boardArray[i].every(cell => cell === 'hotpink')) return 10; // 'hotpink' wins
        if (boardArray[i].every(cell => cell === 'darkblue')) return -10; // 'darkblue' wins
    }

    for (let j = 0; j < 7; j++) {
        const col = boardArray.map(row => row[j]);
        if (col.every(cell => cell === 'hotpink')) return 10; // 'hotpink' wins
        if (col.every(cell => cell === 'darkblue')) return -10; // 'darkblue' wins
    }

    return 0;
}