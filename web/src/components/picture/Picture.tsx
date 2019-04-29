import React, { Component, FormEvent } from "react";
import ReactModal from "react-modal";
import { RouteComponentProps } from "react-router";
import { Picture as PictureModel, PictureResponse } from "../../models/Picture";
import { Loading } from "../common/Loading";
import { NotFound } from "../common/NotFound";

import './Picture.css';
import { Share } from "react-twitter-widgets";

enum ModalState {
    Close,
    Confirm,
    Deleting,
    Result,
    Error,
}

type PictureState = {
    pic?: PictureModel;
    isMine: boolean;
    authorHash: string;
    notFound: boolean;
    loading: boolean,
    modalState: ModalState,
}

export class Picture extends Component<RouteComponentProps, PictureState> {
    private unmounted: boolean = false;

    constructor(props: RouteComponentProps) {
        super(props);

        const w: any = window;

        const params: any = props.match.params;
        const id: string | undefined = params['id'];
        if (id === undefined) {
            this.state = {
                notFound: true,
                isMine: false,
                authorHash: '',
                loading: false,
                modalState: ModalState.Close,
            };
            return;
        }

        let initialRes: PictureResponse | undefined = w.INITIAL_STATE;
        if (initialRes !== undefined) {
            // SPAモードに入った場合はfetchしないといけないのでidをチェック
            if (initialRes.id !== id) {
                initialRes = undefined;
            }
        }

        this.onOpenModal = this.onOpenModal.bind(this);
        this.onCloseModal = this.onCloseModal.bind(this);
        this.onRequestModalClose = this.onRequestModalClose.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onExit = this.onExit.bind(this);

        if (initialRes === undefined) {
            this.state = {
                notFound: false,
                isMine: false,
                authorHash: '',
                loading: true,
                modalState: ModalState.Close,
            };

            let url = `/api/picture?id=${id}`;
            const self = localStorage.getItem('author');
            if (self !== null) {
                url += `&self=${self}`;
            }

            fetch(url)
                .then(async r => {
                    const res = await r.json();
                    if (this.unmounted) return;

                    this.setState(prev => {
                        return {
                            ...prev,
                            pic: res.picture,
                            notFound: res.picture === undefined,
                            loading: false,
                            authorHash: res.authorHash,
                        };
                    }, () => this.checkIsMine());
                })
                .catch(_ => {
                    if (this.unmounted) return;

                    this.setState(prev => {
                        return {
                            ...prev,
                            notFound: true,
                            loading: false,
                        };
                    });
                });
        }
        else {
            this.state = {
                pic: initialRes.picture,
                notFound: initialRes.picture === undefined,
                isMine: false,
                authorHash: initialRes.authorHash,
                loading: false,
                modalState: ModalState.Close,
            };
            this.checkIsMine();
        }
    }

    render() {
        if (this.state.loading) {
            return <Loading/>;
        }
        else if (this.state.notFound) {
            return <NotFound/>;
        }
        else {
            const pic = this.state.pic!;
            const url = this.nameToURL(pic.name);
            const shareUrl = location.href;
            const shareOptions = {
                text: pic.answer !== '' ? `「${pic.answer}」` : 'タイトルなし',
                hashtags: '諸説あるお絵描き',
            };

            return <div className="picture">
                <div>
                    <img className="pic" src={url}/>
                </div>
                <div className="info">
                    <div className="answer">{pic.answer}</div>
                    <div className="tag">#{pic.tag}</div>
                    <div className="share-button"><Share url={shareUrl} options={shareOptions}/></div>
                    { this.state.isMine ? this.renderDeleteForm() : '' }
                </div>
                <ReactModal isOpen={this.state.modalState !== ModalState.Close} onRequestClose={this.onRequestModalClose} shouldCloseOnEsc={true}>
                    {this.renderModal()}
                </ReactModal>
            </div>
        }
    }

    private renderDeleteForm() {
        return <form onSubmit={this.onOpenModal}>
            <button className="delete">削除</button>
        </form>;
    }

    private renderModal() {
        switch (this.state.modalState) {
            case ModalState.Confirm:
                return this.renderConfirmModal();
            case ModalState.Deleting:
                return this.renderDeletingModal();
            case ModalState.Result:
                return this.renderResultModal();
            case ModalState.Error:
                return this.renderErrorModal();
            default:
                return <div></div>;
        }
    }

    private renderConfirmModal() {
        return <div>
            <div>本当に削除しますか？</div>
            <div><strong>この操作は取り消すことができません</strong></div>
            <div className="modal-buttons">
                <button onClick={this.onCloseModal}>閉じる</button>
                <button onClick={this.onDelete} className="delete">削除</button>
            </div>
        </div>;
    }

    private renderDeletingModal() {
        return <div>
            <div>削除中...</div>
            <Loading/>
        </div>;
    }

    private renderResultModal() {
        return <div>
            <div>削除が完了しました</div>
            <div className="modal-buttons"><button onClick={this.onExit}>閉じる</button></div>
        </div>;
    }

    private renderErrorModal() {
        return <div>
            <div>削除中にエラーが発生しました</div>
            <div className="modal-buttons"><button onClick={this.onCloseModal}>閉じる</button></div>
        </div>;
    }

    private onRequestModalClose() {
        switch (this.state.modalState) {
            case ModalState.Confirm:
                this.onCloseModal();
                break;
            default:
                break;
        }
    }

    private onOpenModal(e: FormEvent) {
        e.preventDefault();

        this.setState(prev => {
            return {
                ...prev,
                modalState: ModalState.Confirm,
            };
        });
    }

    private onCloseModal() {
        this.setState(prev => {
            return {
                ...prev,
                modalState: ModalState.Close,
            };
        });
    }

    private onDelete(e: FormEvent) {
        e.preventDefault();

        this.setState(prev => {
            return {
                ...prev,
                modalState: ModalState.Deleting,
            };
        });

        this.delete()
            .then(() => {
                if (this.unmounted) return;

                this.setState(prev => {
                    return {
                        ...prev,
                        modalState: ModalState.Result,
                    };
                });
            })
            .catch(() => {
                if (this.unmounted) return;

                this.setState(prev => {
                    return {
                        ...prev,
                        modalState: ModalState.Error,
                    };
                });
            });
    }

    private onExit() {
        // 自分の投稿一覧ページに遷移する。
        this.props.history.push('/list?a=mine');
    }

    private async delete() {
        if (!this.state.isMine || this.state.pic === undefined) return;

        const form = new FormData();
        form.append('id', this.state.pic.id);
        form.append('signature', localStorage.getItem('signature') || '');
        const res = await fetch('/api/delete', { method: 'POST', body: form });
        if (!res.ok) {
            throw new Error('http error.');
        }
    }

    private async checkIsMine() {
        const author = localStorage.getItem('author');
        if (author === null) return;

        const buffer = new Uint8Array(author.length);
        for (let i = 0; i < author.length; i++) {
            // authorはascii文字列なので必ず1文字1byte
            buffer[i] = author.charCodeAt(i);
        }

        const result = await crypto.subtle.digest('SHA-256', buffer);
        if (this.unmounted) return;
        const hexStr = new Uint8Array(result).reduce((a, b) => {
            const s = b.toString(16);
            return a + ((s.length === 1) ? ('0' + s) : s);
        }, "").toLowerCase();
        console.log(hexStr);

        this.setState(prev => {
            return {
                ...prev,
                isMine: prev.authorHash.toLowerCase() === hexStr,
            };
        });
    }

    private nameToURL(name: string) {
        return `https://storage.googleapis.com/yamatoiori-kawaii-oekaki.appspot.com/${name}`;
    }

    componentWillUnmount() {
        this.unmounted = true;
    }
}