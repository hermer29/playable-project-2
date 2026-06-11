import { BlockModel } from '../model/BlockModel';
import { GridPosition } from '../model/GridPosition';
import {
    CreateSuperTileGridAction,
    GridAction,
    GridActionType,
    MoveGridAction,
    RemoveGridAction,
    SpawnGridAction,
    ShuffleGridAction,
} from '../logic/GridAction';
import BlockPrefabRegistry from './BlockPrefabRegistry';
import BlockView, { BlockClickHandler } from './BlockView';

export interface GridViewConfig {
    rows: number;
    columns: number;
    from: cc.Vec2;
    to: cc.Vec2;
    parent: cc.Node;
    registry: BlockPrefabRegistry;
    onBlockClick: BlockClickHandler;
}

export default class GridView {
    private readonly rows: number;
    private readonly columns: number;
    private readonly from: cc.Vec2;
    private readonly to: cc.Vec2;
    private readonly parent: cc.Node;
    private readonly registry: BlockPrefabRegistry;
    private readonly onBlockClick: BlockClickHandler;
    private readonly nodesByBlockId: { [blockId: string]: cc.Node } = {};
    private inputEnabled = true;

    public constructor(config: GridViewConfig) {
        this.rows = config.rows;
        this.columns = config.columns;
        this.from = config.from;
        this.to = config.to;
        this.parent = config.parent;
        this.registry = config.registry;
        this.onBlockClick = config.onBlockClick;
    }

    public clear(): void {
        const ids = Object.keys(this.nodesByBlockId);

        for (let i = 0; i < ids.length; i++) {
            const node = this.nodesByBlockId[ids[i]];

            if (cc.isValid(node)) {
                node.destroy();
            }

            delete this.nodesByBlockId[ids[i]];
        }
    }

    public setInputEnabled(enabled: boolean): void {
        this.inputEnabled = enabled;
    }

    public animateVictoryScatter(): Promise<void> {
        this.setInputEnabled(false);

        const ids = Object.keys(this.nodesByBlockId);
        const animations: Array<Promise<void>> = [];
        const center = cc.v2(
            cc.misc.lerp(this.from.x, this.to.x, 0.5),
            cc.misc.lerp(this.from.y, this.to.y, 0.5),
        );
        const scatterDistance = Math.max(
            Math.abs(this.to.x - this.from.x),
            Math.abs(this.to.y - this.from.y),
        ) * 0.75 + Math.max(this.getCellWidth(), this.getCellHeight()) * 2;

        for (let i = 0; i < ids.length; i++) {
            const node = this.nodesByBlockId[ids[i]];

            if (!cc.isValid(node)) {
                delete this.nodesByBlockId[ids[i]];
                continue;
            }

            const startPosition = node.getPosition();
            let directionX = startPosition.x - center.x;
            let directionY = startPosition.y - center.y;

            if (Math.abs(directionX) < 0.01 && Math.abs(directionY) < 0.01) {
                const angle = i * 2.399963;
                directionX = Math.cos(angle);
                directionY = Math.sin(angle);
            }

            const directionLength = Math.max(1, Math.sqrt(directionX * directionX + directionY * directionY));
            const distance = scatterDistance + (i % 5) * 25;
            const targetPosition = cc.v2(
                startPosition.x + directionX / directionLength * distance,
                startPosition.y + directionY / directionLength * distance,
            );
            const spin = (i % 2 === 0 ? 1 : -1) * (180 + (i % 4) * 45);
            const delay = (i % 9) * 0.025;

            animations.push(new Promise<void>((resolve) => {
                cc.tween(node)
                    .delay(delay)
                    .to(0.12, { scale: 1.18 }, { easing: 'quadOut' })
                    .to(0.55, {
                        position: targetPosition,
                        angle: node.angle + spin,
                        scale: 0.1,
                        opacity: 0,
                    }, { easing: 'quadIn' })
                    .call(resolve)
                    .start();
            }));
        }

        return Promise.all(animations).then(() => undefined);
    }

    public applyActions(actions: GridAction[]): Promise<void> {
        let sequence: Promise<void> = Promise.resolve();
        let batch: Array<Promise<void>> = [];
        let batchType: GridActionType = null;

        const flushBatch = () => {
            if (batch.length === 0) {
                return;
            }

            const currentBatch = batch;
            batch = [];
            batchType = null;
            sequence = sequence.then(() => Promise.all(currentBatch).then(() => undefined));
        };

        const pushBatched = (type: GridActionType, animation: Promise<void>) => {
            if (batchType && batchType !== type) {
                flushBatch();
            }

            batchType = type;
            batch.push(animation);
        };

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];

            switch (action.type) {
                case GridActionType.Remove:
                    pushBatched(GridActionType.Remove, this.animateRemove(action));
                    break;

                case GridActionType.Move:
                    pushBatched(GridActionType.Move, this.animateMove(action));
                    break;

                case GridActionType.Spawn:
                    pushBatched(GridActionType.Spawn, this.animateSpawn(action));
                    break;

                case GridActionType.CreateSuperTile:
                    flushBatch();
                    sequence = sequence.then(() => {
                        this.replaceBlockNode(action);
                    });
                    break;

                case GridActionType.Shuffle:
                    flushBatch();
                    sequence = sequence.then(() => this.animateShuffle(action));
                    break;

                case GridActionType.GameOver:
                    flushBatch();
                    sequence = sequence.then(() => {
                        cc.warn('[GridEngine] Game over: no available moves after shuffles.');
                    });
                    break;
            }
        }

        flushBatch();
        return sequence;
    }

    private animateRemove(action: RemoveGridAction): Promise<void> {
        const node = this.nodesByBlockId[action.block.id];

        if (!cc.isValid(node)) {
            delete this.nodesByBlockId[action.block.id];
            return Promise.resolve();
        }

        delete this.nodesByBlockId[action.block.id];

        return new Promise<void>((resolve) => {
            cc.tween(node)
                .to(0.12, { opacity: 0, scale: 0.15 }, { easing: 'quadIn' })
                .call(() => {
                    if (cc.isValid(node)) {
                        node.destroy();
                    }

                    resolve();
                })
                .start();
        });
    }

    private animateMove(action: MoveGridAction): Promise<void> {
        const node = this.nodesByBlockId[action.block.id];

        if (!cc.isValid(node)) {
            return Promise.resolve();
        }

        this.updateBlockView(node, action.block.id, action.to);

        return new Promise<void>((resolve) => {
            cc.tween(node)
                .to(0.18, { position: this.positionToLocal(action.to) }, { easing: 'quadOut' })
                .call(resolve)
                .start();
        });
    }

    private animateSpawn(action: SpawnGridAction): Promise<void> {
        const node = this.createBlockNode(action.block, action.from);

        if (!node) {
            return Promise.resolve();
        }

        this.updateBlockView(node, action.block.id, action.to);

        return new Promise<void>((resolve) => {
            cc.tween(node)
                .to(0.22, { position: this.positionToLocal(action.to) }, { easing: 'quadOut' })
                .call(resolve)
                .start();
        });
    }

    private animateShuffle(action: ShuffleGridAction): Promise<void> {
        const animations: Array<Promise<void>> = [];

        for (let i = 0; i < action.moves.length; i++) {
            animations.push(this.animateMove(action.moves[i]));
        }

        return Promise.all(animations).then(() => undefined);
    }

    private replaceBlockNode(action: CreateSuperTileGridAction): void {
        const block = action.block;
        const oldNode = this.nodesByBlockId[block.id];
        const startPosition = cc.isValid(oldNode)
            ? oldNode.getPosition()
            : this.positionToLocal(action.position);

        if (cc.isValid(oldNode)) {
            oldNode.destroy();
        }

        const node = this.createBlockNode(block, action.position);

        if (node) {
            node.setPosition(startPosition);
        }
    }

    private createBlockNode(block: BlockModel, position: GridPosition): cc.Node {
        const prefab = this.registry.getPrefab(block);

        if (!prefab) {
            cc.warn('[GridView] No prefab for block type.');
            return null;
        }

        const node = cc.instantiate(prefab);

        node.setParent(this.parent);
        node.setPosition(this.positionToLocal(position));
        node.setContentSize(this.getCellWidth(), this.getCellHeight());
        node.opacity = 255;
        node.setScale(1, 1);

        this.nodesByBlockId[block.id] = node;
        this.updateBlockView(node, block.id, block.position);

        return node;
    }

    private updateBlockView(node: cc.Node, blockId: number, position: GridPosition): void {
        let blockView = node.getComponent(BlockView);

        if (!blockView) {
            blockView = node.addComponent(BlockView);
        }

        blockView.init(blockId, position, (clickedPosition, clickedBlockId) => {
            if (this.inputEnabled) {
                this.onBlockClick(clickedPosition, clickedBlockId);
            }
        });
    }

    private positionToLocal(position: GridPosition): cc.Vec2 {
        const xProgress = this.columns === 1 ? 0.5 : position.column / (this.columns - 1);
        const yProgress = this.rows === 1 ? 0.5 : position.row / (this.rows - 1);

        return cc.v2(
            cc.misc.lerp(this.from.x, this.to.x, xProgress),
            cc.misc.lerp(this.from.y, this.to.y, yProgress),
        );
    }

    private getCellWidth(): number {
        return this.columns <= 1
            ? 80
            : Math.abs(this.to.x - this.from.x) / (this.columns - 1);
    }

    private getCellHeight(): number {
        return this.rows <= 1
            ? 80
            : Math.abs(this.to.y - this.from.y) / (this.rows - 1);
    }
}
