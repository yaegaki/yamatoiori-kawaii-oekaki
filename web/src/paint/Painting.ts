import { IPaintTool, IPaintToolContext, PaintResult } from "./Tool";
import { Rect } from "./Common";
import { Canvas } from "./Canvas";
import { ICanvasView } from "./CanvasView";
import { Color, Colors } from "./Color";
import { IEditableLayer, IDrawingLayer, bakeLayer } from "./Layers/Layer";
import { UndoManager } from "./UndoManager";
import { alphaBlend } from "./Blend";

export interface IPaintingContext {
    getView(): ICanvasView;
}

export class PaintingContext implements IPaintingContext {
    private isFinished: boolean = false;
    private dirtyRect: Rect;
    private paintToolContext: IPaintToolContext;
    private canvas: Canvas;
    private points: { x: number, y: number }[] = [];

    constructor(private activeLayer: IEditableLayer, private drawingLayer: IDrawingLayer, private paintTool: IPaintTool, private view: ICanvasView, private undoManager?: UndoManager) {
        this.dirtyRect = Rect.Empty;
        this.paintToolContext = this.paintTool.beginPaiting(this);
        drawingLayer.setBlendMode(this.paintToolContext.getBakeMode());
        this.canvas = this.view.getCanvas();
    }

    getView(): ICanvasView {
        return this.view;
    }

    start(x: number, y: number, pressure: number) {
        this.render(this.paintToolContext.start(x, y, pressure));
        this.points.push({ x, y });
        this.points.push({ x, y });
    }

    update(x: number, y: number, pressure: number) {
        if (this.isFinished) return;
        this.points.shift();
        this.points.forEach(p => {
            x += p.x;
            y += p.y;
        });

        x /= this.points.length + 1;
        y /= this.points.length + 1;
        this.points.push({ x, y });
        this.render(this.paintToolContext.update(x, y, pressure));
    }

    end() {
        if (this.isFinished) return;
        this.render(this.paintToolContext.end());
    }

    cancel() {
        if (this.isFinished) return;

        if (this.dirtyRect.isEmpty()) return;
        this.drawingLayer.fill(Colors.Transparent, this.dirtyRect);
        this.canvas.render(false, this.dirtyRect);
        this.isFinished = true;
    }

    private render(result: PaintResult) {
        this.dirtyRect = this.dirtyRect.merge(result.dirtyRect);
        if (this.dirtyRect.isEmpty()) return;

        if (result.isFinished) {
            if (this.undoManager !== undefined) {
                this.undoManager.push(this.activeLayer, this.dirtyRect);
            }
            bakeLayer(this.drawingLayer.getBlendMode(), this.activeLayer, this.drawingLayer, this.dirtyRect);
            this.drawingLayer.fill(Colors.Transparent, this.dirtyRect);
            this.canvas.render(false, this.dirtyRect);
            this.isFinished = true;
        }
        else {
            this.canvas.render(true, result.dirtyRect);
        }
    }
}

export function drawPoint(layer: IEditableLayer, x: number, y: number, radius: number, color: Color): Rect {
    const nx1 = Math.floor(x - radius);
    const ny1 = Math.floor(y - radius);
    const nx2 = Math.floor(x + radius);
    const ny2 = Math.floor(y + radius);

    const rr = radius * radius;
    let painted = false;

    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;

    const size = layer.getSize();

    const aw = 8;
    for (let iy = ny1; iy <= ny2; iy++) {
        for (let ix = nx1; ix <= nx2; ix++) {
            if (ix < 0 || ix >= size.width || iy < 0 || iy >= size.height) continue;

            let val = 0;
            for (let jy = 0; jy < aw; jy++) {
                const yy = iy - y + jy * (1.0 / aw);
            
                for(let jx = 0; jx < aw; jx++)
                {
                    const xx = ix - x + jx * (1.0 / aw);

                    const d = (xx * xx + yy * yy) / rr;
                    if(d < 1.0) {
                        val += 1.0;
                    }
                }
            }

            // const alpha = val / (aw * aw);
            const alpha = val / (aw * aw);
            // const alpha = val > 0 ? 0.3 : 0;
            if (alpha > 0) {
                const dstColor = layer.getColor(ix, iy);
                // if (dstColor.a > alpha) continue;

                if (painted) {
                    if (minX > ix) {
                        minX = ix;
                    }
                    else if (maxX < ix) {
                        maxX = ix;
                    }

                    if (minY > iy) {
                        minY = iy;
                    }
                    else if (maxY < iy) {
                        maxY = iy;
                    }
                }
                else {
                    painted = true;
                    minX = ix;
                    minY = iy;
                    maxX = ix;
                    maxY = iy;
                }

                const c = alphaBlend(dstColor, new Color(color.r, color.g, color.b, alpha));
                layer.setColor(ix, iy, c);
            }
        }
    }

    if (!painted) {
        return Rect.Empty;
    }

    const rect =  new Rect(minX, minY, maxX - minX + 1, maxY - minY + 1);
    return rect;
}

export function drawLine(layer: IEditableLayer, x1: number, y1: number, x2: number, y2: number, radius: number, color: Color, lastT: number): { lastT: number, dirtyRect: Rect } {
    const dx = x2 - x1;
    const dy = y2 - y1;

    let dirtyRect = Rect.Empty; 

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len == 0) {
        return {
            lastT,
            dirtyRect,
        };
    }

    const interval = 0.5 / len;
    let t = lastT / len;
    // console.log(lastT);
    while (t < 1.0) {
        const x = x1 + dx * t;
        const y = y1 + dy * t;

        dirtyRect = dirtyRect.merge(drawPoint(layer, x, y, radius, color));

        let dtmp = radius * interval;
        if (dtmp < 0.0001) dtmp = 0.0001;
        t += dtmp;
    }

    return {
        lastT: len * (t - 1.0),
        dirtyRect,
    };
}
