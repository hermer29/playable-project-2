import { BlockModel } from '../model/BlockModel';
import GridModel from '../model/GridModel';
import { GridPosition, gridPosition } from '../model/GridPosition';
import { GridActionType, SpawnGridAction } from './GridAction';

export type BlockFactory = (position: GridPosition) => BlockModel;

export default class SpawnSystem {
    public fillEmptyCells(grid: GridModel, createBlock: BlockFactory): SpawnGridAction[] {
        const actions: SpawnGridAction[] = [];

        for (let column = 0; column < grid.columns; column++) {
            const emptyRows: number[] = [];

            for (let row = 0; row < grid.rows; row++) {
                if (!grid.getBlock(gridPosition(row, column))) {
                    emptyRows.push(row);
                }
            }

            for (let i = 0; i < emptyRows.length; i++) {
                const to = gridPosition(emptyRows[i], column);
                const from = gridPosition(i - emptyRows.length, column);
                const block = createBlock(to);

                grid.setBlock(to, block);

                actions.push({
                    type: GridActionType.Spawn,
                    block,
                    from,
                    to,
                });
            }
        }

        return actions;
    }
}
