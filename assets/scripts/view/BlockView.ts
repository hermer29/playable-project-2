import { GridPosition } from '../model/GridPosition';

const { ccclass } = cc._decorator;

export type BlockClickHandler = (position: GridPosition, blockId: number) => void;

@ccclass
export default class BlockView extends cc.Component {
    public blockId = 0;
    public position: GridPosition = { row: 0, column: 0 };
    private clickHandler: BlockClickHandler = null;

    public init(blockId: number, position: GridPosition, clickHandler: BlockClickHandler): void {
        this.blockId = blockId;
        this.position = {
            row: position.row,
            column: position.column,
        };
        this.clickHandler = clickHandler;

        this.node.off(cc.Node.EventType.TOUCH_END, this.handleTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.handleTouchEnd, this);
    }

    public setGridPosition(position: GridPosition): void {
        this.position = {
            row: position.row,
            column: position.column,
        };
    }

    protected onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_END, this.handleTouchEnd, this);
    }

    private handleTouchEnd(): void {
        if (this.clickHandler) {
            this.clickHandler(this.position, this.blockId);
        }
    }
}
