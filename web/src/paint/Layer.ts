export const fff = 0;
/*
import { Size, Rect, EmptyRect, mergeRect, intersectRect } from "./Common";
import { BlendMode, colorBlend, alphaBlend, rawColorBlend } from "./Blend";
import { drawLine } from "./Painting";
import { Color, Colors, toUint32Color, Uint32ColorToUint8Color } from "./Color";

export interface ILayer {
    getSize(): Size;
    getColor(x: number, y: number): Color;
    getBlendMode(): BlendMode;

    // x,y座標の位置からcount数分の色をdstのdstIndexから始まる領域にコピーする
    // dstは先頭のバイトからRGBA8(4byte)の配列になっている
    getRawColors(x: number, y: number, width: number, height: number, dst: Uint32Array, dstOffset: number): void;
};

export interface IEditableLayer extends ILayer {
    setColor(x: number, y: number, color: Color): void;
    setRawColors(x: number, y: number, width: number, height: number, src: Uint32Array, srcOffset: number): void;
    fill(x: number, y: number, width: number, height: number, color: Color): void;
}

export interface IDrawingLayer extends IEditableLayer {
    setBlendMode(blendMode: BlendMode): void;
}

export class RGBA8Layer implements IDrawingLayer {
    private data: Uint8Array;
    private dataAsUint32: Uint32Array;
    private blendMode: BlendMode;

    constructor(private width: number, private height: number) {
        this.width = width;
        this.height = height;
        this.blendMode = BlendMode.AlphaBlend;

        this.data = new Uint8Array(this.width * this.height * 4);
        this.dataAsUint32 = new Uint32Array(this.data.buffer);
    }

    getSize(): Size {
        return { width: this.width, height: this.height };
    }

    getColor(x: number, y: number): Color {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return Colors.Transparent;

        const index = y * this.width * 4 + x * 4;
        return {
            r: this.data[index] / 255,
            g: this.data[index+1] / 255,
            b: this.data[index+2] / 255,
            a: this.data[index+3] / 255,
        };
    }

    setColor(x: number, y: number, color: Color): void {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

        const index = y * this.width * 4 + x * 4;
        this.data[index] = color.r * 255;
        this.data[index+1] = color.g * 255;
        this.data[index+2] = color.b * 255;
        this.data[index+3] = color.a * 255;
    }

    getBlendMode(): BlendMode {
        return this.blendMode;
    }

    setBlendMode(blendMode: BlendMode) {
        this.blendMode = blendMode;
    }

    getRawColors(x: number, y: number, width: number, height: number, dst: Uint32Array, dstOffset: number) {
        const endY = y + height;
        for (; y < endY; y++) {
            let dataOffset = y * this.width + x;
            const endOffsetX =  dataOffset + width;
            for (; dataOffset < endOffsetX; dataOffset++, dstOffset++) {
                dst[dstOffset] = this.dataAsUint32[dataOffset];
            }
        }
    }

    setRawColors(x: number, y: number, width: number, height: number, src: Uint32Array, srcOffset: number) {
        const endY = y + height;
        for (; y < endY; y++) {
            let dataOffset = y * this.width + x;
            const endOffsetX =  dataOffset + width;
            for (; dataOffset < endOffsetX; dataOffset++, srcOffset++) {
                this.dataAsUint32[dataOffset] = src[srcOffset];
            }
        }
    }

    fill(x: number, y: number, width: number, height: number, color: Color) {
        const c = toUint32Color(color);
        const endY = y + height;
        for (; y < endY; y++) {
            let dataOffset = y * this.width + x;
            const endOffsetX =  dataOffset + width;
            for (; dataOffset < endOffsetX; dataOffset++) {
                this.dataAsUint32[dataOffset] = c;
            }
        }
    }
}

export class RefLayer implements ILayer {
    private overrideBlendModeEnable: boolean = false;
    private blendMode: BlendMode = BlendMode.AlphaBlend;

    constructor(private source: ILayer) {
    }

    overrideBlendMode(enable: boolean, blendMode?: BlendMode) {
        this.overrideBlendModeEnable = enable;
        if (blendMode !== undefined) this.blendMode = blendMode;
    }

    getSize(): Size {
        return this.source.getSize();
    }

    getColor(x: number, y: number): Color {
        return this.source.getColor(x, y);
    }

    getBlendMode(): BlendMode {
        if (this.overrideBlendModeEnable) return this.blendMode;
        return this.source.getBlendMode();
    }

    getRawColors(x: number, y: number, width: number, height: number, dst: Uint32Array, dstOffset: number) {
        return this.source.getRawColors(x, y, width, height, dst, dstOffset);
    }
}

export class CheckeredPatternLayer implements ILayer {
    private evenUint32: number;
    private oddUint32: number;

    constructor(
        private width: number,
        private height: number,
        private patternSize: number = 10,
        private evenColor: Color = { r: 90 / 255, g: 90 / 255, b: 90 / 255, a: 1 },
        private oddColor: Color = { r: 60 / 255, g: 60 / 255, b: 60 / 255, a: 1 }) {
        this.evenUint32 = toUint32Color(evenColor);
        this.oddUint32 = toUint32Color(oddColor);
    }

    getSize(): Size {
        return { width: this.width, height: this.height };
    }

    getColor(x: number, y: number): Color {
        const xIsEven = Math.floor(x / this.patternSize) % 2 == 0;
        const yIsEven = Math.floor(y / this.patternSize) % 2 == 0;

        if (xIsEven) {
            if (yIsEven) {
                return this.evenColor;
            }
            else {
                return this.oddColor;
            }
        }
        else {
            if (yIsEven) {
                return this.oddColor;
            }
            else {
                return this.evenColor;
            }
        }
    }

    getBlendMode(): BlendMode {
        return BlendMode.DirectSrc;
    }

    // x,y座標の位置からcount数分の色をdstのdstIndexから始まる領域にコピーする
    // dstは先頭のバイトからRGBA8(4byte)の配列になっている
    getRawColors(x: number, y: number, width: number, height: number, dst: Uint32Array, dstOffset: number) {
        for (let y = 0; y < height; y++) {
            const xIsEven = Math.floor(x / this.patternSize) % 2 == 0;
            const yIsEven = Math.floor(y / this.patternSize) % 2 == 0;

            let color: number;
            if (xIsEven) {
                if (yIsEven) {
                    color = this.evenUint32;
                }
                else {
                    color = this.oddUint32;
                }
            }
            else {
                if (yIsEven) {
                    color = this.oddUint32;
                }
                else {
                    color = this.evenUint32;
                }
            }

            dst[dstOffset++] = color;
        }
    }
}

// 2つ分
const workBuffer = new ArrayBuffer(8);
const u8Buffer = new Uint8Array(workBuffer);
const u32Buffer = new Uint8Array(workBuffer);

export class CombineLayer implements ILayer {
    private buffer: RGBA8Layer;

    /// baseLayerのブレンドモードがアルファブレンドであること前提
    constructor(
        private baseLayer: ILayer,
        private topLayer: ILayer) {
        const { width, height } = this.baseLayer.getSize();
        this.buffer = new RGBA8Layer(width, height);
    }

    getSize(): Size {
        return this.baseLayer.getSize();
    }

    getColor(x: number, y: number): Color {
        const color = this.baseLayer.getColor(x, y);

        const topSize = this.topLayer.getSize();
        if (x >= topSize.width || y >= topSize.height) return color;

        const topColor = this.topLayer.getColor(x, y);

        return colorBlend(this.topLayer.getBlendMode(), topColor, color);
    }

    getBlendMode(): BlendMode {
        return this.baseLayer.getBlendMode();
    }

    // x,y座標の位置からcount数分の色をdstのdstIndexから始まる領域にコピーする
    // dstは先頭のバイトからRGBA8(4byte)の配列になっている
    getRawColors(x: number, y: number, width: number, height: number, dst: Uint32Array, dstOffset: number) {
        const rect = { x, y, size: { width, height } };
        // とりあえずtopとbaseが同じサイズ前提...
        bakeLayer(BlendMode.DirectSrc, this.baseLayer, this.buffer, rect);
        bakeLayer(this.topLayer.getBlendMode(), this.topLayer, this.buffer, rect);
        this.buffer.getRawColors(x, y, width, height, dst, dstOffset);
    }
}

export class FrameLayer implements ILayer {
    private layer: RGBA8Layer;
    private frame?: Rect;
    private rects: Rect[] = [];

    constructor(private width: number, private height: number) {
        this.layer = new RGBA8Layer(width, height);
    }

    setFrame(frame?: Rect): Rect[] {
        this.frame = frame;
        const prev = this.rects;
        this.rects.forEach(r => {
            fillLayer(this.layer, Colors.Transparent, r);
        });
        this.rects = [];

        if (this.frame === undefined) {
            return prev;
        }

        const f = this.frame;
        const s = this.frame.size;

        const leftTop = { x: f.x, y: f.y };
        const rightTop = { x: f.x + s.width, y: f.y };
        const leftBottom = { x: f.x, y: f.y + s.height };
        const rightBottom = { x: f.x + s.width, y: f.y + s.height };

        const radius = 2;
        const draw = (p1: { x: number, y: number }, p2: { x: number, y: number }, lastT: number) => {
            let _o = drawLine(this.layer, p1.x, p1.y, p2.x, p2.y, radius, Colors.Red, lastT);
            this.rects.push(_o.dirtyRect);
            return _o.lastT;;
        };

        let lastT = draw(leftTop, leftBottom, 0);
        lastT = draw(leftBottom, rightBottom, lastT);
        lastT = draw(rightBottom, rightTop, lastT);
        lastT = draw(rightTop, leftTop, lastT);

        return prev.concat(this.rects);
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

    // x,y座標の位置からcount数分の色をdstのdstIndexから始まる領域にコピーする
    // dstは先頭のバイトからRGBA8(4byte)の配列になっている
    getRawColors(x: number, y: number, width: number, height: number, dst: Uint32Array, dstOffset: number) {
        return this.layer.getRawColors(x, y, width, height, dst, dstOffset);
    }
}

let bakeLayerBuffer: Uint32Array = new Uint32Array();
let bakeLayerBufferAsUint8Array: Uint8Array = new Uint8Array(bakeLayerBuffer.buffer);
export function bakeLayer(mode: BlendMode, dstLayer: IEditableLayer, srcLayer: ILayer, clipRect?: Rect) {
    const srcSize = srcLayer.getSize();
    const dstSize = dstLayer.getSize();

    let startY = 0;
    let startX = 0;
    let height = Math.min(srcSize.height, dstSize.height);
    let width = Math.min(srcSize.width, dstSize.width);

    if (clipRect !== undefined) {
        if (clipRect.x >= width || clipRect.y >= height) return;

        startY = clipRect.y;
        startX = clipRect.x;
        height = Math.min(height - startY, clipRect.size.height);
        width = Math.min(width - startX, clipRect.size.width);
    }

    const yEnd = startY + height;
    const xEnd = startX + width;
    for (let y = startY; y < yEnd; y++) {
        for (let x = startX; x < xEnd; x++) {
            const src = srcLayer.getColor(x, y);
            const dst = dstLayer.getColor(x, y);
            const blend = colorBlend(srcLayer.getBlendMode(), src, dst);
            dstLayer.setColor(x, y, blend);
        }
    }
    return;

    const size = width * height;
    const size2 = size * 2;
    if (bakeLayerBuffer.length < size2) {
        bakeLayerBuffer = new Uint32Array(size2);
        bakeLayerBufferAsUint8Array = new Uint8Array(bakeLayerBuffer.buffer);
    }

    srcLayer.getRawColors(startX, startY, width, height, bakeLayerBuffer, 0);
    dstLayer.getRawColors(startX, startY, width, height, bakeLayerBuffer, size);

    const dstOffset = size * 4;
    rawBakeLayer(mode, bakeLayerBufferAsUint8Array, 0, bakeLayerBufferAsUint8Array, dstOffset, size)

    dstLayer.setRawColors(startX, startY, width, height, bakeLayerBuffer, size);
}

export function rawBakeLayer(mode: BlendMode, srcLayer: Uint8Array, srcOffset: number, dstLayer: Uint8Array, dstOffset: number, count: number) {
    for (let i = 0; i < count; i++) {
        rawColorBlend(mode, srcLayer, srcOffset, dstLayer, dstOffset, dstLayer, dstOffset);
        srcOffset += 4;
        dstOffset += 4;
    }
}

export function fillLayer(layer: IEditableLayer, color: Color, clipRect?: Rect) {
    const size = layer.getSize();

    let startY = 0;
    let startX = 0;
    let height = size.height;
    let width = size.width;

    if (clipRect !== undefined) {
        startY = clipRect.y;
        startX = clipRect.x;
        height = Math.min(height, startY + clipRect.size.height);
        width = Math.min(width, startX + clipRect.size.width);
    }

    layer.fill(startX, startY, height, width, color);
}
*/