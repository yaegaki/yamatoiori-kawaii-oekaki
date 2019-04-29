import { Size, Rect } from "../Common";
import { Color } from "../Color";
import { BlendMode, getRawColorBlendFunc } from "../Blend";
import { MemoryRect, newMemoryRect } from "../Memory";

export interface ILayer {
    getSize(): Size;
    getColor(x: number, y: number): Color;
    getBlendMode(): BlendMode;

    // 読み込み可能なバッファへの参照を取得する
    getRawColorsReadOnlyRef(rect: Rect): MemoryRect | null;

    // RGBA8フォーマットで色を取得する
    getRawColor(x: number, y: number, dst: Uint8Array, dstOffset: number): void;
    // rectの部分をRGBAフォーマットで色を取得する
    getRawColors(rect: Rect, dstMemoryRect: MemoryRect): void;
}

export interface IEditableLayer extends ILayer {
    setColor(x: number, y: number, color: Color): void;

    fill(color: Color, rect?: Rect): void;

    // 読み書き可能なバッファへの参照を取得する
    getRawColorsRef(rect: Rect): MemoryRect | null;

    // RGBA8フォーマットで色を設定する
    setRawColor(x: number, y: number, src: Uint8Array, srcOffset: number): void;
    // rectの部分にRGBAフォーマットで色を設定する
    setRawColors(rect: Rect, srcMemoryRect: MemoryRect): void;
}

// Canvasの一時的な描画対象として使用できるレイヤ
export interface IDrawingLayer extends IEditableLayer {
    setBlendMode(blendMode: BlendMode): void;
}

let workBuffer: Uint8Array = new Uint8Array(0);

export function bakeLayer(mode: BlendMode, dstLayer: IEditableLayer, srcLayer: ILayer, clipRect?: Rect) {
    const srcSize = srcLayer.getSize();
    const dstSize = dstLayer.getSize();

    let x: number;
    let y: number;
    let width: number = Math.min(srcSize.width, dstSize.width);
    let height: number = Math.min(srcSize.height, dstSize.height);

    if (clipRect === undefined) {
        x = 0;
        y = 0; 
    }
    else {
        x = clipRect.x;
        y = clipRect.y;
        if (x >= width || y >= height) return;

        width = Math.min(width - x, clipRect.width);
        height = Math.min(height - y, clipRect.height);
    }

    clipRect = new Rect(x, y, width, height);

    let requireWriteBack = false;
    let dstMemory = dstLayer.getRawColorsRef(clipRect);
    let srcMemory = srcLayer.getRawColorsReadOnlyRef(clipRect);
    const stride = width * 4;
    if (dstMemory === null && srcMemory === null) {
        const size = width * height;
        const size2 = size * 2;
        if (workBuffer.length < size2) {
            workBuffer = new Uint8Array(size2);
        }
        dstMemory = newMemoryRect(workBuffer, 0, stride, stride, height);
        dstLayer.getRawColors(clipRect, dstMemory);
        srcMemory = newMemoryRect(workBuffer, size, stride, stride, height);
        srcLayer.getRawColors(clipRect, srcMemory);

        requireWriteBack = true;
    }
    else if (dstMemory === null || srcMemory === null) {
        const size = width * height;
        if (workBuffer.length < size) {
            workBuffer = new Uint8Array(size);
        }

        if (dstMemory === null) {
            dstMemory = newMemoryRect(workBuffer, 0, stride, stride, height);
            // なぜかnull扱いにされてしまうので...
            srcMemory = srcMemory!;
            dstLayer.getRawColors(clipRect, dstMemory);
            requireWriteBack = true;
        }
        else {
            srcMemory = newMemoryRect(workBuffer, 0, stride, stride, height);
            srcLayer.getRawColors(clipRect, srcMemory);
        }
    }

    const blendFunc = getRawColorBlendFunc(mode);
    for (let _y = 0; _y < clipRect.height; _y++) {
        let dstOffset = dstMemory.offset + dstMemory.stride * _y;
        let srcOffset = srcMemory.offset + srcMemory.stride * _y;
        let dstEnd = dstOffset + clipRect.width * 4;
        for (; dstOffset < dstEnd; dstOffset += 4, srcOffset += 4) {
            blendFunc(dstMemory.memory, dstOffset, dstMemory.memory, dstOffset, srcMemory.memory, srcOffset);
        }
    }

    if (requireWriteBack) {
        dstLayer.setRawColors(clipRect, dstMemory);
    }
}
