export const hasGameEnded = (board: Map<string, string>, x: string, y: string, rowColCount: number): boolean => {
    const currentValue = board.get(`${x}:${y}`);
  
    // check rows
    const isRowFull = [...Array(rowColCount).keys()].every(i => board.get(`${x}:${i}`) === currentValue);
  
    if (isRowFull) return true;
  
    // check columns
    const isColumnFull = [...Array(rowColCount).keys()].every(i => board.get(`${i}:${y}`) === currentValue);
  
    return isColumnFull;
  };