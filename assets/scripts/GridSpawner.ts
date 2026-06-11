import GridEngine from './logic/GridEngine';
import { GridActionType, GridTurnResult } from './logic/GridAction';
import { createDefaultGridRules, GridRules } from './logic/GridRules';
import { GridPosition, gridPosition } from './model/GridPosition';
import BlockPrefabRegistry from './view/BlockPrefabRegistry';
import GridView from './view/GridView';

const { ccclass, executeInEditMode, property } = cc._decorator;
const GRID_GIZMO_NODE_NAME = '__GridSpawnerGizmo';

@ccclass
@executeInEditMode
export default class GridSpawner extends cc.Component {
    @property({
        type: cc.Node,
        tooltip: 'Optional scene node for the first grid diagonal corner.',
    })
    public fromPoint: cc.Node = null;

    @property({
        type: cc.Node,
        tooltip: 'Optional scene node for the opposite grid diagonal corner.',
    })
    public toPoint: cc.Node = null;

    @property({
        type: cc.Vec2,
        tooltip: 'Fallback local position of the first grid diagonal corner.',
    })
    public from: cc.Vec2 = cc.v2(-200, 200);

    @property({
        type: cc.Vec2,
        tooltip: 'Fallback local position of the opposite grid diagonal corner.',
    })
    public to: cc.Vec2 = cc.v2(200, -200);

    @property({
        tooltip: 'Grid row count.',
        min: 1,
    })
    public rows: number = 8;

    @property({
        tooltip: 'Grid column count.',
        min: 1,
    })
    public columns: number = 8;

    @property({
        type: [cc.Prefab],
        tooltip: 'Prefabs used for random spawn selection.',
    })
    public prefabs: cc.Prefab[] = [];

    @property({
        type: cc.Node,
        tooltip: 'Parent for spawned nodes. Current node is used when empty.',
    })
    public spawnParent: cc.Node = null;

    @property({
        tooltip: 'Spawn the grid on scene start.',
    })
    public spawnOnLoad: boolean = true;

    @property({
        tooltip: 'Remove previously spawned nodes before spawning again.',
    })
    public clearBeforeSpawn: boolean = true;

    @property({
        type: cc.Label,
        tooltip: 'Label that shows current score and target score.',
    })
    public scoreLabel: cc.Label = null;

    @property({
        type: cc.Label,
        tooltip: 'Label that shows remaining moves.',
    })
    public movesLabel: cc.Label = null;

    @property({
        tooltip: 'Score required to win.',
        min: 1,
    })
    public targetScore: number = 500;

    @property({
        tooltip: 'Delay before starting a new game after reaching the target score.',
        min: 0,
    })
    public victoryReplayDelay: number = 1;

    @property({
        tooltip: 'Moves available before losing.',
        min: 1,
    })
    public maxMoves: number = 30;

    @property({
        tooltip: 'Score awarded for each burned block.',
        min: 1,
    })
    public pointsPerBlock: number = 1;

    @property({
        tooltip: 'Minimum connected same-color group size that can be burned.',
        min: 2,
    })
    public minGroupSize: number = 2;

    @property({
        tooltip: 'Group size that turns the clicked block into a super tile.',
        min: 2,
    })
    public superTileThreshold: number = 6;

    @property({
        tooltip: 'Automatic shuffles allowed before game over.',
        min: 0,
    })
    public maxShuffleCount: number = 3;

    @property({
        tooltip: 'Bomb booster burn radius in grid cells.',
        min: 1,
    })
    public bombBoosterRadius: number = 1;

    @property({
        tooltip: 'Radius used by radius super tiles.',
        min: 1,
    })
    public specialRadius: number = 1;

    @property({
        tooltip: 'Show the grid gizmo in the editor scene view.',
    })
    public showGridGizmo: boolean = true;

    @property({
        type: cc.Color,
        tooltip: 'Color of the inner gizmo grid lines.',
    })
    public gizmoLineColor: cc.Color = new cc.Color(0, 200, 255, 120);

    @property({
        type: cc.Color,
        tooltip: 'Color of the gizmo border.',
    })
    public gizmoBorderColor: cc.Color = new cc.Color(0, 200, 255, 220);

    @property({
        type: cc.Color,
        tooltip: 'Color of the gizmo spawn points.',
    })
    public gizmoPointColor: cc.Color = new cc.Color(255, 255, 255, 180);

    @property({
        tooltip: 'Gizmo line width.',
        min: 1,
    })
    public gizmoLineWidth: number = 2;

    @property({
        tooltip: 'Radius of each gizmo spawn point.',
        min: 1,
    })
    public gizmoPointRadius: number = 4;

    private engine: GridEngine = null;
    private gridView: GridView = null;
    private isAnimating = false;
    private currentScore = 0;
    private remainingMoves = 0;
    private isGameFinished = false;
    private isPlayingVictoryAnimation = false;

    protected onEnable(): void {
        this.drawGridGizmo();
    }

    protected onDisable(): void {
        this.unschedule(this.restartAfterVictory);
        this.isPlayingVictoryAnimation = false;
        this.clearGridGizmo();
    }

    protected update(): void {
        this.drawGridGizmo();
    }

    protected start(): void {
        if (CC_EDITOR) {
            return;
        }

        this.bindHudLabels();
        this.currentScore = 0;
        this.remainingMoves = Math.max(1, Math.floor(this.maxMoves));
        this.updateHud();

        if (this.spawnOnLoad) {
            this.spawnGrid();
        }
    }

    public spawnGrid(): void {
        if (this.clearBeforeSpawn) {
            this.clearGrid();
        }

        if (this.prefabs.length < 5) {
            cc.warn('[GridSpawner] Add at least five simple block prefabs.');
            return;
        }

        const parent = this.spawnParent || this.node;
        const rows = Math.max(1, Math.floor(this.rows));
        const columns = Math.max(1, Math.floor(this.columns));
        const from = this.getPointInParentSpace(this.fromPoint, this.from, parent);
        const to = this.getPointInParentSpace(this.toPoint, this.to, parent);

        this.engine = new GridEngine(rows, columns, this.createRules());
        this.gridView = new GridView({
            rows,
            columns,
            from,
            to,
            parent,
            registry: new BlockPrefabRegistry(this.prefabs),
            onBlockClick: (position) => this.handleBlockClick(position),
        });
        this.currentScore = 0;
        this.remainingMoves = Math.max(1, Math.floor(this.maxMoves));
        this.isGameFinished = false;
        this.updateHud();

        this.runTurn(this.engine.startNewGame(), false);
    }

    public clearGrid(): void {
        this.unschedule(this.restartAfterVictory);

        if (this.gridView) {
            this.gridView.clear();
            this.gridView = null;
        } else {
            const parent = this.spawnParent || this.node;
            const children = parent.children.slice();

            for (let i = 0; i < children.length; i++) {
                if (children[i].name !== GRID_GIZMO_NODE_NAME && cc.isValid(children[i])) {
                    children[i].destroy();
                }
            }
        }

        this.engine = null;
        this.isAnimating = false;
        this.isGameFinished = false;
        this.isPlayingVictoryAnimation = false;
    }

    public activateBombBooster(row: number, column: number): void {
        if (!this.engine || this.isAnimating || this.isGameFinished) {
            return;
        }

        this.runTurn(this.engine.activateBombBooster(gridPosition(row, column), this.bombBoosterRadius), true);
    }

    public teleportSwap(fromRow: number, fromColumn: number, toRow: number, toColumn: number): void {
        if (!this.engine || this.isAnimating || this.isGameFinished) {
            return;
        }

        this.runTurn(this.engine.teleportSwap(
            gridPosition(fromRow, fromColumn),
            gridPosition(toRow, toColumn),
        ), true);
    }

    private handleBlockClick(position: GridPosition): void {
        if (!this.engine || this.isAnimating || this.isGameFinished) {
            return;
        }

        this.runTurn(this.engine.activate(position), true);
    }

    private runTurn(result: GridTurnResult, consumeMove: boolean): void {
        if (!this.gridView || result.actions.length === 0) {
            return;
        }

        this.applyTurnStats(result, consumeMove);
        this.isAnimating = true;
        this.gridView.setInputEnabled(false);
        this.gridView.applyActions(result.actions).then(() => {
            this.isAnimating = false;

            if (this.gridView && !this.isGameFinished && !result.gameOver) {
                this.gridView.setInputEnabled(true);
            } else if (this.isVictoryReached()) {
                this.playVictoryAndRestart();
            }
        }).catch((error) => {
            cc.error('[GridSpawner] Failed to apply grid actions.', error);
            this.isAnimating = false;

            if (this.gridView && !this.isGameFinished && !result.gameOver) {
                this.gridView.setInputEnabled(true);
            } else if (this.isVictoryReached()) {
                this.playVictoryAndRestart();
            }
        });
    }

    private applyTurnStats(result: GridTurnResult, consumeMove: boolean): void {
        if (consumeMove && result.changed) {
            this.remainingMoves = Math.max(0, this.remainingMoves - 1);
        }

        this.currentScore += this.countRemovedBlocks(result) * Math.max(1, Math.floor(this.pointsPerBlock));

        if (this.currentScore >= Math.max(1, Math.floor(this.targetScore))) {
            this.isGameFinished = true;
            cc.log('[GridSpawner] Victory.');
        } else if (this.remainingMoves <= 0 || result.gameOver) {
            this.isGameFinished = true;
            cc.warn('[GridSpawner] Defeat.');
        }

        this.updateHud();
    }

    private countRemovedBlocks(result: GridTurnResult): number {
        let count = 0;

        for (let i = 0; i < result.actions.length; i++) {
            if (result.actions[i].type === GridActionType.Remove) {
                count++;
            }
        }

        return count;
    }

    private isVictoryReached(): boolean {
        return this.currentScore >= Math.max(1, Math.floor(this.targetScore));
    }

    private playVictoryAndRestart(): void {
        if (this.isPlayingVictoryAnimation) {
            return;
        }

        this.isPlayingVictoryAnimation = true;

        if (!this.gridView) {
            this.scheduleRestartAfterVictory();
            return;
        }

        this.gridView.animateVictoryScatter().then(() => {
            this.scheduleRestartAfterVictory();
        }).catch((error) => {
            cc.error('[GridSpawner] Failed to play victory animation.', error);
            this.scheduleRestartAfterVictory();
        });
    }

    private scheduleRestartAfterVictory(): void {
        this.unschedule(this.restartAfterVictory);
        this.scheduleOnce(this.restartAfterVictory, Math.max(0, this.victoryReplayDelay));
    }

    private restartAfterVictory(): void {
        if (!this.node || !cc.isValid(this.node)) {
            return;
        }

        cc.log('[GridSpawner] Restarting after victory.');
        this.spawnGrid();
    }

    private bindHudLabels(): void {
        if (!this.scoreLabel) {
            this.scoreLabel = this.findLabelByNodeName(cc.director.getScene(), 'label_score');
        }

        if (!this.movesLabel) {
            this.movesLabel = this.findLabelByNodeName(cc.director.getScene(), 'label_moves');
        }
    }

    private updateHud(): void {
        if (this.scoreLabel) {
            this.scoreLabel.string = this.currentScore + '/' + Math.max(1, Math.floor(this.targetScore));
        }

        if (this.movesLabel) {
            this.movesLabel.string = String(this.remainingMoves);
        }
    }

    private findLabelByNodeName(root: cc.Node, nodeName: string): cc.Label {
        if (!root) {
            return null;
        }

        if (root.name === nodeName) {
            return root.getComponent(cc.Label);
        }

        for (let i = 0; i < root.children.length; i++) {
            const label = this.findLabelByNodeName(root.children[i], nodeName);

            if (label) {
                return label;
            }
        }

        return null;
    }

    private createRules(): GridRules {
        const rules = createDefaultGridRules();

        rules.minGroupSize = Math.max(2, Math.floor(this.minGroupSize));
        rules.superTileThreshold = Math.max(rules.minGroupSize, Math.floor(this.superTileThreshold));
        rules.maxShuffleCount = Math.max(0, Math.floor(this.maxShuffleCount));
        rules.bombBoosterRadius = Math.max(1, Math.floor(this.bombBoosterRadius));
        rules.specialRadius = Math.max(1, Math.floor(this.specialRadius));

        return rules;
    }

    private getPointInParentSpace(point: cc.Node, fallback: cc.Vec2, parent: cc.Node): cc.Vec2 {
        if (!point) {
            return fallback;
        }

        const position = point.getPosition();

        if (point.parent === parent) {
            return position;
        }

        const worldPosition = point.parent
            ? point.parent.convertToWorldSpaceAR(position)
            : position;

        return parent.convertToNodeSpaceAR(worldPosition);
    }

    private drawGridGizmo(): void {
        if (!CC_EDITOR) {
            return;
        }

        const graphics = this.getGridGizmoGraphics();
        graphics.clear();

        if (!this.showGridGizmo) {
            graphics.node.active = false;
            return;
        }

        graphics.node.active = true;

        const parent = this.spawnParent || this.node;
        const rows = Math.max(1, Math.floor(this.rows));
        const columns = Math.max(1, Math.floor(this.columns));
        const from = this.getPointInParentSpace(this.fromPoint, this.from, parent);
        const to = this.getPointInParentSpace(this.toPoint, this.to, parent);
        const lineWidth = Math.max(1, this.gizmoLineWidth);
        const pointRadius = Math.max(1, this.gizmoPointRadius);

        graphics.lineWidth = lineWidth;
        graphics.strokeColor = this.gizmoLineColor;

        for (let column = 0; column < columns; column++) {
            const xProgress = columns === 1 ? 0.5 : column / (columns - 1);
            const x = cc.misc.lerp(from.x, to.x, xProgress);

            this.drawGizmoLine(graphics, parent, cc.v2(x, from.y), cc.v2(x, to.y));
        }

        for (let row = 0; row < rows; row++) {
            const yProgress = rows === 1 ? 0.5 : row / (rows - 1);
            const y = cc.misc.lerp(from.y, to.y, yProgress);

            this.drawGizmoLine(graphics, parent, cc.v2(from.x, y), cc.v2(to.x, y));
        }

        graphics.stroke();

        graphics.lineWidth = lineWidth + 1;
        graphics.strokeColor = this.gizmoBorderColor;
        this.drawGizmoLine(graphics, parent, cc.v2(from.x, from.y), cc.v2(to.x, from.y));
        this.drawGizmoLine(graphics, parent, cc.v2(to.x, from.y), cc.v2(to.x, to.y));
        this.drawGizmoLine(graphics, parent, cc.v2(to.x, to.y), cc.v2(from.x, to.y));
        this.drawGizmoLine(graphics, parent, cc.v2(from.x, to.y), cc.v2(from.x, from.y));
        graphics.stroke();

        graphics.fillColor = this.gizmoPointColor;

        for (let row = 0; row < rows; row++) {
            const yProgress = rows === 1 ? 0.5 : row / (rows - 1);
            const y = cc.misc.lerp(from.y, to.y, yProgress);

            for (let column = 0; column < columns; column++) {
                const xProgress = columns === 1 ? 0.5 : column / (columns - 1);
                const x = cc.misc.lerp(from.x, to.x, xProgress);
                const point = this.convertParentPointToNodeSpace(cc.v2(x, y), parent);

                graphics.circle(point.x, point.y, pointRadius);
            }
        }

        graphics.fill();
    }

    private clearGridGizmo(): void {
        if (!CC_EDITOR) {
            return;
        }

        const gizmoNode = this.node.getChildByName(GRID_GIZMO_NODE_NAME);

        if (!gizmoNode) {
            return;
        }

        const graphics = gizmoNode.getComponent(cc.Graphics);

        if (graphics) {
            graphics.clear();
        }

        gizmoNode.active = false;
    }

    private getGridGizmoGraphics(): cc.Graphics {
        let gizmoNode = this.node.getChildByName(GRID_GIZMO_NODE_NAME);

        if (!gizmoNode) {
            gizmoNode = new cc.Node(GRID_GIZMO_NODE_NAME);
            gizmoNode.parent = this.node;
        }

        gizmoNode.setPosition(0, 0);
        gizmoNode.setScale(1, 1);
        gizmoNode.angle = 0;

        let graphics = gizmoNode.getComponent(cc.Graphics);

        if (!graphics) {
            graphics = gizmoNode.addComponent(cc.Graphics);
        }

        return graphics;
    }

    private drawGizmoLine(graphics: cc.Graphics, parent: cc.Node, from: cc.Vec2, to: cc.Vec2): void {
        const localFrom = this.convertParentPointToNodeSpace(from, parent);
        const localTo = this.convertParentPointToNodeSpace(to, parent);

        graphics.moveTo(localFrom.x, localFrom.y);
        graphics.lineTo(localTo.x, localTo.y);
    }

    private convertParentPointToNodeSpace(point: cc.Vec2, parent: cc.Node): cc.Vec2 {
        if (parent === this.node) {
            return point;
        }

        const worldPosition = parent.convertToWorldSpaceAR(point);
        return this.node.convertToNodeSpaceAR(worldPosition);
    }
}
