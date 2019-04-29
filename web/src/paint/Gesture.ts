import { Vec2 } from "./Common";

export type Touch = {
    id: number;
    position: Vec2;
}

export type OnOneFingerGestureEventHandler = (touch: Touch) => void;
export type OnTwoFingerGestureEventHandler = (first: Touch, second: Touch) => void;

const emptyHandler = () => {};

type OneFingerGestureContext = {
    touch: Touch;
}

type TwoFingerGestureContext = {
    first: Touch;
    second: Touch;
}


export class GestureRecognizser {
    private oneFingerGestureContext: OneFingerGestureContext | null = null;
    private twoFingerGestureContext: TwoFingerGestureContext | null = null;

    private _onOneFingerGestureStart: OnOneFingerGestureEventHandler = emptyHandler;
    private _onOneFingerGestureMove: OnOneFingerGestureEventHandler = emptyHandler;
    private _onOneFingerGestureEnd: OnOneFingerGestureEventHandler = emptyHandler;
    private _onOneFingerGestureCancel: OnOneFingerGestureEventHandler = emptyHandler;

    private _onTwoFingerGesutureStart: OnTwoFingerGestureEventHandler = emptyHandler;
    private _onTwoFingerGesutureMove: OnTwoFingerGestureEventHandler = emptyHandler;
    private _onTwoFingerGesutureEnd: OnTwoFingerGestureEventHandler = emptyHandler;
    private _onTwoFingerGesutureCancel: OnTwoFingerGestureEventHandler = emptyHandler;

    constructor(private elem: HTMLElement) {
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
        this.onTouchCancel = this.onTouchCancel.bind(this);
        this.elem.addEventListener('touchstart', this.onTouchStart);
        this.elem.addEventListener('touchmove', this.onTouchMove);
        this.elem.addEventListener('touchend', this.onTouchEnd);
        this.elem.addEventListener('touchcancel', this.onTouchCancel);
    }

    onOneFingerGestureStart(h: OnOneFingerGestureEventHandler) {
        this._onOneFingerGestureStart = h;
    }
    onOneFingerGestureMove(h: OnOneFingerGestureEventHandler) {
        this._onOneFingerGestureMove = h;
    }
    onOneFingerGestureEnd(h: OnOneFingerGestureEventHandler) {
        this._onOneFingerGestureEnd = h;
    }
    onOneFingerGestureCancel(h: OnOneFingerGestureEventHandler) {
        this._onOneFingerGestureCancel = h;
    }

    onTwoFingerGesutureStart(h: OnTwoFingerGestureEventHandler) {
        this._onTwoFingerGesutureStart = h;
    }
    onTwoFingerGesutureMove(h: OnTwoFingerGestureEventHandler) {
        this._onTwoFingerGesutureMove = h;
    }
    onTwoFingerGesutureEnd(h: OnTwoFingerGestureEventHandler) {
        this._onTwoFingerGesutureEnd = h;
    }
    onTwoFingerGesutureCancel(h: OnTwoFingerGestureEventHandler) {
        this._onTwoFingerGesutureCancel = h;
    }



    private onTouchStart (e: TouchEvent) {
        if (!e.cancelable) return;
        e.preventDefault();

        if (this.oneFingerGestureContext !== null) {
            let found = false;
            for (let t of e.touches) {
                if (t.identifier === this.oneFingerGestureContext.touch.id) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                this._onOneFingerGestureCancel(this.oneFingerGestureContext.touch);
                this.oneFingerGestureContext = null;
            }
        }
        else if (this.twoFingerGestureContext !== null) {
            let count = 0;
            for (let t of e.touches) {
                if (t.identifier === this.twoFingerGestureContext.first.id || t.identifier === this.twoFingerGestureContext.second.id) {
                    count++;
                }
            }

            if (count !== 2) {
                this._onTwoFingerGesutureCancel(this.twoFingerGestureContext.first, this.twoFingerGestureContext.second);
                this.twoFingerGestureContext = null;
            }
        }

        const b = this.elem.getBoundingClientRect();
        if (e.touches.length === 1) {
            const t = e.touches[0];
            const pos = {
                x: t.clientX - b.left,
                y: t.clientY - b.top,
            };
            this.oneFingerGestureContext = { touch: { id: t.identifier, position: pos } };
            this._onOneFingerGestureStart(this.oneFingerGestureContext.touch);
        }
        else if (this.twoFingerGestureContext === null) {
            if (this.oneFingerGestureContext !== null) {
                this._onOneFingerGestureCancel(this.oneFingerGestureContext.touch);
                this.oneFingerGestureContext = null;
            }

            let t = e.touches[0];
            let pos = {
                x: t.clientX - b.left,
                y: t.clientY - b.top,
            };
            const first = { id: t.identifier, position: pos };
            t = e.touches[1];
            pos = {
                x: t.clientX - b.left,
                y: t.clientY - b.top,
            };
            const second = { id: t.identifier, position: pos };
            this.twoFingerGestureContext = { first, second };
            this._onTwoFingerGesutureStart(this.twoFingerGestureContext.first, this.twoFingerGestureContext.second);
        }
    }

    private onTouchMove (e: TouchEvent) {
        if (!e.cancelable) return;
        e.preventDefault();

        let moved = false;
        const b = this.elem.getBoundingClientRect();
        for (let t of e.changedTouches) {
            const pos = {
                x: t.clientX - b.left,
                y: t.clientY - b.top,
            };

            if (this.oneFingerGestureContext !== null) {
                if (t.identifier === this.oneFingerGestureContext.touch.id) {
                    moved = true;
                    this.oneFingerGestureContext.touch.position = pos;
                    break;
                }
            }
            else if (this.twoFingerGestureContext !== null) {
                if (t.identifier === this.twoFingerGestureContext.first.id || t.identifier === this.twoFingerGestureContext.second.id) {
                    const touch = t.identifier === this.twoFingerGestureContext.first.id ? this.twoFingerGestureContext.first : this.twoFingerGestureContext.second;
                    moved = true;
                    touch.position = pos;
                }
            }
        }

        if (!moved) return;

        if (this.oneFingerGestureContext !== null) {
            this._onOneFingerGestureMove(this.oneFingerGestureContext.touch);
        }
        else if (this.twoFingerGestureContext !== null) {
            this._onTwoFingerGesutureMove(this.twoFingerGestureContext.first, this.twoFingerGestureContext.second);
        }
    }

    private onTouchEnd (e: TouchEvent) {
        if (e.cancelable) e.preventDefault();

        if (this.oneFingerGestureContext !== null) {
            let found = false;
            for (let t of e.touches) {
                if (t.identifier === this.oneFingerGestureContext.touch.id) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                this._onOneFingerGestureEnd(this.oneFingerGestureContext.touch);
                this.oneFingerGestureContext = null;
            }
        }
        else if (this.twoFingerGestureContext !== null) {
            let count = 0;
            for (let t of e.touches) {
                if (t.identifier === this.twoFingerGestureContext.first.id || t.identifier === this.twoFingerGestureContext.second.id) {
                    count++;
                }
            }

            if (count !== 2) {
                this._onTwoFingerGesutureEnd(this.twoFingerGestureContext.first, this.twoFingerGestureContext.second);
                this.twoFingerGestureContext = null;
            }
        }
    }

    private onTouchCancel (e: TouchEvent) {
        if (e.cancelable) e.preventDefault();

        if (this.oneFingerGestureContext !== null) {
            let found = false;
            for (let t of e.touches) {
                if (t.identifier === this.oneFingerGestureContext.touch.id) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                this._onOneFingerGestureCancel(this.oneFingerGestureContext.touch);
                this.oneFingerGestureContext = null;
            }
        }
        else if (this.twoFingerGestureContext !== null) {
            let count = 0;
            for (let t of e.touches) {
                if (t.identifier === this.twoFingerGestureContext.first.id || t.identifier === this.twoFingerGestureContext.second.id) {
                    count++;
                }
            }

            if (count !== 2) {
                this._onTwoFingerGesutureCancel(this.twoFingerGestureContext.first, this.twoFingerGestureContext.second);
                this.twoFingerGestureContext = null;
            }
        }
    }


    dispose () {
        this.elem.removeEventListener('touchstart', this.onTouchStart);
        this.elem.removeEventListener('touchmove', this.onTouchMove);
        this.elem.removeEventListener('touchend', this.onTouchEnd);
        this.elem.removeEventListener('touchcancel', this.onTouchCancel);
    }
}