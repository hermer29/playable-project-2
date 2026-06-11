export interface GridPosition {
    row: number;
    column: number;
}

export function gridPosition(row: number, column: number): GridPosition {
    return { row, column };
}

export function gridPositionKey(position: GridPosition): string {
    return position.row + ':' + position.column;
}

export function sameGridPosition(a: GridPosition, b: GridPosition): boolean {
    return a.row === b.row && a.column === b.column;
}
