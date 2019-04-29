import { Color, Colors } from "./Color";
import { memcopy } from "./Memory";

export enum BlendMode {
    AlphaBlend,
    Erase,
    Mask,
    DirectBase,
    DirectTop,
}

export function colorBlend(mode: BlendMode, baseColor: Color, topColor: Color): Color {
    switch (mode) {
        case BlendMode.AlphaBlend:
            return alphaBlend(baseColor, topColor);
        case BlendMode.Erase:
            if (topColor.a > 0) {
                const nextA = baseColor.a - topColor.a;
                if (nextA <= 0) {
                    return Colors.Transparent;
                }

                return new Color(baseColor.r, baseColor.g, baseColor.b, nextA);
            }
            return baseColor;
        case BlendMode.Mask:
            if (baseColor.a > 0) return alphaBlend(baseColor, topColor);
            return Colors.Transparent;
        case BlendMode.DirectBase:
            return topColor;
        case BlendMode.DirectTop:
            return baseColor;
        default:
            return alphaBlend(baseColor, topColor);
    }
}

export function alphaBlend(baseColor: Color, topColor: Color) {
    const d = (1 - topColor.a) * baseColor.a;
    const ar = topColor.a + d;

    if (ar == 0) {
        return new Color(baseColor.r, baseColor.g, baseColor.b, 0);
    }

    const r = (topColor.r * topColor.a + baseColor.r * d) / ar;
    const g = (topColor.g * topColor.a + baseColor.g * d) / ar;
    const b = (topColor.b * topColor.a + baseColor.b * d) / ar;
    const a = ar;

    return new Color(r, g, b, a);
}

export type RawColorBlendFunc = (result: Uint8Array, resultOffset: number, base: Uint8Array, baseOffset: number, top: Uint8Array, topOffset: number) => void;

export function getRawColorBlendFunc(mode: BlendMode): RawColorBlendFunc {
    switch (mode) {
        case BlendMode.AlphaBlend:
            return rawAlphaBlend;
        case BlendMode.Erase:
            return (result: Uint8Array, resultOffset: number, base: Uint8Array, baseOffset: number, top: Uint8Array, topOffset: number) => {
                if (top[topOffset+3] > 0) {
                    const nextA = base[baseOffset+3] - top[topOffset+3];
                    if (nextA <= 0) {
                        Colors.Transparent.getRawColor(result, resultOffset);
                    }
                    else {
                        memcopy(result, resultOffset, base, baseOffset, 3);
                        result[resultOffset+3] = nextA;
                    }
                }
                else {
                    memcopy(result, resultOffset, base, baseOffset, 4);
                }
            };
        case BlendMode.Mask:
            return (result: Uint8Array, resultOffset: number, base: Uint8Array, baseOffset: number, top: Uint8Array, topOffset: number) => {
                if (base[baseOffset+3] > 0) rawAlphaBlend(result, resultOffset, base, baseOffset, top, topOffset);
                else Colors.Transparent.getRawColor(result, resultOffset);
            };
        case BlendMode.DirectBase:
            return (result: Uint8Array, resultOffset: number, base: Uint8Array, baseOffset: number, top: Uint8Array, topOffset: number) => {
                memcopy(result, resultOffset, base, baseOffset, 4);
            };
        case BlendMode.DirectTop:
            return (result: Uint8Array, resultOffset: number, base: Uint8Array, baseOffset: number, top: Uint8Array, topOffset: number) => {
                memcopy(result, resultOffset, top, topOffset, 4);
            };
        default:
            return rawAlphaBlend;
    }
}

export function rawColorBlend(mode: BlendMode, result: Uint8Array, resultOffset: number, base: Uint8Array, baseOffset: number, top: Uint8Array, topOffset: number) {
    getRawColorBlendFunc(mode)(result, resultOffset, base, baseOffset, top, topOffset);
}

export function rawAlphaBlend(result: Uint8Array, resultOffset: number, base: Uint8Array, baseOffset: number, top: Uint8Array, topOffset: number) {
    const topA = top[topOffset+3];
    if (topA === 0) {
        memcopy(result, resultOffset, base, baseOffset, 4);
        return;
    }

    const baseA = base[baseOffset+3];
    if (baseA === 0) {
        memcopy(result, resultOffset, top, topOffset, 4);
        return;
    }

    const topR = top[topOffset];
    const topG = top[topOffset+1];
    const topB = top[topOffset+2];

    const baseR = base[baseOffset];
    const baseG = base[baseOffset+1];
    const baseB = base[baseOffset+2];

    const d = (1 - topA / 255) * baseA;
    const ar = topA + d;

    result[resultOffset] = (topR * topA + baseR * d) / ar;
    result[resultOffset+1] = (topG * topA + baseG * d) / ar;
    result[resultOffset+2] = (topB * topA + baseB * d) / ar;
    result[resultOffset+3] = ar;
}