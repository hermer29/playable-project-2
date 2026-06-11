import { GridPosition } from './GridPosition';

export enum BlockColor {
    Blue = 'blue',
    Green = 'green',
    Pink = 'pink',
    Red = 'red',
    Yellow = 'yellow',
}

export enum BlockType {
    Normal = 'normal',
    RowClear = 'rowClear',
    ColumnClear = 'columnClear',
    RadiusClear = 'radiusClear',
    FieldClear = 'fieldClear',
}

export interface BlockModel {
    id: number;
    color: BlockColor;
    type: BlockType;
    position: GridPosition;
}

export function isSpecialBlock(block: BlockModel): boolean {
    return block.type !== BlockType.Normal;
}

export function createBlock(
    id: number,
    color: BlockColor,
    type: BlockType,
    position: GridPosition,
): BlockModel {
    return {
        id,
        color,
        type,
        position: {
            row: position.row,
            column: position.column,
        },
    };
}
