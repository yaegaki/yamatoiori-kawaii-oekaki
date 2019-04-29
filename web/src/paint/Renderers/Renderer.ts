import { ScaleOption, ScaleMethod } from "../LayerTransform";
import { Offset, Rect, Size } from "../Common";
import { ILayer } from "../Layers/Layer";
import { Color } from "../Color";

export type RenderParameter = {
    scale: number;
    scaleOption: ScaleOption;
    offset: Offset;
}

export interface IRenderer {
    getSize(): Size;
    // サイズを変更する
    // 変更できた場合はtrue,できなかった場合はfalse
    setSize(size: Size): void;

    getBackground(): Color;
    setBackground(color: Color): void;

    // レイヤを描画する
    // layerRenderRectを指定することでレイヤの特定の位置のみを再描画する
    // 描画した場所のRender座標系でのRectを返す
    render(param: RenderParameter, layer: ILayer, layerRenderRect?: Rect): Rect;

    // 全体を再描画する
    // 基本はデバッグ用
    invalidate(param: RenderParameter, layer: ILayer): void;
}

export const DefaultRenderParameter: RenderParameter = {
    scale: 1,
    scaleOption: { method: ScaleMethod.OverSampling, overSamplingOption: { subpixels: 2 } },
    offset: { x: 0, y: 0 },
};

export function compareRenderParameter(left: RenderParameter, right: RenderParameter): boolean {
    if (left.scale !== right.scale) return false;
    if (left.scaleOption.method !== right.scaleOption.method) return false;
    if (left.scaleOption.overSamplingOption !== undefined && right.scaleOption.overSamplingOption !== undefined) {
        if (left.scaleOption.overSamplingOption.subpixels !== right.scaleOption.overSamplingOption.subpixels) return false;
    }
    else if (left.scaleOption.overSamplingOption === undefined && right.scaleOption.overSamplingOption !== undefined) return false;
    if (left.offset.x !== right.offset.x) return false;
    if (left.offset.y !== right.offset.y) return false;

    return true;
}

export function cloneRenderParameter(param: RenderParameter): RenderParameter {
    const overSamplingOption = param.scaleOption.overSamplingOption !== undefined ? { ...param.scaleOption.overSamplingOption } : undefined;
    return {
        scale: param.scale,
        scaleOption: {
            method: param.scaleOption.method,
            overSamplingOption: overSamplingOption,
        },
        offset: { ...param.offset },
    };
}

export abstract class RendererBase implements IRenderer {
    private prevParam: RenderParameter = cloneRenderParameter(DefaultRenderParameter);

    constructor(protected size: Size, protected background: Color) {
    }

    getSize(): Size {
        return this.size;
    }

    setSize(size: Size): void {
        this.size = size;
        this.onSizeChange();
    }

    protected abstract onSizeChange(): void;

    getBackground(): Color {
        return this.background;
    }

    setBackground(color: Color) {
        this.background = color;
    }

    protected abstract onBackgroundChange(): void;


    render(param: RenderParameter, layer: ILayer, layerRenderRect?: Rect): Rect {
        if (layerRenderRect === undefined) {
            const layerSize = layer.getSize();
            layerRenderRect = new Rect(0, 0, layerSize.width, layerSize.height);
        }

        const renderedRect = this.renderCore(this.prevParam, param, !compareRenderParameter(this.prevParam, param), layer, layerRenderRect);
        this.prevParam = cloneRenderParameter(param);
        return renderedRect;
    }

    protected abstract renderCore(prevParam: RenderParameter, param: RenderParameter, isParamChanged: boolean, layer: ILayer, layerRenderRect: Rect): Rect;

    invalidate(param: RenderParameter, layer: ILayer) {
    }
}
