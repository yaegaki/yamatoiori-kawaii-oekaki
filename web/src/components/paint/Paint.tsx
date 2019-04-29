import React, { Component, ChangeEvent, FormEvent } from "react";
import { CanvasView } from "./CanvasView";
import { Canvas as RawCanvas } from "../../paint/Canvas";
import { ICanvasView } from "../../paint/CanvasView";
import { RGBA8Layer } from "../../paint/Layers/RGBA8Layer";
import { Colors } from "../../paint/Color";
import { IPaintTool, PenTool, MoveTool, EraserTool } from "../../paint/Tool";
import { IEditableLayer } from "../../paint/Layers/Layer";
import { Offset, Size } from "../../paint/Common";
import { ToolBox } from "./ToolBox";
import { RenderParameter } from "../../paint/Renderers/Renderer";
import ReactModal from "react-modal";
import { Prompt, RouteComponentProps } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Loading } from "../common/Loading";
import { Link } from "react-router-dom";
import { Share } from 'react-twitter-widgets';

import './Paint.css';

export type PaintState = {
    viewHeight: number;

    actualViewSize: Size;

    scale: number;
    offset: Offset;

    dirty: boolean;

    rawCanvas: RawCanvas;
    activeLayer: IEditableLayer;
    penTool: IPaintTool;
    moveTool: IPaintTool;
    eraserTool: IPaintTool;
    activeTool: IPaintTool;

    rawView?: ICanvasView;

    forceDisableGPU: boolean;

    modalState: ModalState;

    canvasBlobURL?: string;

    tag: string;
    answer: string;

    resultId: string;
}

enum ModalState {
    Close,
    Post,
    Confirm,
    Posting,
    Result,
    Error,
}

export class Paint extends Component<RouteComponentProps, PaintState> {
    private unmounted: boolean = false;

    constructor(props: RouteComponentProps) {
        super(props);

        const width = 955;
        const height = 500;
        const backLayer = new RGBA8Layer(width, height);
        const topLayer = new RGBA8Layer(width, height);
        backLayer.fill(Colors.White);
        topLayer.fill(Colors.White);
        const rawCanvas = new RawCanvas(width, height);
        rawCanvas.pushLayer(backLayer);
        rawCanvas.pushLayer(topLayer);

        this.onSizeChange = this.onSizeChange.bind(this);
        this.onViewCreate = this.onViewCreate.bind(this);
        this.onViewRender = this.onViewRender.bind(this);


        this.onActiveToolChange = this.onActiveToolChange.bind(this);
        this.onUndo = this.onUndo.bind(this);
        this.onRedo = this.onRedo.bind(this);
        this.onClearAll = this.onClearAll.bind(this);
        this.onReset = this.onReset.bind(this);
        this.openModal = this.openModal.bind(this);

        this.onRequestCloseModal = this.onRequestCloseModal.bind(this);
        this.onCloseModal = this.onCloseModal.bind(this);
        this.onCheckPost = this.onCheckPost.bind(this);
        this.onPost = this.onPost.bind(this);

        this.onTagChange = this.onTagChange.bind(this);
        this.onAnswerChange = this.onAnswerChange.bind(this);

        const penTool = new PenTool(5);

        let tag = localStorage.getItem('tag');
        if (tag === null) {
            tag = '';
        }
        else {
            const tagTime = parseInt(localStorage.getItem('tag-time') || '0');
            // 1日たったら消す
            const tagExpire = 1000 * 60 * 60 * 24;
            if (!Number.isFinite(tagTime) || Date.now() - tagTime > tagExpire) {
                tag = '';
                localStorage.removeItem('tag');
                localStorage.removeItem('tag-time');
            }
        }

        this.state = {
            viewHeight: 600,
            actualViewSize: { width: 100, height: 600 },

            scale: 1,
            offset: { x: 0, y: 0 },

            dirty: false,

            rawCanvas,
            activeLayer: topLayer,
            penTool: penTool,
            moveTool: new MoveTool(),
            eraserTool: new EraserTool(10),
            activeTool: penTool,

            forceDisableGPU: false,

            modalState: ModalState.Close,

            tag: tag,
            answer: '',

            resultId: '',
        };

        this.onBeforeUnload = this.onBeforeUnload.bind(this);
        window.addEventListener('beforeunload', this.onBeforeUnload);
    }

    render() {
        return <div className="main-canvas-with-tool tool-box-right expand-height">
            <div className="paint-grid-1">
                <CanvasView
                    scale={this.state.scale} offset={this.state.offset}
                    canvas={this.state.rawCanvas}
                    activeLayer={this.state.activeLayer}
                    activeTool={this.state.activeTool}
                    moveTool={this.state.moveTool}
                    onSizeChange={this.onSizeChange}
                    onViewCreate={this.onViewCreate}
                    onViewRender={this.onViewRender}/>
            </div>
            <div className="paint-grid-2">
                <ToolBox
                    canvas={this.state.rawCanvas}
                    mainViewOffset={this.state.offset}
                    mainViewScale={this.state.scale}
                    mainViewSize={this.state.actualViewSize}
                    
                    penTool={this.state.penTool}
                    eraserTool={this.state.eraserTool}
                    activeTool={this.state.activeTool}

                    onActiveToolChange={this.onActiveToolChange}
                    canUndo={this.canUndo()}
                    canRedo={this.canRedo()}
                    onUndo={this.onUndo}
                    onRedo={this.onRedo}
                    onClearAll={this.onClearAll}
                    onPost={this.openModal}
                    onResetParameter={this.onReset}/>
            </div>
            <div className="paint-grid-3 menu-buttons">
                <button disabled={this.state.activeTool === this.state.penTool} onClick={() => this.onActiveToolChange(this.state.penTool)}><FontAwesomeIcon icon="pen"/></button>
                <button disabled={this.state.activeTool === this.state.eraserTool} onClick={() => this.onActiveToolChange(this.state.eraserTool)}><FontAwesomeIcon icon="eraser"/></button>
                <button disabled={!this.canUndo()} onClick={this.onUndo}><FontAwesomeIcon icon="undo"/></button>
                <button disabled={!this.canRedo()} onClick={this.onRedo}><FontAwesomeIcon icon="redo"/></button>
                <button onClick={this.onClearAll}><FontAwesomeIcon icon="bomb"/></button>
                <button onClick={this.openModal}><FontAwesomeIcon icon="bars"/></button>
                <ReactModal isOpen={this.state.modalState !== ModalState.Close} onRequestClose={this.onRequestCloseModal} shouldCloseOnEsc={true}>
                    {this.renderModal()}
                </ReactModal>
            </div>
            <Prompt when={this.state.dirty} message="このページを離れますか？お絵描き中の内容は失われます。"/>
        </div>;
    }

    componentWillUnmount() {
        this.unmounted = true;
        window.removeEventListener('beforeunload', this.onBeforeUnload);
    }

    private openModal() {
        this.state.rawView!.toBlob().then(b => {
            if (this.unmounted) return;

            this.setState(prev => {
                if (prev.canvasBlobURL !== undefined) {
                    URL.revokeObjectURL(prev.canvasBlobURL);
                }

                return {
                    ...prev,
                    canvasBlobURL: URL.createObjectURL(b),
                    modalState: ModalState.Post,
                };
            });
        })
    }

    private renderModal() {
        switch (this.state.modalState) {
            case ModalState.Post:
                return this.renderPostModal();
            case ModalState.Confirm:
                return this.renderConfirmModal();
            case ModalState.Posting:
                return this.renderPostingModal();
            case ModalState.Result:
                return this.renderResultModal();
            case ModalState.Error:
                return this.renderErrorModal();
            default:
                return this.renderPostModal();
        }
    }

    private renderPostModal() {
        return <div>
            <div>
                {
                    this.state.canvasBlobURL !== undefined ?
                        <img className="pic" src={this.state.canvasBlobURL}/> :
                        <div />
                }
            </div>
            <form onSubmit={this.onCheckPost}>
                <div className="paint-modal-field">
                    <div>タグ<input className="input-text" placeholder="タグ(動画IDなど)" value={this.state.tag} onChange={this.onTagChange}/></div>
                    <div>解答<input className="input-text" placeholder="あなたの解答" value={this.state.answer} onChange={this.onAnswerChange}/></div>
                </div>
                <div className="modal-buttons">
                    <button type="button" onClick={this.onCloseModal}>閉じる</button>
                    <button>投稿</button>
                </div>
            </form>
        </div>;
    }

    private renderConfirmModal() {
        return <div>
            <div>以下の内容で投稿しますか？</div>
            <div>
                {
                    this.state.canvasBlobURL !== undefined ?
                        <img className="pic" src={this.state.canvasBlobURL}/> :
                        <div/>
                }
            </div>
            <div className="paint-modal-field">
                <div>タグ<div className="input-text">{this.state.tag}</div></div>
                <div>解答<div className="input-text">{this.state.answer}</div></div>
            </div>
            <form onSubmit={this.onPost}>
                <div className="modal-buttons">
                    <button type="button" onClick={this.onCloseModal}>閉じる</button>
                    <button>OK</button>
                </div>
            </form>
        </div>;
    }

    private renderPostingModal() {
        return <div>
            <div>投稿中...</div>
            <Loading/>
        </div>;
    }

    private renderResultModal() {
        const picUrl = `/p/${this.state.resultId}`;
        const shareOptions = {
            text: this.state.answer === '' ? `絵を投稿しました` : `絵を投稿しました\n解答は「${this.state.answer}」です`,
            hashtags: '諸説あるお絵描き',
        };
        const listUrl = this.state.tag === '' ? '/list' : `/list?t=${this.state.tag}`;
        const picUrlForShare = `${location.origin}${picUrl}`;
        return <div>
            <div>投稿が完了しました</div>
            <div><Link to={picUrl} target="new">投稿を確認する</Link></div>
            <div><Link to={listUrl} target="new">他の人の投稿を見る</Link></div>
            <div className="share-button"><Share url={picUrlForShare} options={shareOptions}/></div>
            <div className="modal-buttons"><button onClick={this.onCloseModal}>閉じる</button></div>
        </div>;
    }

    private renderErrorModal() {
        return <div>
            <div>投稿中にエラーが発生しました</div>
            <div className="modal-buttons"><button onClick={this.onCloseModal}>閉じる</button></div>
        </div>;
    }

    private onSizeChange(_: ICanvasView, size: Size) {
        this.setState(prev => {
            return {
                ...prev,
                actualViewSize: size,
            };
        });
    }

    private onViewCreate(view: ICanvasView) {
        this.setState(prev => {
            const viewSize = view.getSize();
            const canvasSize = view.getCanvas().getSize();
            let scale = this.state.scale;

            const wr = viewSize.width / canvasSize.width * 0.9;
            const hr = viewSize.height / canvasSize.height * 0.9;

            scale = Math.min(Math.max(wr, hr), 1);


            return {
                ...prev,
                rawView: view,
                scale: scale,
            };
        });
    }

    private onViewRender(v: ICanvasView, current: RenderParameter) {
        this.setState(prev => {
            return {
                ...prev,
                scale: current.scale,
                offset: current.offset,
                dirty: v.canUndo() || v.canRedo(),
            };
        });
    }

    private onActiveToolChange(activeTool: IPaintTool) {
        this.setState(prev => {
            return {
                ...prev,
                activeTool: activeTool,
            };
        });
    }

    private canUndo(): boolean {
        if (this.state.rawView !== undefined) return this.state.rawView.canUndo();
        return false;
    }

    private canRedo(): boolean {
        if (this.state.rawView !== undefined) return this.state.rawView.canRedo();
        return false;
    }

    private onUndo() {
        if (this.state.rawView !== undefined) this.state.rawView.undo();
    }

    private onRedo() {
        if (this.state.rawView !== undefined) this.state.rawView.redo();
    }

    private onClearAll() {
        if (this.state.rawView === undefined) return;

        const result = window.confirm("全消ししますか？この操作は戻せません。");
        if (!result) return;

        this.state.activeLayer.fill(Colors.White);
        this.state.rawView.reset();
    }

    private async post(): Promise<string> {
        if (this.state.rawView === undefined) {
            throw new Error('ravView is undefined.');
        }

        localStorage.setItem('tag', this.state.tag);
        localStorage.setItem('tag-time', Date.now().toString())

        const blob = await this.state.rawView.toBlob();
        const form = new FormData();
        form.append('file', blob);
        form.append('tag', this.state.tag);
        form.append('answer', this.state.answer);
        form.append('author', this.getOrCreateValue('author', uuidv4));
        form.append('signature', this.getOrCreateValue('signature', uuidv4));

        const res = await fetch('/api/post', { method: 'POST', body: form });
        if (!res.ok) {
            throw new Error('http error.');
        }
        console.log('done');
        const json = await res.json();

        if (json.id === undefined) {
            throw new Error('invalid response.');
        }

        return json.id!;
    }

    private getOrCreateValue(key: string, factory: () => string): string {
        let v = localStorage.getItem(key);
        if (v !== null) return v;
        v = factory();
        localStorage.setItem(key, v);
        return v;
    }

    private onReset() {
        this.setState(prev => {
            return {
                ...prev,
                offset: { x: 0, y: 0 },
                scale: 1,
            };
        });
    }

    private onTagChange(e: ChangeEvent<HTMLInputElement>) {
        const v = e.currentTarget.value;
        this.setState(prev => {
            return {
                ...prev,
                tag: v.substring(0, 20),
            };
        });
    }

    private onAnswerChange(e: ChangeEvent<HTMLInputElement>) {
        const v = e.currentTarget.value;
        this.setState(prev => {
            return {
                ...prev,
                answer: v.substring(0, 20),
            };
        });
    }

    private onRequestCloseModal() {
        // 閉じることができるときとできないときがある
        switch (this.state.modalState) {
            case ModalState.Post:
            case ModalState.Confirm:
            case ModalState.Result:
            case ModalState.Error:
                this.onCloseModal();
                return;
            default:
                return;
        }
    }

    private onCloseModal() {
        this.setState(prev => {
            return {
                ...prev,
                modalState: ModalState.Close,
                answer: '',
            };
        });
    }

    private onCheckPost(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        this.setState(prev => {
            return {
                ...prev,
                modalState: ModalState.Confirm,
            };
        });
    }

    private onPost(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        this.post()
            .then(id => {
                if (this.unmounted) return;

                this.setState(prev => {
                    return {
                        ...prev,
                        modalState: ModalState.Result,
                        resultId: id,
                    };
                });
            })
            .catch(e => {
                if (this.unmounted) return;
                console.error(e);

                this.setState(prev => {
                    return {
                        ...prev,
                        modalState: ModalState.Error,
                    };
                });
            });

        this.setState(prev => {
            return {
                ...prev,
                modalState: ModalState.Posting,
            };
        });
    }

    private checkDirty(): boolean {
        return this.state.rawView !== undefined && this.state.dirty;
    }

    private onBeforeUnload(e: BeforeUnloadEvent) {
        if (!this.checkDirty()) return;

        e.preventDefault();
        e.returnValue = '';
    }
}

// https://stackoverflow.com/a/2117523
function uuidv4(): string {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, _c => {
      const c = Number(_c);
      return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
  });
}

