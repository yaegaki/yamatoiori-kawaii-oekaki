import { IEditableLayer } from "./Layers/Layer";
import { Rect } from "./Common";
import { RingBuffer } from "./RingBuffer";
import { newMemoryRect, MemoryRect } from "./Memory";

type UndoHeader = {
    layer: IEditableLayer;
    rect: Rect;
    undoMemoryRect: MemoryRect;
    redoMemoryRect: MemoryRect;
    redoMemoryInitialized: boolean;
}

export class UndoManager {
    private ringBuffer: RingBuffer;
    private index: number = -1;
    private headers: UndoHeader[] = [];

    constructor(bufferSize: number, private entryMaxCount: number) {
        this.ringBuffer = new RingBuffer(bufferSize);
        this.entryMaxCount = Math.max(this.entryMaxCount, 1);
    }

    push(layer: IEditableLayer, rect: Rect): boolean {
        // redo領域を消す
        while (this.index + 1 < this.headers.length) {
            this.headers.pop();
            this.ringBuffer.pop();
        }

        const stride = rect.width * 4;
        // Redo分の領域もあらかじめ確保しておく
        // Redoしない場合は結構な無駄だけどRingBufferの仕様上同じ領域に格納できたほうが便利なので仕方なくやる
        const size = stride * rect.height * 2;

        // 多すぎる場合もしくは容量が足りない場合は前から消していく
        while (this.headers.length !== 0 && (this.headers.length >= this.entryMaxCount || size > this.ringBuffer.getRemain())) {
            this.headers.shift();
            this.ringBuffer.shift();
            this.index--;
        }

        const span = this.ringBuffer.retain(size);
        // そもそも容量がたりない
        if (span === null) return false;

        const undoMemoryRect = newMemoryRect(span.memory, span.offset, stride, stride, rect.height);
        const redoMemoryRect = newMemoryRect(span.memory, span.offset + stride * rect.height, stride, stride, rect.height);
        layer.getRawColors(rect, undoMemoryRect);
        this.headers.push({ layer, rect, undoMemoryRect: undoMemoryRect, redoMemoryRect: redoMemoryRect, redoMemoryInitialized: false });
        this.index++;
        return true;
    }

    canUndo() {
        return this.index >= 0 && this.headers.length > this.index;
    }

    undo(): { layer?: IEditableLayer, dirtyRect: Rect } {
        if (!this.canUndo()) return { dirtyRect: Rect.Empty };

        const header = this.headers[this.index];
        this.index--;

        if (!header.redoMemoryInitialized) {
            header.layer.getRawColors(header.rect, header.redoMemoryRect);
            header.redoMemoryInitialized = true;
        }

        header.layer.setRawColors(header.rect, header.undoMemoryRect);
        return { layer: header.layer, dirtyRect: header.rect };
    }

    canRedo() {
        return this.index + 1 < this.headers.length;
    }

    redo(): { layer?: IEditableLayer, dirtyRect: Rect } {
        if (!this.canRedo()) return { dirtyRect: Rect.Empty };

        const header = this.headers[this.index+1];
        this.index++;

        header.layer.setRawColors(header.rect, header.redoMemoryRect);
        return { layer: header.layer, dirtyRect: header.rect };
    }

    clear() {
        while (this.headers.length > 0) {
            this.headers.pop();
            this.ringBuffer.pop();
        }

        this.index = -1;
    }
}