import React, { Component, CSSProperties } from "react";
import { IPaintToolProvider, IPaintTool } from "../../paint/Tool";
import { Canvas as RawCanvas } from "../../paint/Canvas";
import { CanvasView as RawCanvasView, ICanvasView, OnViewRenderEventHandler } from "../../paint/CanvasView";
import { IEditableLayer } from "../../paint/Layers/Layer";
import { UndoManager } from "../../paint/UndoManager";
import { Offset, Size } from "../../paint/Common";

export type OnViewCreateEventHandler = (view: ICanvasView) => void;
export type OnSizeChangeEventHandler = (view: ICanvasView, size: Size) => void;

export type CanvasViewProps = {
    height?: number;
    width?: number;

    className?: string;

    scale: number;
    offset: Offset;

    disableEdit?: boolean;
    forceDisableGPU?: boolean;

    canvas: RawCanvas;
    activeLayer?: IEditableLayer;

    activeTool?: IPaintTool;
    moveTool?: IPaintTool;
    eraserTool?: IPaintTool;

    onViewCreate?: OnViewCreateEventHandler;
    onViewRender?: OnViewRenderEventHandler;

    onSizeChange?: OnSizeChangeEventHandler;
}

export type CanvasViewState = {
    container?: HTMLDivElement;
    view?: RawCanvasView;
}

export class CanvasView extends Component<CanvasViewProps, CanvasViewState> implements IPaintToolProvider {
    private unmounted: boolean = false;

    constructor(props: CanvasViewProps) {
        super(props);

        this.onWindowResize = this.onWindowResize.bind(this);
        this.prepareDOM = this.prepareDOM.bind(this);
        this.state = {};
        window.addEventListener('resize', this.onWindowResize);
    }

    render() {
        const style: CSSProperties = {
            width: this.props.width,
            height: this.props.height ? this.props.height : '100%',
            position: 'relative',
            overflow: 'hidden',
        };
        return <div className={this.props.className} style={style} ref={this.prepareDOM}/>;
    }

    componentDidUpdate(prevProps: CanvasViewProps) {
        if (prevProps.canvas !== this.props.canvas) {
            this.prepareView();
            return;
        }

        if (prevProps.forceDisableGPU !== this.props.forceDisableGPU) {
            this.prepareView();
            return;
        }

        if (this.state.view === undefined) return;

        if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
            this.state.view.setSize(this.calcViewSize());
        }

        if (prevProps.disableEdit !== this.props.disableEdit) {
            this.state.view.disableEdit(this.props.disableEdit ? this.props.disableEdit : false);
        }

        if (this.props.scale !== prevProps.scale) {
            this.state.view.setScale(this.props.scale);
        }

        if (this.props.offset.x !== prevProps.offset.x || this.props.offset.y !== prevProps.offset.y) {
            this.state.view.setOffset(this.props.offset);
        }

        if (prevProps.activeLayer !== this.props.activeLayer) {
            if (this.props.activeLayer !== undefined) {
                this.props.canvas.setActiveLayer(this.props.activeLayer);
            }
            this.props.canvas.render();
        }
    }

    componentWillUnmount() {
        if (this.state.view !== undefined) this.state.view.dispose();
        this.unmounted = true;
    }

    private onWindowResize() {
        if (this.state.view !== undefined && this.state.container !== undefined) {
            requestAnimationFrame(() => {
                if (this.unmounted || this.state.view === undefined) return;

                const view = this.state.view;
                view.setSize(this.calcViewSize());
                if (this.props.onSizeChange !== undefined) {
                    this.props.onSizeChange(view, view.getSize());
                }
            });
        }
    }

    private calcViewSize(): Size {
        const containerSize = this.state.container !== undefined ?
            { width: this.state.container.clientWidth, height: this.state.container.clientHeight } :
            { width: 100, height: 100 };

        return {
            width: this.props.width !== undefined ? this.props.width : containerSize.width,
            height: this.props.height !== undefined ? this.props.height : containerSize.height,
        };
    }

    private prepareDOM(canvasContainerElem: HTMLDivElement | null) {
        if (canvasContainerElem === null) {
            if (this.state.view !== undefined) {
                this.state.view.dispose();
            }
            return;
        }

        this.setState(prevState => {
            return {
                ...prevState,
                container: canvasContainerElem,
            };
        }, () => this.prepareView());
    }

    private prepareView() {
        if (this.state.container === undefined) return;

        if (this.state.view !== undefined) {
            this.state.container.removeChild(this.state.view.getHTMLCanvas());
        }

        // 最大20MB、100件まで
        const undoManager = new UndoManager(1024*1024*20, 100);
        const forceDisableGPU = this.props.forceDisableGPU !== undefined ? this.props.forceDisableGPU! : false;
        const view = new RawCanvasView(this.calcViewSize(), this.props.canvas, forceDisableGPU, undoManager, this, this.props.disableEdit ? this.props.disableEdit : false);
        const htmlCanvas = view.getHTMLCanvas();
        htmlCanvas.style.position = 'absolute';
        this.state.container.appendChild(view.getHTMLCanvas());

        if (this.props.activeLayer !== undefined) {
            this.props.canvas.setActiveLayer(this.props.activeLayer);
        }

        view.setScale(this.props.scale);
        view.setOffset(this.props.offset);
        view!.invalidate(true);


        this.setState(prevState => {
            if (prevState.view !== undefined) {
                prevState.view.dispose();
            }
            return {
                ...prevState,
                view: view!,
            };
        }, () => {
            if (this.props.onViewCreate !== undefined) {
                this.props.onViewCreate(this.state.view!);
            }

            if (this.props.onSizeChange !== undefined) {
                this.props.onSizeChange(this.state.view!, this.state.view!.getSize());
            }

            view.onViewRender((v, p, r) => {
                if (this.props.onViewRender !== undefined) {
                    this.props.onViewRender(v, p, r);
                }
            });
        });
    }

    getPaintTool(desc: string): IPaintTool | null {
        let result: IPaintTool | undefined = undefined;

        if (desc === 'middle') {
            result = this.props.moveTool;
        }
        else if (desc === 'eraser') {
            result = this.props.eraserTool;
        }

        return result || this.props.activeTool || null;
    }
}