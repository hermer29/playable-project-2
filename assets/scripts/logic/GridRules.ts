import { BlockColor } from '../model/BlockModel';

export interface GridRules {
    minGroupSize: number;
    superTileThreshold: number;
    maxShuffleCount: number;
    bombBoosterRadius: number;
    specialRadius: number;
    spawnColors: BlockColor[];
}

export function createDefaultGridRules(): GridRules {
    return {
        minGroupSize: 2,
        superTileThreshold: 6,
        maxShuffleCount: 3,
        bombBoosterRadius: 1,
        specialRadius: 1,
        spawnColors: [
            BlockColor.Blue,
            BlockColor.Green,
            BlockColor.Pink,
            BlockColor.Red,
            BlockColor.Yellow,
        ],
    };
}
