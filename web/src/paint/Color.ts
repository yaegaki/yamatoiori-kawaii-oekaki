// 色を表すクラス
// それぞれ0-1の値をとる
export class Color {
    private _r: number;
    private _g: number;
    private _b: number;
    private _a: number;

    get r(): number {
        return this._r;
    }

    get g(): number {
        return this._g;
    }

    get b(): number {
        return this._b;
    }

    get a(): number {
        return this._a;
    }

    constructor(r: number, g: number, b: number, a: number) {
        this._r = r;
        this._g = g;
        this._b = b;
        this._a = a;
    }

    getRawColor(dst: Uint8Array, dstOffset: number) {
        dst[dstOffset] = this._r * 255;
        dst[dstOffset+1] = this._g * 255;
        dst[dstOffset+2] = this._b * 255;
        dst[dstOffset+3] = this._a * 255;
    }

    static fromRawColor(src: Uint8Array, srcOffset: number) {
        return new Color(
            src[srcOffset] / 255,
            src[srcOffset+1] / 255,
            src[srcOffset+2] / 255,
            src[srcOffset+3] / 255
        );
    }
}

export class Colors {
    static readonly White: Color = new Color(1, 1, 1, 1);
    static readonly Black: Color = new Color(0, 0, 0, 1);
    static readonly Red: Color = new Color(1, 0, 0, 1);
    static readonly Green: Color = new Color(0, 1, 0, 1);
    static readonly Blue: Color = new Color(0, 0, 1, 1);

    static readonly Gray: Color = new Color(0.5, 0.5, 0.5, 1);
    static readonly Yellow: Color = new Color(1, 1, 0, 1);
    static readonly Purple: Color = new Color(1, 0, 1, 1);

    static readonly Transparent: Color = new Color(0, 0, 0, 0);
}
