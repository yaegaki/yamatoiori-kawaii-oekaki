import { Canvas } from "./Canvas";
import { Rect, Offset, Size, divVec2, sizeToVec2, subVec2, addVec2, getMiddlePoint, getLength, Vec2, mulVec2 } from "./Common";
import { PaintingContext } from "./Painting";
import { IPaintToolProvider, IPaintTool } from "./Tool";
import { HTMLCanvasLayer } from "./Layers/HTMLCanvasLayer";
import { ScaleMethod, ScaleOption } from "./LayerTransform";
import { bakeLayer } from "./Layers/Layer";
import { BlendMode } from "./Blend";
import { UndoManager } from "./UndoManager";
import { RenderParameter, cloneRenderParameter, DefaultRenderParameter, IRenderer } from "./Renderers/Renderer";
import { GPURenderer } from "./Renderers/GPURenderer";
import { CPURenderer } from "./Renderers/CPURenderer";
import { viewToCanvasCoord, canvasToViewCoord } from "./Coordinate";
import { Color } from "./Color";
import { GestureRecognizser } from "./Gesture";

export type OnViewRenderEventHandler = (view: ICanvasView, param: RenderParameter, renderRect: Rect) => void;

export interface ICanvasView {
    getSize(): Size;
    setSize(size: Size): void;

    getCanvas(): Canvas;

    getScale(): number;
    setScale(scale: number): void;
    getScaleOption(): ScaleOption;
    setScaleOption(scaleOption: ScaleOption): void;
    getOffset(): Offset;
    setOffset(offset: Offset): void;

    // キャンバスが表示されるようにViewを調節する
    adjustOffset(): void;

    canUndo(): boolean;
    undo(): void;
    canRedo(): boolean;
    redo(): void;

    // UndoRedoの初期化と再描画を行う
    reset(): void;

    invalidate(updateCanvas?: boolean): void;
    toBlob(): Promise<Blob>;

    onViewRender(h: OnViewRenderEventHandler): void
    removeOnViewRender(h: OnViewRenderEventHandler): void

    dispose(): void;
} 

// CanvasをHTMLCanvasElementに表示するクラス
export class CanvasView implements ICanvasView {
    private renderVersion: number = 0;
    private isCPURenderer: boolean = false;
    private renderer: IRenderer;
    private htmlCanvas: HTMLCanvasElement;
    private unSubscribeEvents: () => void;

    private renderParameter: RenderParameter = cloneRenderParameter(DefaultRenderParameter);
    private onViewRenders: OnViewRenderEventHandler[] = [];

    constructor(viewSize: Size, private canvas: Canvas, forceDisableGPU: boolean, private undoManager?: UndoManager, private paintToolProvider?: IPaintToolProvider, private _disableEdit?: boolean, private disableAutoAdjust?: boolean) {
        this.onCanvasRender = this.onCanvasRender.bind(this);
        this.canvas.onRender(this.onCanvasRender);

        let htmlCanvas = document.createElement('canvas');
        htmlCanvas.width = viewSize.width;
        htmlCanvas.height = viewSize.height;
        let renderer: IRenderer | null = null;

        const background = new Color(0.8, 0.8, 0.8, 1);

        if (!forceDisableGPU) {
            const gl = htmlCanvas.getContext('webgl');
            if (gl !== null) {
                renderer = GPURenderer.createGPURenderer(viewSize, gl, background);
                // webglコンテキストを取得してしまった時点で2dコンテキストが取得できないので作り直し
                if (renderer === null) {
                    let htmlCanvas = document.createElement('canvas');
                    htmlCanvas.width = viewSize.width;
                    htmlCanvas.height = viewSize.height;
                }
            }
        }

        if (renderer === null) {
            renderer = new CPURenderer(viewSize, htmlCanvas.getContext('2d')!, background);
            this.isCPURenderer = true;
        }
        this.renderer = renderer;
        this.htmlCanvas = htmlCanvas;

        let paintingContext: PaintingContext | null = null;
        const zeroVec2 = { x: 0, y: 0 };

        const viewCanvasCoordToViewCoord = (v: Vec2) => {
            const viewHalfSize = divVec2(sizeToVec2(this.getSize()), 2);
            return canvasToViewCoord(v, 1, zeroVec2, viewHalfSize);
        };

        const viewCoordToCanvasCanvasCoord = (v: Vec2) => {
            const canvasHalfSize = divVec2(sizeToVec2(this.canvas.getSize()), 2);
            return viewToCanvasCoord(v, this.renderParameter.scale, this.renderParameter.offset, canvasHalfSize);
        };

        const viewCanvasCoordToCanvasCanvasCoord = (v: Vec2) => {
            return viewCoordToCanvasCanvasCoord(viewCanvasCoordToViewCoord(v));
        };

        const start = (paintTool: IPaintTool, _x: number, _y: number, pressure: number): boolean => {
            // なんらかの理由でpointerupが取れなかった時のための処理
            if (paintingContext !== null) {
                paintingContext.cancel();
                paintingContext = null;
            }

            const activeLayer = this.canvas.getActiveLayer();
            const drawingLayer = this.canvas.getDrawingLayer();

            const { x, y } = viewCanvasCoordToCanvasCanvasCoord({ x: _x, y: _y });

            if (activeLayer === null || paintTool === null) {
                return false;
            }

            paintingContext = new PaintingContext(activeLayer, drawingLayer, paintTool, this, this.undoManager);
            paintingContext.start(x, y, pressure);
            return true;
        };

        const update = (_x: number, _y: number, pressure: number): boolean => {
            if (paintingContext === null) return false;

            const { x, y } = viewCanvasCoordToCanvasCanvasCoord({ x: _x, y: _y });

            paintingContext.update(x, y, pressure);
            return true;
        };

        const end = (): boolean => {
            if (paintingContext === null) return false;

            paintingContext.end();
            paintingContext = null;
            return true;
        };

        // iOS,Android以外はpointerevent(とマウス)を使う
        if ((navigator.userAgent.indexOf('iPhone') == -1 && navigator.userAgent.indexOf('iPad') == -1) && navigator.userAgent.indexOf('Android') == -1) {
            const onWheel = (e: WheelEvent) => {
                if (this._disableEdit || this.paintToolProvider === undefined) return;
                if (!e.cancelable) return;
                e.preventDefault();

                // マウスのある位置のView座標
                const vp = viewCanvasCoordToViewCoord({ x: e.offsetX, y: e.offsetY });
                // マウスのある位置のScaleを変更する前のCanvas座標
                const cp = viewCoordToCanvasCanvasCoord(vp);

                if (e.deltaY < 0) {
                    this.setScale(Math.min(this.renderParameter.scale + 0.2, 10));
                }
                else {
                    this.setScale(Math.max(this.renderParameter.scale - 0.2, 0.2));
                }

                // 現在の拡大率でのマウスがあった場所のView座標
                const p = canvasToViewCoord(cp, this.renderParameter.scale, zeroVec2, divVec2(sizeToVec2(this.canvas.getSize()), 2));
                this.setOffset(subVec2(vp, p));
                this.adjustOffset();
            };

            const onPointerdown = (e: PointerEvent) => {
                if (this._disableEdit || this.paintToolProvider === undefined) return;

                let desc;
                if (e.button === 1) {
                    desc = 'middle';
                }
                else {
                    desc = '';
                }

                const tool = this.paintToolProvider.getPaintTool(desc);
                if (tool === null) return;

                if (!start(tool, e.offsetX, e.offsetY, e.pressure)) return;

                htmlCanvas.setPointerCapture(e.pointerId);
                // ドラッグによる選択が起こらないようにする
                e.preventDefault();
            };

            const onPointermove = (e: PointerEvent) => {
                e.preventDefault();
                update(e.offsetX, e.offsetY, e.pressure);
            };

            const onPointerup = (e: PointerEvent) => {
                e.preventDefault();
                end();
            };

            htmlCanvas.addEventListener('wheel', onWheel);
            htmlCanvas.addEventListener('pointerdown', onPointerdown);
            htmlCanvas.addEventListener('pointermove', onPointermove);
            htmlCanvas.addEventListener('pointerup', onPointerup);

            this.unSubscribeEvents = () => {
                htmlCanvas.removeEventListener('wheel', onWheel);
                htmlCanvas.removeEventListener('pointerdown', onPointerdown);
                htmlCanvas.removeEventListener('pointermove', onPointermove);
                htmlCanvas.removeEventListener('pointerup', onPointerup);
            };
        }
        else {
            const gestureRecognizer = new GestureRecognizser(htmlCanvas);
            gestureRecognizer.onOneFingerGestureStart(t => {
                if (this._disableEdit || this.paintToolProvider === undefined) return;

                const tool = this.paintToolProvider.getPaintTool('touch');
                if (tool === null) return;

                if (!start(tool, t.position.x, t.position.y, 5)) return;
            });

            gestureRecognizer.onOneFingerGestureMove(t => {
                if (this._disableEdit || this.paintToolProvider === undefined) return;

                update(t.position.x, t.position.y, 5);
            });

            gestureRecognizer.onOneFingerGestureEnd(t => {
                if (this._disableEdit || this.paintToolProvider === undefined) return;

                end();
            });

            gestureRecognizer.onOneFingerGestureCancel(t => {
                if (paintingContext === null) return;

                paintingContext.cancel();
                paintingContext = null;
            });


            let startCenterPosition: Vec2 = zeroVec2;
            let startCenterCanvasPosition: Vec2 = zeroVec2;
            let startScaleOption = this.getScaleOption();
            let startScale = 1;
            let startDistance = 0;
            gestureRecognizer.onTwoFingerGesutureStart((f, s) => {
                if (this._disableEdit || this.paintToolProvider === undefined) return;

                startScaleOption = this.getScaleOption();
                startScale = this.renderParameter.scale;
                startCenterPosition = viewCanvasCoordToViewCoord(getMiddlePoint(f.position, s.position));
                startCenterCanvasPosition = viewCoordToCanvasCanvasCoord(startCenterPosition);
                startDistance = getLength(subVec2(s.position, f.position));
                this.setScaleOption({ method: ScaleMethod.NearestNeighbor });
            });

            gestureRecognizer.onTwoFingerGesutureMove((f, s) => {
                if (this._disableEdit || this.paintToolProvider === undefined) return;

                const currentCenter = viewCanvasCoordToViewCoord(getMiddlePoint(f.position, s.position));
                const currentDistance = getLength(subVec2(f.position, s.position));
                const ratio = currentDistance / startDistance;
                this.setScale(startScale * ratio);

                // ジェスチャを開始した地点での中点を現在のスケール、オフセット0のときに表示したときのView座標
                const p = canvasToViewCoord(startCenterCanvasPosition, this.renderParameter.scale, zeroVec2, divVec2(sizeToVec2(this.canvas.getSize()), 2));
                // 現在の中点が上記の座標に移動するようにオフセットを設定する
                this.setOffset(subVec2(currentCenter, p));

                this.adjustOffset();
            });

            gestureRecognizer.onTwoFingerGesutureEnd((f, s) => {
                if (this._disableEdit || this.paintToolProvider === undefined) return;
                this.setScaleOption(startScaleOption);
            });

            gestureRecognizer.onTwoFingerGesutureCancel((f, s) => {
                if (this._disableEdit || this.paintToolProvider === undefined) return;
                this.setScaleOption(startScaleOption);
            });

            this.unSubscribeEvents = () => {
                gestureRecognizer.dispose();
            };
        }
    }

    getHTMLCanvas(): HTMLCanvasElement {
        return this.htmlCanvas;
    }


    private onCanvasRender(_: Canvas, dirtyRect: Rect) {
        this.render(dirtyRect);
    }

    private render(dirtyRect?: Rect) {
        this.incRenderVersion();

        const rendered = this.renderer.render(this.renderParameter, this.canvas.getRenderedLayer(), dirtyRect);
        if (rendered.isEmpty()) return;

        this.onViewRenders.forEach(h => h(this, this.renderParameter, rendered));
    }

    private incRenderVersion() {
        this.renderVersion++;
        if (this.renderVersion > 10000) {
            this.renderVersion = 0;
        }
    }

    reset() {
        if (this.undoManager !== undefined) {
            this.undoManager.clear();
        }

        this.invalidate(true);
    }

    async toBlob(): Promise<Blob> {
        const tempCanvasElem = document.createElement('canvas');
        const canvasSize = this.canvas.getSize();
        tempCanvasElem.width = canvasSize.width;
        tempCanvasElem.height = canvasSize.height;
        const ctx = tempCanvasElem.getContext('2d')!;

        // 描画を最新の状態に更新する
        this.canvas.render(false);

        // renderedLayerの内容をcanvasにbake
        const tempCanvasLayer = new HTMLCanvasLayer(ctx);

        bakeLayer(BlendMode.DirectTop, tempCanvasLayer, this.canvas.getRenderedLayer());
        tempCanvasLayer.apply();


        return new Promise<Blob>((resolve, reject) => {
            ctx.canvas.toBlob(blob => {
                if (blob !== null) {
                    resolve(blob);
                }
                else {
                    reject('can not toBlob.');
                }
            });
        });
    }

    getSize(): Size {
        return this.renderer.getSize();
    }

    setSize(size: Size) {
        this.renderer.setSize(size);
        if (!this.disableAutoAdjust) {
            this.adjustOffset();
        }
        // Canvasのサイズが変わると表示内容が消えるのですぐに再描画してやらないと画面がブリンクしてしまう
        this.render();
    }

    disableEdit(disable: boolean) {
        this._disableEdit = disable;
    }

    getCanvas(): Canvas {
        return this.canvas;
    }

    getOffset(): Offset {
        return this.renderParameter.offset;
    }

    getScaleOption() {
        return this.renderParameter.scaleOption;
    }

    setScaleOption(scaleOption: ScaleOption) {
        this.renderParameter.scaleOption = scaleOption;
        this.delayRender();
    }

    canUndo(): boolean {
        if (this.undoManager === undefined) return false;
        return this.undoManager.canUndo();
    }

    undo() {
        if (this.undoManager === undefined) return false;
        const result = this.undoManager.undo();
        if (!result.dirtyRect.isEmpty()) {
            this.canvas.render(false, result.dirtyRect);
        }
    }

    canRedo(): boolean {
        if (this.undoManager === undefined) return false;
        return this.undoManager.canRedo();
    }

    redo() {
        if (this.undoManager === undefined) return false;
        const result = this.undoManager.redo();
        if (!result.dirtyRect.isEmpty()) {
            this.canvas.render(false, result.dirtyRect);
        }
    }

    setOffset(offset: Offset) {
        this.renderParameter.offset = offset;
        this.delayRender();
    }

    getScale(): number {
        return this.renderParameter.scale;
    }

    setScale(scale: number) {
        this.renderParameter.scale = scale;
        this.delayRender();
    }

    setPaintToolProvider(paintToolProvider?: IPaintToolProvider) {
        this.paintToolProvider = paintToolProvider;
    }

    onViewRender(h: OnViewRenderEventHandler) {
        this.onViewRenders.push(h);
    }

    removeOnViewRender(h: OnViewRenderEventHandler) {
        const index = this.onViewRenders.indexOf(h);
        if (index < 0) {
            return;
        }

        this.onViewRenders.splice(index, 1);
    }

    // Canvasが常に見えるようにOffsetを補正する
    adjustOffset() {
        const canvasSize = this.canvas.getSize();
        const scaledCanvasSize = mulVec2(sizeToVec2(canvasSize), this.renderParameter.scale);
        const scaledHalfCanvasSize = divVec2(scaledCanvasSize, 2);

        const viewSize = this.getSize();
        const viewHalfSize = divVec2(sizeToVec2(viewSize), 2);

        // 100pxかviewの1割は常に見えるようにする
        const border = Math.min(Math.min(viewSize.width, viewSize.height) / 10, 100);

        const nextOffset = { ...this.renderParameter.offset };
        if (this.renderParameter.offset.x < 0) {
            const canvasRight = scaledHalfCanvasSize.x + this.renderParameter.offset.x;
            if (canvasRight < (-viewHalfSize.x + border)) {
                nextOffset.x = -viewHalfSize.x + border - scaledHalfCanvasSize.x;
            }
        }
        else {
            const canvasLeft = -scaledHalfCanvasSize.x + this.renderParameter.offset.x;
            if (canvasLeft > viewHalfSize.x - border) {
                nextOffset.x = viewHalfSize.x - border + scaledHalfCanvasSize.x;
            }
        }

        if (this.renderParameter.offset.y < 0) {
            const canvasTop = scaledHalfCanvasSize.y + this.renderParameter.offset.y;
            if (canvasTop < (-viewHalfSize.y + border)) {
                nextOffset.y = -viewHalfSize.y + border - scaledHalfCanvasSize.y;
            }
        }
        else {
            const canvasBottom = -scaledHalfCanvasSize.y + this.renderParameter.offset.y;
            if (canvasBottom > viewHalfSize.y - border) {
                nextOffset.y = viewHalfSize.y - border + scaledHalfCanvasSize.y;
            }
        }

        // iOSで拡大しているとスクロールができる状態になる可能性がある
        // もしスクロールできる場合はスクロールさせる
        if (document.scrollingElement != null && (document.scrollingElement.scrollTop !== 0 || document.scrollingElement.scrollLeft !== 0)) {
            const diff = subVec2(nextOffset, this.renderParameter.offset);
            if (diff.x !== 0 || diff.y !== 0) document.scrollingElement.scrollBy(diff.x, -diff.y);
        }

        this.setOffset(nextOffset);
    }

    // 遅延描画を要求する
    private delayRender() {
        const _renderVersion = this.renderVersion;

        if (this.isCPURenderer) {
            // CPUは非力なので遅めに描画する
            // 30fps
            const delay = 32;
            setTimeout(() => {
                if (_renderVersion !== this.renderVersion) return;
                this.render();
            }, delay);
        }
        else {
            // 1フレームに1回になるように遅延させる
            requestAnimationFrame(() => {
                if (_renderVersion !== this.renderVersion) return;
                this.render();
            });
        }
    }

    invalidate(updateCanvas: boolean = false) {
        if (updateCanvas) {
            this.canvas.render(false);
        }

        this.incRenderVersion();
        this.renderer.invalidate(this.renderParameter, this.canvas.getRenderedLayer());
    }

    dispose() {
        this.canvas.removeOnRender(this.onCanvasRender);
        this.unSubscribeEvents();
    }
}