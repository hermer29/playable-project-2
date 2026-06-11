import { BlockModel, BlockType, isSpecialBlock } from './BlockModel';
import { GridPosition, gridPosition, gridPositionKey } from './GridPosition';

export default class GridModel {
    private cells: Array<Array<BlockModel | null>>;

    public constructor(
        public readonly rows: number,
        public readonly columns: number,
    ) {
        this.cells = [];

        for (let row = 0; row < rows; row++) {
            const gridRow: Array<BlockModel | null> = [];

            for (let column = 0; column < columns; column++) {
                gridRow.push(null);
            }

            this.cells.push(gridRow);
        }
    }

    public isInside(position: GridPosition): boolean {
        return position.row >= 0
            && position.row < this.rows
            && position.column >= 0
            && position.column < this.columns;
    }

    public getBlock(position: GridPosition): BlockModel | null {
        if (!this.isInside(position)) {
            return null;
        }

        return this.cells[position.row][position.column];
    }

    public setBlock(position: GridPosition, block: BlockModel | null): void {
        if (!this.isInside(position)) {
            return;
        }

        this.cells[position.row][position.column] = block;

        if (block) {
            block.position = {
                row: position.row,
                column: position.column,
            };
        }
    }

    public removeBlock(position: GridPosition): BlockModel | null {
        const block = this.getBlock(position);

        if (!block) {
            return null;
        }

        this.setBlock(position, null);
        return block;
    }

    public removeBlocks(positions: GridPosition[]): BlockModel[] {
        const removed: BlockModel[] = [];

        for (let i = 0; i < positions.length; i++) {
            const block = this.removeBlock(positions[i]);

            if (block) {
                removed.push(block);
            }
        }

        return removed;
    }

    public swap(a: GridPosition, b: GridPosition): boolean {
        if (!this.isInside(a) || !this.isInside(b)) {
            return false;
        }

        const first = this.getBlock(a);
        const second = this.getBlock(b);

        this.setBlock(a, second);
        this.setBlock(b, first);
        return true;
    }

    public getNeighbors(position: GridPosition): GridPosition[] {
        const candidates = [
            gridPosition(position.row - 1, position.column),
            gridPosition(position.row + 1, position.column),
            gridPosition(position.row, position.column - 1),
            gridPosition(position.row, position.column + 1),
        ];
        const neighbors: GridPosition[] = [];

        for (let i = 0; i < candidates.length; i++) {
            if (this.isInside(candidates[i])) {
                neighbors.push(candidates[i]);
            }
        }

        return neighbors;
    }

    public getAllPositions(): GridPosition[] {
        const positions: GridPosition[] = [];

        for (let row = 0; row < this.rows; row++) {
            for (let column = 0; column < this.columns; column++) {
                positions.push(gridPosition(row, column));
            }
        }

        return positions;
    }

    public getAllBlocks(): BlockModel[] {
        const blocks: BlockModel[] = [];

        for (let row = 0; row < this.rows; row++) {
            for (let column = 0; column < this.columns; column++) {
                const block = this.cells[row][column];

                if (block) {
                    blocks.push(block);
                }
            }
        }

        return blocks;
    }

    public findConnectedGroup(start: GridPosition): GridPosition[] {
        const startBlock = this.getBlock(start);

        if (!startBlock || isSpecialBlock(startBlock)) {
            return [];
        }

        const result: GridPosition[] = [];
        const visited: { [key: string]: boolean } = {};
        const stack: GridPosition[] = [start];

        visited[gridPositionKey(start)] = true;

        while (stack.length > 0) {
            const current = stack.pop();

            if (!current) {
                continue;
            }

            const currentBlock = this.getBlock(current);

            if (!currentBlock
                || currentBlock.type !== BlockType.Normal
                || currentBlock.color !== startBlock.color) {
                continue;
            }

            result.push(current);

            const neighbors = this.getNeighbors(current);

            for (let i = 0; i < neighbors.length; i++) {
                const neighbor = neighbors[i];
                const key = gridPositionKey(neighbor);

                if (!visited[key]) {
                    visited[key] = true;
                    stack.push(neighbor);
                }
            }
        }

        return result;
    }

    public hasBurnableGroup(minGroupSize: number): boolean {
        const visited: { [key: string]: boolean } = {};

        for (let row = 0; row < this.rows; row++) {
            for (let column = 0; column < this.columns; column++) {
                const position = gridPosition(row, column);
                const key = gridPositionKey(position);

                if (visited[key]) {
                    continue;
                }

                const group = this.findConnectedGroup(position);

                for (let i = 0; i < group.length; i++) {
                    visited[gridPositionKey(group[i])] = true;
                }

                if (group.length >= minGroupSize) {
                    return true;
                }
            }
        }

        return false;
    }
}
