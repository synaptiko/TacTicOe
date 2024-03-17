export const isGameOver = (
  board: Map<string, string>,
  rowColCount: number
): boolean => {
  const boardArray: string[][] = [];
  for (let i = 0; i < rowColCount; i++) {
      boardArray.push([]);
      for (let j = 0; j < rowColCount; j++) {
          boardArray[i].push(board.get(`${i},${j}`) || 'gray');
      }
  }

  for (let i = 0; i < rowColCount; i++) {
      if (boardArray[i].every(cell => cell === 'hotpink') || boardArray[i].every(cell => cell === 'darkblue')) {
          return true; 
      }

      const col = boardArray.map(row => row[i]);
      if (col.every(cell => cell === 'hotpink') || col.every(cell => cell === 'darkblue')) {
          return true;
      }
  }

  const isBoardFull = boardArray.every(row => row.every(cell => cell !== 'gray'));
  if (isBoardFull) {
      return true; 
  }

  return false;
};
