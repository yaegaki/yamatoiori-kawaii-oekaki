export type Size = {
    width: number;
    height: number;
}

export type Vec2 = {
    x: number;
    y: number;
}

export type Position = Vec2;
export type Offset = Vec2;

export function addVec2(v1: Vec2, v2: Vec2): Vec2 {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
}

export function subVec2(v1: Vec2, v2: Vec2): Vec2 {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
}

export function mulVec2(v: Vec2, n: number): Vec2 {
    return { x: v.x * n, y: v.y * n };
}

export function divVec2(v: Vec2, n: number): Vec2 {
    return { x: v.x / n, y: v.y / n };
}

export function inverseYVec2(v: Vec2): Vec2 {
    return { x: v.x, y: -v.y };
}

export function sizeToVec2(s: Size): Vec2 {
    return { x: s.width, y: s.height };
}

export function vec2ToSize(v: Vec2): Size {
    return { width: v.x, height: v.y };
}

export function getMiddlePoint(v1: Vec2, v2: Vec2) {
    return addVec2(v1, divVec2(subVec2(v2, v1), 2));
}

export function getLength(v: Vec2) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}


export class Rect {
    private _offset: Offset;
    private _size: Size;
    private _right: number;
    private _bottom: number;

    static readonly Empty: Rect = new Rect(0, 0, 0, 0);

    get x(): number {
        return this.offset.x;
    }

    get y(): number {
        return this.offset.y;
    }

    get width(): number {
        return this.size.width;
    }

    get height(): number {
        return this.size.height;
    }

    get offset(): Offset {
        return this._offset;
    }

    get size(): Size {
        return this._size;
    }

    get right(): number {
        return this._right;
    }

    get bottom(): number {
        return this._bottom;
    }

    constructor(x: number, y: number, width: number, height: number) {
        this._offset = { x, y };
        this._size = { width, height };
        this._right = x + width;
        this._bottom = y + height;
    }

    isEmpty(): boolean {
        return this.width == 0 || this.height == 0;
    }

    intersect(other: Rect) {
        const f = (r: Rect) => { return { left: r.x, top: r.y, right: r.x + r.size.width, bottom: r.y + r.size.height } };

        const _a = f(this);
        const _b = f(other);
        if (_a.right < _b.left ||
            _a.left > _b.right ||
            _a.bottom < _b.top ||
            _a.top > _b.bottom) {
            return Rect.Empty;
        }

        const x = Math.max(_a.left, _b.left);
        const y = Math.max(_a.top, _b.top);
        const size = {
            width: Math.min(_a.right, _b.right) - x,
            height: Math.min(_a.bottom, _b.bottom) - y,
        };

        return new Rect(x, y, size.width, size.height);
    }

    merge(other: Rect) {
        if (this.isEmpty()) return other;
        if (other.isEmpty()) return this;

        const f = (r: Rect) => { return { left: r.x, top: r.y, right: r.x + r.size.width, bottom: r.y + r.size.height } };

        const _a = f(this);
        const _b = f(other);

        const x = Math.min(_a.left, _b.left);
        const y = Math.min(_a.top, _b.top);
        const size = {
            width: Math.max(_a.right, _b.right) - x,
            height: Math.max(_a.bottom, _b.bottom) - y,
        };

        return new Rect(x, y, size.width, size.height);
    }


    // Rectにスケールをかけてから移動させたRectを返す
    transform(scale: number, offset: Offset): Rect {
        const x = this.x * scale + offset.x;
        const y = this.y * scale + offset.y;

        const width = this.width * scale;
        const height = this.height * scale;
        return new Rect(x, y, width, height);
    }

    // Rectを包み込める()サイズの整数でアラインされたRectを返す
    align(): Rect {
        const x = Math.floor(this.x);
        const y = Math.floor(this.y);

        const width = Math.ceil(this.right) - x;
        const height = Math.ceil(this.bottom) - y;
        return new Rect(x, y, width, height);
    }
}
