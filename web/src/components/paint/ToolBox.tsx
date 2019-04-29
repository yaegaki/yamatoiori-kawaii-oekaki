import React, { Component } from "react";
import { Canvas } from "../../paint/Canvas";
import { CanvasView } from "./CanvasView";

import './ToolBox.css';
import { Offset, Size, Rect, divVec2, sizeToVec2, inverseYVec2, mulVec2, subVec2 } from "../../paint/Common";
import { IPaintTool } from "../../paint/Tool";
import { viewToCanvasCoord, canvasToViewCoord } from "../../paint/Coordinate";
import { AppContext } from "../../AppContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type OnActiveToolChangeEventHandler = (activeTool: IPaintTool) => void;
type OnUndoEventHandler = () => void;
type OnRedoEventHandler = () => void;
type OnClearAllEventHandler = () => void;
type OnPostEventHandler = () => void;
type OnResetParameterEventHandler = () => void;

type ToolBoxProps = {
    canvas: Canvas;
    mainViewSize: Size;
    mainViewScale: number;
    mainViewOffset: Offset;

    penTool: IPaintTool;
    eraserTool: IPaintTool;

    activeTool: IPaintTool;

    canUndo: boolean;
    canRedo: boolean;

    onActiveToolChange?: OnActiveToolChangeEventHandler;
    onUndo?: OnUndoEventHandler;
    onRedo?: OnRedoEventHandler;
    onClearAll?: OnClearAllEventHandler;

    onPost?: OnPostEventHandler;

    onResetParameter?: OnResetParameterEventHandler;
}

type ToolBoxState = {
}

export class ToolBox extends Component<ToolBoxProps, ToolBoxState> {
    constructor(props: ToolBoxProps) {
        super(props);

        this.onPenToolClick = this.onPenToolClick.bind(this);
        this.onEraserToolClick = this.onEraserToolClick.bind(this);
        this.onUndoClick = this.onUndoClick.bind(this);
        this.onRedoClick = this.onRedoClick.bind(this);
        this.onClearAllClick = this.onClearAllClick.bind(this);
        this.onPostClick = this.onPostClick.bind(this);
        this.onResetParameter = this.onResetParameter.bind(this);

        this.state = {
        };
    }

    render() {
        const canvasSize = sizeToVec2(this.props.canvas.getSize());
        const canvasHalfSize = divVec2(canvasSize, 2);
        const canvasRect = new Rect(0, 0, canvasSize.x, canvasSize.y);

        const viewSize = sizeToVec2(this.props.mainViewSize);
        const viewHalfSize = divVec2(viewSize, 2);
        const viewCanvasLeftTop = viewToCanvasCoord(mulVec2(inverseYVec2(viewHalfSize), -1), this.props.mainViewScale, this.props.mainViewOffset, canvasHalfSize);
        const viewCanvasSize = divVec2(viewSize, this.props.mainViewScale);
        const viewCanvasRect = new Rect(viewCanvasLeftTop.x, viewCanvasLeftTop.y, viewCanvasSize.x, viewCanvasSize.y);

        const previewViewLen = 100;
        const preivewViewSize = { x: previewViewLen, y: previewViewLen };
        const previewViewHalfSize = divVec2(preivewViewSize, 2);

        const zeroVec2 = { x: 0, y: 0 };
        const intersected = viewCanvasRect.intersect(canvasRect);
        const visibility = intersected.isEmpty() ? 'hidden' : 'visible'
        const previewScale = previewViewLen / Math.max(canvasSize.x, canvasSize.y);
        const canvasPreviewViewLeftTop = canvasToViewCoord(intersected.offset, previewScale, zeroVec2, canvasHalfSize);
        const canvasPreviewCanvasLeftTop = viewToCanvasCoord(canvasPreviewViewLeftTop, 1, zeroVec2, previewViewHalfSize);

        const left = canvasPreviewCanvasLeftTop.x;
        const top = canvasPreviewCanvasLeftTop.y
        const width = intersected.width * previewScale;
        const height = intersected.height * previewScale;

        return <div className="toolbox">
            <div>
                <h3>Preview</h3>
                <div className="mini-map-container">
                    <div className="mini-map">
                        <div className="canvas-container">
                            <CanvasView width={100} height={100} scale={previewScale} offset={zeroVec2} canvas={this.props.canvas} forceDisableGPU={true} disableEdit={true}/>
                        </div>
                        <div className="show-rect" style={{
                            visibility: visibility,
                            left: left,
                            top: top,
                            width: width,
                            height: height,
                        }}></div>
                    </div>
                </div>
            </div>
            <div className="toolbox-menu">
                <div>
                    <h3>ツール</h3>
                    <button onClick={this.onPenToolClick} disabled={this.props.activeTool === this.props.penTool}><FontAwesomeIcon icon="pen"/>ペン</button>
                    <button onClick={this.onEraserToolClick} disabled={this.props.activeTool === this.props.eraserTool}><FontAwesomeIcon icon="eraser"/>消しゴム</button>
                    <h3>アクション</h3>
                    <div>
                        <button onClick={this.onUndoClick} disabled={!this.props.canUndo}><FontAwesomeIcon icon="undo"/>戻す</button>
                        <button onClick={this.onRedoClick} disabled={!this.props.canRedo}><FontAwesomeIcon icon="redo"/>進める</button>
                    </div>
                    <button onClick={this.onClearAllClick}><FontAwesomeIcon icon="bomb"/>全消し</button>
                    <h3>その他</h3>
                    <AppContext.Consumer>
                        {value => {
                            if (value.topBarVisible) {
                                return <button onClick={() => {
                                    value.setTopBarVisibility(false);
                                }}>全画面表示</button>;
                            }
                            else {
                                return <button onClick={() => {
                                    value.setTopBarVisibility(true);
                                }}>全画面表示解除</button>;
                            }
                        }}
                    </AppContext.Consumer>
                    <button onClick={this.onPostClick}>投稿</button>
                </div>
            </div>
        </div>;
    }

    private onPenToolClick() {
        if (this.props.onActiveToolChange !== undefined) this.props.onActiveToolChange(this.props.penTool);
    }

    private onEraserToolClick() {
        if (this.props.onActiveToolChange !== undefined) this.props.onActiveToolChange(this.props.eraserTool);
    }

    private onUndoClick() {
        if (this.props.onUndo !== undefined) this.props.onUndo();
    }

    private onRedoClick() {
        if (this.props.onRedo !== undefined) this.props.onRedo();
    }

    private onClearAllClick() {
        if (this.props.onClearAll !== undefined) this.props.onClearAll();
    }

    private onResetParameter() {
        if (this.props.onResetParameter !== undefined) this.props.onResetParameter();
    }

    private onPostClick() {
        if (this.props.onPost !== undefined) this.props.onPost();
    }
}