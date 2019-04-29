import { MemorySpan, newMemorySpan, memcopy } from "./Memory";

type RingBufferHeader = {
    prev?: RingBufferHeader;
    next?: RingBufferHeader;
    span: MemorySpan;
}

export class RingBuffer {
    buffer: Uint8Array;
    private top?: RingBufferHeader;
    private bottom?: RingBufferHeader;

    constructor(private size: number) {
        this.buffer = new Uint8Array(size);
    }

    getRemain(): number {
        if (this.top === undefined || this.bottom === undefined) return this.buffer.length;
        else {
            const nextOffset = this.bottom.span.offset + this.bottom.span.length;
            if (this.top.span.offset > this.bottom.span.offset) {
                return this.top.span.offset - nextOffset;
            }
            else {
                // bottomから終わりまでの容量
                const toEnd = this.buffer.length - nextOffset;
                // 最初からtopまでの容量
                const toTop = this.top.span.offset;
                // 大きいほうを返す
                return Math.max(toEnd, toTop);
            }
        }
    }

    retain(size: number): MemorySpan | null {
        const remain = this.getRemain();
        if (remain < size) return null;

        if (this.top === undefined || this.bottom === undefined) {
            this.bottom = { span: newMemorySpan(this.buffer, 0, size) };
            this.top = this.bottom;
        }
        else {
            let nextOffset = this.bottom.span.offset + this.bottom.span.length;
            const prevBottom = this.bottom;
            if (this.top.span.offset <= this.bottom.span.offset) {
                if (this.buffer.length - nextOffset < size) nextOffset = 0;
            }
            this.bottom = { prev: prevBottom, span: newMemorySpan(this.buffer, nextOffset, size) };
            prevBottom.next = this.bottom;
        }

        return this.bottom.span;
    }

    push(srcMemory: MemorySpan): boolean {
        const span = this.retain(srcMemory.length);
        if (span === null) return false;

        memcopy(span.memory, span.offset, srcMemory.memory, srcMemory.offset, srcMemory.length);
        return true;
    }

    // 次に要素を追加するまで有効なMemorySpanを返す
    // 後ろ側から取得する
    pop(): MemorySpan | null {
        if (this.bottom === undefined) return null;

        const result = this.bottom.span;
        this.bottom = this.bottom.prev;
        if (this.bottom === undefined) {
            this.top = undefined;
        }
        else {
            this.bottom.next = undefined;
        }

        return result;
    }

    // 次に要素を追加するまで有効なMemorySpanを返す
    // 前側から取得する
    shift(): MemorySpan | null {
        if (this.top === undefined) return null;

        const result = this.top.span;
        this.top = this.top.next;
        if (this.top === undefined) {
            this.bottom = undefined;
        }
        else {
            this.top.prev = undefined;
        }

        return result;
    }

    count(): number {
        let c = 0;
        let _top = this.top;
        while (_top !== undefined) {
            _top = _top.next;
            c++;
        }
        return c;
    }
}
