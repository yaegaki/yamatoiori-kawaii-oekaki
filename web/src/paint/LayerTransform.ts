import { IEditableLayer, ILayer } from "./Layers/Layer";
import { Offset, Rect } from "./Common";
import { Color } from "./Color";
import { memcopy } from "./Memory";

export enum ScaleMethod {
    NearestNeighbor,
    OverSampling,
}

export type ScaleOverSamplingOption = {
    subpixels: number;
}

export type ScaleOption = {
    method: ScaleMethod;
    overSamplingOption?: ScaleOverSamplingOption;
}

export enum FillMethod {
    Color,
}

export type FillOption = {
    method: FillMethod,
    color?: Color;
}

export function transformLayer(dstLayer: IEditableLayer, srcLayer: ILayer, srcScale: number, scaleOption: ScaleOption, srcOffset: Offset, fillOption: FillOption, renderRect?: Rect): Rect {
    const size = dstLayer.getSize();
    const dstRect = new Rect(0, 0, size.width, size.height);
    if (renderRect === undefined) {
        renderRect = dstRect;
    }
    else {
        renderRect = renderRect.intersect(dstRect);
    }

    if (renderRect.isEmpty()) return renderRect;

    const srcSize = srcLayer.getSize();
    const transformedSrcRect = new Rect(0, 0, srcSize.width, srcSize.height).transform(srcScale, srcOffset).align();

    // renderRectとsrcの交わる場所
    const intersectedRect = renderRect.intersect(transformedSrcRect).align();

    // 描画すべき領域がない
    if (intersectedRect.isEmpty()) {
        dstLayer.fill(fillOption.color!, renderRect);
    }
    else {
        // src座標系で描画に使用するデータのRect
        const srcX = Math.max(Math.floor((intersectedRect.x - srcOffset.x) / srcScale), 0);
        const srcY = Math.max(Math.floor((intersectedRect.y - srcOffset.y) / srcScale), 0);
        const srcRight = Math.min(Math.ceil((intersectedRect.right - srcOffset.x) / srcScale), srcSize.width);
        const srcBottom = Math.min(Math.ceil((intersectedRect.bottom - srcOffset.y) / srcScale), srcSize.height);
        const srcWidth = srcRight - srcX;
        const srcHeight = srcBottom - srcY;


        const dstMemory = dstLayer.getRawColorsRef(renderRect)!;
        // TODO: memoryが取得できないとき。
        if (dstMemory === null) {
            console.error(`can not get dst RawColorsRef : ${dstLayer}`);
            return Rect.Empty;
        }

        const srcMemory = srcLayer.getRawColorsReadOnlyRef(new Rect(srcX, srcY, srcWidth, srcHeight))!;
        // TODO: memoryが取得できないとき。
        if (srcMemory === null) {
            console.error(`can not get src RawColorsReadOnlyRef : ${srcLayer}`);
            return Rect.Empty;
        }

        const renderRight = renderRect.right;
        const renderBottom = renderRect.bottom;

        const srcRenderRight = intersectedRect.right
        const srcRenderBottom = intersectedRect.bottom;

        if (scaleOption.method === ScaleMethod.OverSampling) {
            if (scaleOption.overSamplingOption === null) {
                console.error(`Missing OverSamplingOption.`);
                return Rect.Empty;
            }

            // 1サブピクセルの増分
            const delta = 1 / scaleOption.overSamplingOption!.subpixels;

            // renderRectの領域を描画する
            for (let y = renderRect.y; y < renderBottom; y++) {
                let dstMemoryOffset = dstMemory.offset + dstMemory.stride * (y - renderRect.y);

                for (let x = renderRect.x; x < renderRight; x++) {

                    // srcが影響を及ぼす可能性があるエリア
                    if (x === intersectedRect.x && y >= intersectedRect.y && y < srcRenderBottom) {
                        // 1行分を一気にやる
                        for (; x < srcRenderRight; x++) {
                            let count = 0;
                            let r = 0;
                            let g = 0;
                            let b = 0;
                            let a = 0;
                            for (let dy = 0; dy < 1; dy += delta) {
                                const sy = Math.floor(((y + dy) - srcOffset.y) / srcScale) - srcY;

                                if (sy < 0 || sy >= srcHeight) {
                                    continue;
                                }

                                const srcMemoryOffsetBase = srcMemory.offset + srcMemory.stride * sy;

                                for (let dx = 0; dx < 1; dx += delta) {
                                    const sx = Math.floor(((x + dx) - srcOffset.x) / srcScale) - srcX;

                                    if (sx < 0 || sx >= srcWidth) {
                                        continue;
                                    }

                                    const srcMemoryOffset = srcMemoryOffsetBase + 4 * sx;
                                    r += srcMemory.memory[srcMemoryOffset];
                                    g += srcMemory.memory[srcMemoryOffset+1];
                                    b += srcMemory.memory[srcMemoryOffset+2];
                                    a += srcMemory.memory[srcMemoryOffset+3];
                                    count++;
                                }
                            }

                            if (count > 0) {
                                dstMemory.memory[dstMemoryOffset] = r / count;
                                dstMemory.memory[dstMemoryOffset+1] = g / count;
                                dstMemory.memory[dstMemoryOffset+2] = b / count;
                                dstMemory.memory[dstMemoryOffset+3] = a / count;
                            }
                            else {
                                // TODO: FillOptionのチェック
                                fillOption.color!.getRawColor(dstMemory.memory, dstMemoryOffset);
                            }
                            dstMemoryOffset += 4;
                        }
                        x--;
                    }
                    else {
                        // TODO: FillOptionのチェック
                        fillOption.color!.getRawColor(dstMemory.memory, dstMemoryOffset);
                        dstMemoryOffset += 4;
                    }
                }
            }
        }
        else {
            // renderRectの領域を描画する
            for (let y = renderRect.y; y < renderBottom; y++) {
                let dstMemoryOffset = dstMemory.offset + dstMemory.stride * (y - renderRect.y);

                for (let x = renderRect.x; x < renderRight; x++) {

                    // srcが影響を及ぼす可能性があるエリア
                    if (x === intersectedRect.x && y >= intersectedRect.y && y < srcRenderBottom) {
                        const sy = Math.floor((y - srcOffset.y) / srcScale) - srcY;
                        const srcMemoryOffsetBase = srcMemory.offset + srcMemory.stride * sy;

                        // 1行分を一気にやる
                        for (; x < srcRenderRight; x++) {
                            const sx = Math.floor((x - srcOffset.x) / srcScale) - srcX;

                            if (sy >= 0 && sy < srcHeight && sx >= 0 && sx < srcWidth) {
                                const srcMemoryOffset = srcMemoryOffsetBase + 4 * sx;
                                memcopy(dstMemory.memory, dstMemoryOffset, srcMemory.memory, srcMemoryOffset, 4);
                            }
                            else {
                                // TODO: FillOptionのチェック
                                fillOption.color!.getRawColor(dstMemory.memory, dstMemoryOffset);
                            }
                            dstMemoryOffset += 4;
                        }
                        x--;
                    }
                    else {
                        // TODO: FillOptionのチェック
                        fillOption.color!.getRawColor(dstMemory.memory, dstMemoryOffset);
                        dstMemoryOffset += 4;
                    }
                }
            }
        }
    }

    return renderRect;
}