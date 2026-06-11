import { BlockModel, BlockType, isSpecialBlock } from '../model/BlockModel';
import GridModel from '../model/GridModel';
import { GridPosition, gridPosition } from '../model/GridPosition';
import { GridRules } from './GridRules';

export default class BlockActivation {
    public getActivationPositions(grid: GridModel, position: GridPosition, rules: GridRules): GridPosition[] {
        const block = grid.getBlock(position);

        if (!block) {
            return [];
        }

        if (!isSpecialBlock(block)) {
            const group = grid.findConnectedGroup(position);
            return group.length >= rules.minGroupSize ? group : [];
        }

        return this.getSpecialActivationPositions(grid, block, position, rules);
    }

    public getRadiusPositions(grid: GridModel, center: GridPosition, radius: number): GridPosition[] {
        const positions: GridPosition[] = [];

        for (let row = center.row - radius; row <= center.row + radius; row++) {
            for (let column = center.column - radius; column <= center.column + radius; column++) {
                const position = gridPosition(row, column);

                if (grid.isInside(position)
                    && Math.abs(center.row - row) + Math.abs(center.column - column) <= radius) {
                    positions.push(position);
                }
            }
        }

        return positions;
    }

    private getSpecialActivationPositions(
        grid: GridModel,
        block: BlockModel,
        position: GridPosition,
        rules: GridRules,
    ): GridPosition[] {
        switch (block.type) {
            case BlockType.RowClear:
                return this.getRowPositions(grid, position.row);

            case BlockType.ColumnClear:
                return this.getColumnPositions(grid, position.column);

            case BlockType.RadiusClear:
                return this.getRadiusPositions(grid, position, rules.specialRadius);

            case BlockType.FieldClear:
                return grid.getAllPositions();

            default:
                return [];
        }
    }

    private getRowPositions(grid: GridModel, row: number): GridPosition[] {
        const positions: GridPosition[] = [];

        for (let column = 0; column < grid.columns; column++) {
            positions.push(gridPosition(row, column));
        }

        return positions;
    }

    private getColumnPositions(grid: GridModel, column: number): GridPosition[] {
        const positions: GridPosition[] = [];

        for (let row = 0; row < grid.rows; row++) {
            positions.push(gridPosition(row, column));
        }

        return positions;
    }
}
