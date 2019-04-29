import { RendererBase, RenderParameter, DefaultRenderParameter } from "./Renderer";
import { ILayer } from "../Layers/Layer";
import { Rect, Size, Offset } from "../Common";
import { HTMLCanvasLayer } from "../Layers/HTMLCanvasLayer";
import { transformLayer, FillOption, FillMethod } from "../LayerTransform";
import { Color, Colors } from "../Color";

export class CPURenderer extends RendererBase {
    private htmlCanvasLayer: HTMLCanvasLayer;

    constructor(size: Size, ctx: CanvasRenderingContext2D, background: Color = Colors.Gray) {
        super(size, background);

        ctx.canvas.width = size.width;
        ctx.canvas.height = size.height;
        this.htmlCanvasLayer = new HTMLCanvasLayer(ctx);
        this.htmlCanvasLayer.fill(background);
        this.htmlCanvasLayer.apply();
    }

    protected onSizeChange() {
        const ctx = this.htmlCanvasLayer.getContext();
        ctx.canvas.width = this.size.width;
        ctx.canvas.height = this.size.height;
        // HTMLCanvasLayerが作成時にサイズが決まっているので作り直し
        this.htmlCanvasLayer = new HTMLCanvasLayer(ctx);
        this.htmlCanvasLayer.fill(this.background);
        this.htmlCanvasLayer.apply();
    }

    protected onBackgroundChange() {
        this.htmlCanvasLayer = new HTMLCanvasLayer(this.htmlCanvasLayer.getContext());
        this.htmlCanvasLayer.fill(this.background);
        this.htmlCanvasLayer.apply();
    }

    protected renderCore(prevParam: RenderParameter, param: RenderParameter, isParamChanged: boolean, layer: ILayer, layerRenderRect: Rect): Rect {
        let renderRect: Rect;
        const layerSize = layer.getSize();

        const toLayerCoord = (offset: Offset, scale: number) => this.toLayerCoord(offset, scale, layerSize);

        if (isParamChanged) {
            const layerRect = new Rect(0, 0, layerSize.width, layerSize.height);
            const prevLayerRenderRect = layerRect.transform(prevParam.scale, toLayerCoord(prevParam.offset, prevParam.scale)).align();
            const currentLayerRenderRect = layerRect.transform(param.scale, toLayerCoord(param.offset, param.scale)).align();
            renderRect = prevLayerRenderRect.merge(currentLayerRenderRect);
        }
        else {
            renderRect = layerRenderRect.transform(param.scale, toLayerCoord(param.offset, param.scale)).align();
        }

        const fillOption: FillOption = { method: FillMethod.Color, color: this.background };

        const renderedRect = transformLayer(this.htmlCanvasLayer, layer, param.scale, param.scaleOption, toLayerCoord(param.offset, param.scale), fillOption, renderRect);
        if (!renderRect.isEmpty()) {
            this.htmlCanvasLayer.apply(renderedRect);
        }

        return renderedRect;
    }

    invalidate(param: RenderParameter, layer: ILayer) {
        const fillOption: FillOption = { method: FillMethod.Color, color: this.background };

        transformLayer(this.htmlCanvasLayer, layer, param.scale, param.scaleOption, this.toLayerCoord(param.offset, param.scale, layer.getSize()), fillOption);
        this.htmlCanvasLayer.apply();
    }

    private toLayerCoord(offset: Offset, scale: number, layerSize: Size): Offset {

        return { x: offset.x + this.size.width / 2 - layerSize.width / 2 * scale, y : -offset.y + this.size.height / 2 - layerSize.height / 2 * scale };
    }
}