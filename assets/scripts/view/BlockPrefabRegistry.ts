import { BlockColor, BlockModel, BlockType } from '../model/BlockModel';

export default class BlockPrefabRegistry {
    public constructor(private readonly prefabs: cc.Prefab[]) {}

    public getPrefab(block: BlockModel): cc.Prefab {
        if (block.type !== BlockType.Normal) {
            return this.getSpecialPrefab(block.type) || this.getNormalPrefab(block.color);
        }

        return this.getNormalPrefab(block.color);
    }

    private getNormalPrefab(color: BlockColor): cc.Prefab {
        const indexByColor: { [key: string]: number } = {};

        indexByColor[BlockColor.Blue] = 0;
        indexByColor[BlockColor.Green] = 1;
        indexByColor[BlockColor.Pink] = 2;
        indexByColor[BlockColor.Red] = 3;
        indexByColor[BlockColor.Yellow] = 4;

        const index = indexByColor[color];
        return this.prefabs[index] || this.prefabs[0];
    }

    private getSpecialPrefab(type: BlockType): cc.Prefab {
        const indexByType: { [key: string]: number } = {};

        indexByType[BlockType.RadiusClear] = 5;
        indexByType[BlockType.RowClear] = 6;
        indexByType[BlockType.ColumnClear] = 7;
        indexByType[BlockType.FieldClear] = 8;

        return this.prefabs[indexByType[type]];
    }
}
