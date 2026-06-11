import GridModel from '../model/GridModel';
import { gridPosition } from '../model/GridPosition';
import { GridActionType, MoveGridAction } from './GridAction';

export default class GravitySystem {
    public apply(grid: GridModel): MoveGridAction[] {
        const moves: MoveGridAction[] = [];

        for (let column = 0; column < grid.columns; column++) {
            let writeRow = grid.rows - 1;

            for (let readRow = grid.rows - 1; readRow >= 0; readRow--) {
                const from = gridPosition(readRow, column);
                const block = grid.getBlock(from);

                if (!block) {
                    continue;
                }

                const to = gridPosition(writeRow, column);

                if (readRow !== writeRow) {
                    grid.setBlock(to, block);
                    grid.setBlock(from, null);

                    moves.push({
                        type: GridActionType.Move,
                        block,
                        from,
                        to,
                    });
                }

                writeRow--;
            }
        }

        return moves;
    }
}
