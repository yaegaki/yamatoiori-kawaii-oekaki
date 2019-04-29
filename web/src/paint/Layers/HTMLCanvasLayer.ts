import { IEditableLayer } from "./Layer";
import { RGBA8Layer } from "./RGBA8Layer";
import { Size, Rect } from "../Common";
import { Color } from "../Color";
import { BlendMode } from "../Blend";
import { MemoryRect } from "../Memory";

export class HTMLCanvasLayer implements IEditableLayer {
    private layer: RGBA8Layer;
    private imageData: ImageData;

    constructor(private ctx: CanvasRenderingContext2D) {
        const size = { width: ctx.canvas.width, height: ctx.canvas.height };
        this.imageData = ctx.getImageData(0, 0, size.width, size.height);
        this.layer = new RGBA8Layer(size.width, size.height, this.imageData.data.buffer);
    }

    getSize(): Size {
        return this.layer.getSize();
    }

    getColor(x: number, y: number): Color {
        return this.layer.getColor(x, y);
    }

    getBlendMode(): BlendMode {
        return this.layer.getBlendMode();
    }

    getRawColorsReadOnlyRef(rect: Rect): MemoryRect | null {
        return this.layer.getRawColorsReadOnlyRef(rect);
    }

    getRawColor(x: number, y: number, dst: Uint8Array, dstOffset: number) {
        this.getRawColor(x, y, dst, dstOffset);
    }

    getRawColors(rect: Rect, dstMemoryRect: MemoryRect) {
        this.layer.getRawColors(rect, dstMemoryRect);
    }

    setColor(x: number, y: number, color: Color) {
        this.layer.setColor(x, y, color);
    }

    fill(color: Color, rect?: Rect) {
        this.layer.fill(color, rect);
    }

    getRawColorsRef(rect: Rect): MemoryRect | null {
        return this.layer.getRawColorsRef(rect);
    }

    setRawColor(x: number, y: number, src: Uint8Array, srcOffset: number) {
        this.layer.setRawColor(x, y, src, srcOffset);
    }

    setRawColors(rect: Rect, srcMemoryRect: MemoryRect) {
        this.layer.setRawColors(rect, srcMemoryRect);
    }

    getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }

    // layerへの変更をHTMLキャンバスに反映する
    apply(rect?: Rect) {
        const size = this.getSize();
        const layerRect = new Rect(0, 0, size.width, size.height);
        if (rect === undefined) {
            rect = layerRect;
        }
        else {
            rect = rect.intersect(layerRect);
        }

        if (rect.isEmpty()) return;

        this.ctx.putImageData(this.imageData, 0, 0, rect.x, rect.y, rect.width, rect.height);
    }
}
