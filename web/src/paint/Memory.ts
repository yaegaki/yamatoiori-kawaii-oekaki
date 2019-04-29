export function memcopy(dst: Uint8Array, dstOffset: number, src: Uint8Array, srcOffset: number, count: number) {
    if (dst === src && dstOffset === srcOffset) return;

    for (let i = 0; i < count; i++) {
        dst[dstOffset++] = src[srcOffset++];
    }
}

export type MemorySpan = {
    memory: Uint8Array;
    // 最初の要素のオフセット
    offset: number;
    // バイト数
    length: number;
}

export function newMemorySpan(memory: Uint8Array, offset: number, length: number) {
    return { memory, offset, length };
}

export function getU8(span: MemorySpan, index: number) {
    return span.memory[span.offset + index];
}

export type MemoryRect = {
    memory: Uint8Array;
    // 最初の要素のオフセット
    offset: number;
    // 次の行までに必要なバイト数
    // (offset+strideで次の行のオフセットになる)
    stride: number;

    // 横(バイト数)
    width: number;
    // 縦
    height: number;
}

export function newMemoryRect(memory: Uint8Array, offset: number, stride: number, width: number, height: number): MemoryRect {
    return { memory, offset, stride, width, height };
}
