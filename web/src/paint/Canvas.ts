import { IEditableLayer, ILayer, bakeLayer, IDrawingLayer } from "./Layers/Layer";
import { RGBA8Layer } from "./Layers/RGBA8Layer";
import { Rect, Size } from "./Common";
import { BlendMode } from "./Blend";

export type OnRenderEventHandler = (canvas: Canvas, dirtyRect: Rect) => void;

export class Canvas {
    private layers: ILayer[] = [];
    // ツールで描画した後にベイクするレイヤ
    private activeLayer?: IEditableLayer;
    // 描画結果を格納するレイヤ
    private renderedLayer: RGBA8Layer;
    // ツールで描画する一時的なレイヤ
    private drawingLayer: RGBA8Layer;
    // ツールで描画中に結果を一時的に格納しておくレイヤ(activeLayerとdrawinLayerを合成したもの)
    private tempLayer: RGBA8Layer;
    private onRenders: OnRenderEventHandler[] = [];

    constructor(private width: number, private height: number) {
        this.renderedLayer = new RGBA8Layer(width, height);
        this.drawingLayer = new RGBA8Layer(width, height);
        this.tempLayer = new RGBA8Layer(width, height);
    }

    getSize(): Size {
        return { width: this.width, height: this.height };
    }

    pushLayer(layer: ILayer) {
        this.layers.push(layer);
    }

    clearLayer() {
        this.layers.length = 0;
    }

    getLayers(): ILayer[] {
        return this.layers;
    }

    // 描画対象のレイヤー
    getActiveLayer(): IEditableLayer | null {
        return this.activeLayer || null;
    }

    setActiveLayer(layer: IEditableLayer) {
        this.activeLayer = layer;
    }

    // 一時的に描画内容を表示するレイヤー
    // マウスを離したときにこのレイヤーからActiveLayerにコピーされる
    getDrawingLayer(): IDrawingLayer {
        return this.drawingLayer;
    }

    // レイヤーをすべて描画した結果のレイヤー
    getRenderedLayer(): ILayer {
        return this.renderedLayer;
    }

    render(renderDrawingLayer?: boolean, dirtyRect?: Rect) {
        if (dirtyRect === undefined) {
            dirtyRect = new Rect(0, 0, this.width, this.height) ;
        }

        let isFirst = true;
        this.layers.forEach(layer => {
            // アクティブレイヤーの上に描画中のレイヤをかぶせる
            if (renderDrawingLayer && layer === this.activeLayer && this.drawingLayer !== undefined) {
                // まずアクティブレイヤを一時レイヤに描く
                bakeLayer(BlendMode.DirectTop, this.tempLayer, layer, dirtyRect);

                // 次に描画中レイヤを描く
                bakeLayer(this.drawingLayer.getBlendMode(), this.tempLayer, this.drawingLayer, dirtyRect);

                // 合成したものをrenderedに各描く
                bakeLayer(isFirst ? BlendMode.DirectTop : layer.getBlendMode(), this.renderedLayer, this.tempLayer, dirtyRect);
            }
            else {
                bakeLayer(isFirst ? BlendMode.DirectTop : layer.getBlendMode(), this.renderedLayer, layer, dirtyRect);
            }

            isFirst = false;
        });
        this.onRenders.forEach(r => r(this, dirtyRect!));
    }


    onRender(h: OnRenderEventHandler) {
        this.onRenders.push(h);
    }

    removeOnRender(h: OnRenderEventHandler) {
        const index = this.onRenders.indexOf(h);
        if (index < 0) {
            return;
        }

        this.onRenders.splice(index, 1);
    }
}