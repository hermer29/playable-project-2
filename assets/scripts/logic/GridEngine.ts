import {
    BlockColor,
    BlockModel,
    BlockType,
    createBlock,
    isSpecialBlock,
} from '../model/BlockModel';
import GridModel from '../model/GridModel';
import { GridPosition, sameGridPosition } from '../model/GridPosition';
import BlockActivation from './BlockActivation';
import GravitySystem from './GravitySystem';
import {
    GridAction,
    GridActionType,
    GridTurnResult,
    MoveGridAction,
    RemoveGridAction,
    createEmptyTurnResult,
} from './GridAction';
import { GridRules, createDefaultGridRules } from './GridRules';
import ShuffleSystem from './ShuffleSystem';
import SpawnSystem from './SpawnSystem';

export default class GridEngine {
    private grid: GridModel;
    private nextBlockId = 1;
    private shuffleCount = 0;
    private gameOver = false;
    private readonly activation = new BlockActivation();
    private readonly gravity = new GravitySystem();
    private readonly spawn = new SpawnSystem();
    private readonly shuffle = new ShuffleSystem();

    public constructor(
        rows: number,
        columns: number,
        private readonly rules: GridRules = createDefaultGridRules(),
    ) {
        this.grid = new GridModel(rows, columns);
    }

    public getGrid(): GridModel {
        return this.grid;
    }

    public startNewGame(): GridTurnResult {
        const rows = this.grid.rows;
        const columns = this.grid.columns;

        this.shuffleCount = 0;
        this.gameOver = false;

        let actions: GridAction[] = [];

        for (let attempt = 0; attempt < 20; attempt++) {
            this.nextBlockId = 1;
            this.grid = new GridModel(rows, columns);
            actions = this.spawn.fillEmptyCells(this.grid, (position) => this.createNormalBlock(position));

            if (this.hasAvailableMove()) {
                break;
            }
        }

        this.resolveNoMoves(actions);

        return {
            actions,
            changed: actions.length > 0,
            gameOver: this.gameOver,
        };
    }

    public activate(position: GridPosition): GridTurnResult {
        if (this.gameOver) {
            return this.createGameOverResult();
        }

        const block = this.grid.getBlock(position);

        if (!block) {
            return createEmptyTurnResult();
        }

        const positions = this.activation.getActivationPositions(this.grid, position, this.rules);

        if (positions.length === 0) {
            return createEmptyTurnResult();
        }

        const actions: GridAction[] = [];
        const shouldCreateSuperTile = !isSpecialBlock(block)
            && positions.length >= this.rules.superTileThreshold;
        const removePositions = shouldCreateSuperTile
            ? positions.filter((item) => !sameGridPosition(item, position))
            : positions;

        actions.push(...this.removePositions(removePositions));

        if (shouldCreateSuperTile) {
            block.type = this.pickSuperTileType();

            actions.push({
                type: GridActionType.CreateSuperTile,
                block,
                position: {
                    row: position.row,
                    column: position.column,
                },
            });
        }

        return this.settleBoard(actions);
    }

    public activateBombBooster(position: GridPosition, radius: number = this.rules.bombBoosterRadius): GridTurnResult {
        if (this.gameOver) {
            return this.createGameOverResult();
        }

        const positions = this.activation.getRadiusPositions(this.grid, position, radius);
        const actions = this.removePositions(positions);

        return this.settleBoard(actions);
    }

    public teleportSwap(a: GridPosition, b: GridPosition): GridTurnResult {
        if (this.gameOver) {
            return this.createGameOverResult();
        }

        const first = this.grid.getBlock(a);
        const second = this.grid.getBlock(b);

        if (!first || !second || sameGridPosition(a, b)) {
            return createEmptyTurnResult();
        }

        this.grid.swap(a, b);

        const actions: MoveGridAction[] = [
            {
                type: GridActionType.Move,
                block: first,
                from: { row: a.row, column: a.column },
                to: { row: b.row, column: b.column },
            },
            {
                type: GridActionType.Move,
                block: second,
                from: { row: b.row, column: b.column },
                to: { row: a.row, column: a.column },
            },
        ];

        return {
            actions,
            changed: true,
            gameOver: false,
        };
    }

    private settleBoard(actions: GridAction[]): GridTurnResult {
        if (actions.length === 0) {
            return createEmptyTurnResult();
        }

        actions.push(...this.gravity.apply(this.grid));
        actions.push(...this.spawn.fillEmptyCells(this.grid, (position) => this.createNormalBlock(position)));
        this.resolveNoMoves(actions);

        return {
            actions,
            changed: true,
            gameOver: this.gameOver,
        };
    }

    private removePositions(positions: GridPosition[]): RemoveGridAction[] {
        const actions: RemoveGridAction[] = [];

        for (let i = 0; i < positions.length; i++) {
            const position = positions[i];
            const block = this.grid.removeBlock(position);

            if (block) {
                actions.push({
                    type: GridActionType.Remove,
                    block,
                    position: {
                        row: position.row,
                        column: position.column,
                    },
                });
            }
        }

        return actions;
    }

    private resolveNoMoves(actions: GridAction[]): void {
        while (!this.hasAvailableMove()) {
            if (this.shuffleCount >= this.rules.maxShuffleCount) {
                this.gameOver = true;
                actions.push({ type: GridActionType.GameOver });
                return;
            }

            this.shuffleCount++;

            actions.push({
                type: GridActionType.Shuffle,
                moves: this.shuffle.shuffle(this.grid),
                shuffleCount: this.shuffleCount,
            });
        }
    }

    private hasAvailableMove(): boolean {
        if (this.grid.hasBurnableGroup(this.rules.minGroupSize)) {
            return true;
        }

        const blocks = this.grid.getAllBlocks();

        for (let i = 0; i < blocks.length; i++) {
            if (isSpecialBlock(blocks[i])) {
                return true;
            }
        }

        return false;
    }

    private createNormalBlock(position: GridPosition): BlockModel {
        return createBlock(
            this.nextBlockId++,
            this.pickRandomColor(),
            BlockType.Normal,
            position,
        );
    }

    private pickRandomColor(): BlockColor {
        const colors = this.rules.spawnColors;
        const index = Math.floor(Math.random() * colors.length);

        return colors[index];
    }

    private pickSuperTileType(): BlockType {
        const types = [
            BlockType.RowClear,
            BlockType.ColumnClear,
            BlockType.RadiusClear,
            BlockType.FieldClear,
        ];
        const index = Math.floor(Math.random() * types.length);

        return types[index];
    }

    private createGameOverResult(): GridTurnResult {
        return {
            actions: [{ type: GridActionType.GameOver }],
            changed: false,
            gameOver: true,
        };
    }
}
