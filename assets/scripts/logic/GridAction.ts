import { BlockModel } from '../model/BlockModel';
import { GridPosition } from '../model/GridPosition';

export enum GridActionType {
    Remove = 'remove',
    Move = 'move',
    Spawn = 'spawn',
    CreateSuperTile = 'createSuperTile',
    Shuffle = 'shuffle',
    GameOver = 'gameOver',
}

export interface RemoveGridAction {
    type: GridActionType.Remove;
    block: BlockModel;
    position: GridPosition;
}

export interface MoveGridAction {
    type: GridActionType.Move;
    block: BlockModel;
    from: GridPosition;
    to: GridPosition;
}

export interface SpawnGridAction {
    type: GridActionType.Spawn;
    block: BlockModel;
    from: GridPosition;
    to: GridPosition;
}

export interface CreateSuperTileGridAction {
    type: GridActionType.CreateSuperTile;
    block: BlockModel;
    position: GridPosition;
}

export interface ShuffleGridAction {
    type: GridActionType.Shuffle;
    moves: MoveGridAction[];
    shuffleCount: number;
}

export interface GameOverGridAction {
    type: GridActionType.GameOver;
}

export type GridAction =
    RemoveGridAction
    | MoveGridAction
    | SpawnGridAction
    | CreateSuperTileGridAction
    | ShuffleGridAction
    | GameOverGridAction;

export interface GridTurnResult {
    actions: GridAction[];
    changed: boolean;
    gameOver: boolean;
}

export function createEmptyTurnResult(): GridTurnResult {
    return {
        actions: [],
        changed: false,
        gameOver: false,
    };
}
