import GridModel from '../model/GridModel';
import { GridActionType, MoveGridAction } from './GridAction';

export default class ShuffleSystem {
    public shuffle(grid: GridModel): MoveGridAction[] {
        const positions = grid.getAllPositions();
        const blocks = grid.getAllBlocks();
        const shuffled = blocks.slice();
        const moves: MoveGridAction[] = [];

        this.shuffleArray(shuffled);

        for (let i = 0; i < positions.length; i++) {
            grid.setBlock(positions[i], null);
        }

        for (let i = 0; i < shuffled.length; i++) {
            const block = shuffled[i];
            const from = {
                row: block.position.row,
                column: block.position.column,
            };
            const to = positions[i];

            grid.setBlock(to, block);

            if (from.row !== to.row || from.column !== to.column) {
                moves.push({
                    type: GridActionType.Move,
                    block,
                    from,
                    to,
                });
            }
        }

        return moves;
    }

    private shuffleArray<T>(items: T[]): void {
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const item = items[i];

            items[i] = items[j];
            items[j] = item;
        }
    }
}
