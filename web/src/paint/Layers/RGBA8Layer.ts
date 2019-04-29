import { IDrawingLayer } from "./Layer";
import { Size, Rect } from "../Common";
import { BlendMode } from "../Blend";
import { Color } from "../Color";
import { memcopy, MemoryRect } from "../Memory";

export class RGBA8Layer implements IDrawingLayer {
    private size: Size;
    private buffer: Uint8Array;
    private blendMode: BlendMode = BlendMode.AlphaBlend;

    constructor(width: number, height: number, arrayBuffer?: ArrayBuffer) {
        this.size = { width, height };

        if (arrayBuffer === undefined) {
            this.buffer = new Uint8Array(width * height * 4);
        }
        else {
            this.buffer = new Uint8Array(arrayBuffer);
        }
    }

    getSize(): Size {
        return this.size;
    }

    getColor(x: number, y: number): Color {
        return Color.fromRawColor(this.buffer, this.getByteOffset(x, y));
    }

    getBlendMode(): BlendMode {
        return this.blendMode;
    }

    getRawColor(x: number, y: number, dst: Uint8Array, dstOffset: number) {
        memcopy(dst, dstOffset, this.buffer, this.getByteOffset(x, y), 4);
    }

    getRawColors(rect: Rect, dstMemoryRect: MemoryRect) {
        const bytes = rect.width * 4;
        let dstOffset = dstMemoryRect.offset;
        for (let y = 0; y < rect.height; y++) {
            const offset = this.getByteOffset(rect.x, rect.y + y);
            memcopy(dstMemoryRect.memory, dstOffset, this.buffer, offset, bytes);
            dstOffset += dstMemoryRect.stride;
        }
    }

    setColor(x: number, y: number, color: Color) {
        color.getRawColor(this.buffer, this.getByteOffset(x, y));
    }

    fill(color: Color, rect?: Rect) {
        if (rect === undefined) {
            rect = new Rect(0, 0, this.size.width, this.size.height);
        }

        const bytes = rect.width * 4;
        const r = color.r * 255;
        const g = color.g * 255;
        const b = color.b * 255;
        const a = color.a * 255;
        for (let y = 0; y < rect.height; y++) {
            let offset = this.getByteOffset(rect.x, rect.y + y);
            const end = offset + bytes;
            for (; offset < end;) {
                this.buffer[offset++] = r;
                this.buffer[offset++] = g;
                this.buffer[offset++] = b;
                this.buffer[offset++] = a;
            }
        }
    }

    getRawColorsReadOnlyRef(rect: Rect): MemoryRect | null {
        return this.getRawColorsRef(rect);
    }

    getRawColorsRef(rect: Rect): MemoryRect | null {
        return {
            memory: this.buffer,
            offset: this.getByteOffset(rect.x, rect.y),
            stride: this.size.width * 4,
            width: rect.width * 4,
            height: rect.height,
        };
    }

    setRawColor(x: number, y: number, src: Uint8Array, srcOffset: number) {
        memcopy(this.buffer, this.getByteOffset(x, y), src, srcOffset, 4);
    }

    setRawColors(rect: Rect, srcMemoryRect: MemoryRect) {
        const bytes = rect.width * 4;
        let srcOffset = srcMemoryRect.offset;
        for (let y = 0; y < rect.height; y++) {
            const offset = this.getByteOffset(rect.x, rect.y + y);
            memcopy(this.buffer, offset, srcMemoryRect.memory, srcOffset, bytes);
            srcOffset += srcMemoryRect.stride;
        }
    }

    setBlendMode(blendMode: BlendMode) {
        this.blendMode = blendMode;
    }

    private getByteOffset(x: number, y: number): number {
        return (y * this.size.width + x) * 4;
    }
}