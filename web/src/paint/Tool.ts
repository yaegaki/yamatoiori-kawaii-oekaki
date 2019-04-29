import { IPaintingContext, drawLine, drawPoint } from "./Painting";
import { Rect, Offset } from "./Common";
import { BlendMode } from "./Blend";
import { ICanvasView } from "./CanvasView";
import { IEditableLayer } from "./Layers/Layer";
import { Color, Colors } from "./Color";
import { ScaleOption, ScaleMethod } from "./LayerTransform";

export type PaintResult = {
    isFinished: boolean;
    dirtyRect: Rect;
}

export interface IPaintToolProvider {
    getPaintTool(desc: string): IPaintTool | null;
}

export interface IPaintTool {
    getName(): string;
    beginPaiting(paintingContext: IPaintingContext): IPaintToolContext;
}

export interface IPaintToolContext {
    start(x: number, y: number, pressure: number): PaintResult;
    update(x: number, y: number, pressure: number): PaintResult;
    end(): PaintResult;
    cancel(): void;
    getBakeMode(): BlendMode;
}

export class PenTool implements IPaintTool {
    constructor(private radius: number = 3, private color: Color = Colors.Black) {
    }

    getName() {
        return 'Pen';
    }

    setRadius(radius: number) {
        this.radius = radius;
    }

    setColor(color: Color) {
        this.color = color;
    }

    beginPaiting(paintingContext: IPaintingContext): IPaintToolContext {
        return new PenToolContext(paintingContext, this.radius, this.color, BlendMode.AlphaBlend);
    }
}

export class EraserTool implements IPaintTool {
    constructor(private radius: number = 10) {
    }

    getName() {
        return 'Eraser';
    }

    beginPaiting(paintingContext: IPaintingContext): IPaintToolContext {
        return new PenToolContext(paintingContext, this.radius, Colors.Black, BlendMode.Erase);
    }
}

class PenToolContext implements IPaintToolContext {
    private prevX: number = 0;
    private prevY: number = 0;
    private lastT: number = 0;
    private drawingLayer: IEditableLayer;

    constructor(private paintingContext: IPaintingContext, private penRadius: number, private color: Color, private bakeMode: BlendMode) {
        this.drawingLayer = this.paintingContext.getView().getCanvas().getDrawingLayer();
    }

    start(x: number, y: number, pressure: number): PaintResult {
        this.prevX = x;
        this.prevY = y;
        return {
            isFinished: false,
            dirtyRect: drawPoint(this.drawingLayer, x, y, this.getPenRadius(), this.color),
        };
    }

    update(x: number, y: number, pressure: number): PaintResult {
        const { lastT, dirtyRect } = drawLine(this.drawingLayer, this.prevX, this.prevY, x, y, this.getPenRadius(), this.color, this.lastT);
        this.prevX = x;
        this.prevY = y;
        this.lastT = lastT;

        return {
            isFinished: false,
            dirtyRect,
        };
    }

    end(): PaintResult {
        return {
            isFinished: true,
            dirtyRect: Rect.Empty,
        };
    }

    cancel() {
    }

    getBakeMode(): BlendMode {
        return this.bakeMode;
    }

    getPenRadius(): number {
        return this.penRadius;
    }
}

export class MoveTool implements IPaintTool {
    constructor() {
    }

    getName() {
        return 'Move';
    }

    beginPaiting(paintingContext: IPaintingContext): IPaintToolContext {
        return new MoveToolContext(paintingContext);
    }
}

class MoveToolContext implements IPaintToolContext {
    private startOffset: Offset = { x: 0, y: 0 };
    private startViewOffset: Offset = { x: 0, y: 0 };
    private view: ICanvasView;
    private scaleOption: ScaleOption;

    constructor(private paintingContext: IPaintingContext) {
        this.view = this.paintingContext.getView();
        this.scaleOption = this.view.getScaleOption();
        this.view.setScaleOption({
            method: ScaleMethod.NearestNeighbor,
        });
    }

    start(x: number, y: number, pressure: number): PaintResult {
        y = -y;
        this.startViewOffset = this.view.getOffset();
        this.startOffset = { x: x * this.view.getScale() + this.startViewOffset.x, y: y * this.view.getScale()  + this.startViewOffset.y };
        return { isFinished: false, dirtyRect: Rect.Empty };
    }

    update(x: number, y: number, pressure: number): PaintResult {
        y = -y;
        const viewOffset = this.view.getOffset();
        const offset = { x: x * this.view.getScale() + viewOffset.x, y: y * this.view.getScale() + viewOffset.y };
        const diff = { x: offset.x - this.startOffset.x, y: offset.y - this.startOffset.y };
        const nextViewOffset = { x: this.startViewOffset.x + diff.x, y: this.startViewOffset.y + diff.y };

        this.view.setOffset(nextViewOffset);
        this.view.adjustOffset();
        return { isFinished: false, dirtyRect: Rect.Empty };
    }

    end(): PaintResult {
        this.view.setScaleOption(this.scaleOption);
        return { isFinished: true, dirtyRect: Rect.Empty };
    }

    cancel() {
        this.view.setScaleOption(this.scaleOption);
    }

    getBakeMode(): BlendMode {
        return BlendMode.AlphaBlend;
    }
}