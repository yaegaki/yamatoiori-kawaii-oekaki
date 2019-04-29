import { ICanvasView } from "./CanvasView";
import { Canvas } from "./Canvas";
import { Offset, Size, Rect } from "./Common";
import { UndoManager } from "./UndoManager";
import { IPaintToolProvider } from "./Tool";
import { ScaleOption } from "./LayerTransform";
import { Colors } from "./Color";
import { VertexShader, FragmentShader, VertexShaderPositionAttrib, FragmentShaderTexUni, VertexShaderMVPMatrixUni, VertexShaderTexCoordAttrib } from "./GPUCanvasViewShader";
import { RGBA8Layer } from "./Layers/RGBA8Layer";
import { drawLine, drawPoint } from "./Painting";
import { RenderParameter, cloneRenderParameter, DefaultRenderParameter } from "./Renderers/Renderer";

export class GPUCanvasView {
    private size: Size;
    private renderParameter: RenderParameter = cloneRenderParameter(DefaultRenderParameter);
    private _isValid: boolean = false;
    private disposables: (() => void)[] = [];

    private program?: WebGLProgram;
    private texture?: WebGLTexture;
    private matrixUniLoc: WebGLUniformLocation = 0;
    private matrix: Float32Array = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ]);

    constructor(private gl: WebGLRenderingContext, private canvas: Canvas, private undoManager?: UndoManager, private paintToolProvider?: IPaintToolProvider) {
        this.size = { width: gl.canvas.width, height: gl.canvas.height };

        const program = this.createProgram();
        if (program === null) return;
        this.disposables.push(() => gl.deleteProgram(program));

        const vertexPositionBuffer = gl.createBuffer();
        const vertexTexCoordBuffer = gl.createBuffer();
        const indexBuffer = gl.createBuffer();
        if (vertexPositionBuffer === null || vertexTexCoordBuffer === null || indexBuffer === null) {
            gl.deleteBuffer(vertexPositionBuffer);
            gl.deleteBuffer(vertexTexCoordBuffer);
            gl.deleteBuffer(indexBuffer);
            return;
        }

        this.disposables.push(() => {
            console.log('disposed');
            gl.deleteBuffer(vertexPositionBuffer);
            gl.deleteBuffer(vertexTexCoordBuffer);
            gl.deleteBuffer(indexBuffer);
        });

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
        // 画面全体にポリゴンを置く
        const positions = [
            -1.0, 1.0, 0.0,
            -1.0, -1.0, 0.0,
            1.0, 1.0, 0.0,
            1.0, -1.0, 0.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);
        const texCoord = [
            0, 0,
            0, 1,
            1, 0,
            1, 1,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        const triangleIndex = [
            0, 1, 2,
            1, 2, 3,
        ];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(triangleIndex), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        const posAttribLoc = gl.getAttribLocation(program, VertexShaderPositionAttrib);
        const texCoordAttribLoc = gl.getAttribLocation(program, VertexShaderTexCoordAttrib);
        const matrixUniLoc = gl.getUniformLocation(program, VertexShaderMVPMatrixUni);
        const texUniLoc = gl.getUniformLocation(program, FragmentShaderTexUni);

        if (posAttribLoc === null || texCoordAttribLoc === null || matrixUniLoc === null) {
            console.warn('invalid vertex shader.');
            return;
        }

        if (texUniLoc === null) {
            console.warn('invalid fragment shader.');
            return;
        }

        this.matrixUniLoc = matrixUniLoc;

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
        gl.enableVertexAttribArray(posAttribLoc);
        gl.vertexAttribPointer(posAttribLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);
        gl.enableVertexAttribArray(texCoordAttribLoc);
        gl.vertexAttribPointer(texCoordAttribLoc, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.fillMatrixFromRenderParameter();
        gl.uniform1i(texUniLoc, 0);

        const texture = this.createTexture();
        if (texture === null) return;
        this.disposables.push(() => {
            // textureは1枚しか使わないので最後にunbind
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.deleteTexture(texture);
        });
        this.texture = texture;

        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(texUniLoc, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        this.disposables.push(() => {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            gl.bindTexture(gl.TEXTURE_2D, null);
        });

        this.program = program;

        this.render();

        let isDrawing = false;
        let prev = { x: 0, y: 0};
        let lastT = 0;
        this.gl.canvas.addEventListener('pointerdown', e => {
            isDrawing = true;
            const x = e.offsetX - this.renderParameter.offset.x;
            const y = e.offsetY - this.renderParameter.offset.y;
            this.renderParameter.offset.x += x;
            this.renderParameter.offset.y += y;
            this.fillMatrixFromRenderParameter();
            this.render();
            // prev = { x, y };
            // drawPoint(this.canvas.getDrawingLayer(), x, y, 5, Colors.Black);
            // this.uploadCanvasToGPU(Rect.Empty);
            // this.render();
        });

        this.gl.canvas.addEventListener('pointermove', e => {
            if (!isDrawing) return;
            const x = e.offsetX - this.renderParameter.offset.x;
            const y = e.offsetY - this.renderParameter.offset.y;
            this.renderParameter.offset.x += x;
            this.renderParameter.offset.y += y;
            this.fillMatrixFromRenderParameter();
            this.render();
            // lastT = drawLine(this.canvas.getDrawingLayer(), prev.x, prev.y, x, y, 5, Colors.Black, lastT).lastT;
            // prev = {x,y};
            // this.uploadCanvasToGPU(Rect.Empty);
            // this.render();
        });

        this.gl.canvas.addEventListener('pointerup', e => {
            if (!isDrawing) return;
            isDrawing = false;
        });


        this._isValid = true;
    }

    private fillMatrixFromRenderParameter() {
        const { width: vWidth, height: vHeight } = this.size;
        const { width: cWidth, height: cHeight } = this.canvas.getSize();

        const canvasViewWidth = cWidth / vWidth * this.renderParameter.scale;
        const canvasViewHeight = cHeight / vHeight * this.renderParameter.scale;

        // canvasは左上が(0, 0) 右下が(width-1, height-1)
        // viewは左上が(-1,1) 右下が(1, -1)

        this.matrix[0] = canvasViewWidth;
        this.matrix[5] = canvasViewHeight;

        this.matrix[12] = -0.5 + ((this.renderParameter.offset.x / vWidth) - 0.5) * 2;
        this.matrix[13] = 0.5 - ((this.renderParameter.offset.y / vHeight) - 0.5) * 2;
    }

    private createShader(type: number, source: string): WebGLShader | null {
        const shader = this.gl.createShader(type);
        if (shader === null) {
            console.warn(`can not create shader type : ${type}`);
            return false;
        }

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            return shader;
        }
        else {
            const log = this.gl.getShaderInfoLog(shader);
            console.warn(`can not compile shader type : ${type}`);
            console.warn(log);
            this.gl.deleteShader(shader);
            return null;
        }
    }

    private createProgram(): WebGLProgram | null {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, VertexShader);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, FragmentShader);

        if (vertexShader === null || fragmentShader === null) {
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);
            return null;
        }

        const program = this.gl.createProgram();
        if (program === null) {
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);
            console.warn('can not create program.');
            return null;
        }

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            this.gl.useProgram(program);

            // useProgramした時点でshaderは不要
            this.gl.detachShader(program, vertexShader);
            this.gl.detachShader(program, fragmentShader);
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);

            return program;
        }
        else {
            const log = this.gl.getProgramInfoLog(program);
            console.warn(`can not link program.`);
            console.warn(log);
            this.gl.detachShader(program, vertexShader);
            this.gl.detachShader(program, fragmentShader);
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);
            this.gl.deleteProgram(program);
            return null;
        }
    }

    private createTexture(): WebGLTexture | null {
        const texture = this.gl.createTexture();
        if (texture === null) {
            console.log('can not create shader.');
            return null;
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        // どんなサイズのテクスチャでも扱えるようにする設定
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.uploadCanvasToGPU(Rect.Empty);

        return texture;
    }

    private uploadCanvasToGPU(rect: Rect) {
        // textureはbindされている前提
        const drawingLayer = this.canvas.getDrawingLayer();
        const { width, height } = drawingLayer.getSize();
        drawPoint(drawingLayer, width / 2, height / 2, 10, Colors.Black);
        drawPoint(drawingLayer, 0, 0, 10, Colors.Black);
        drawPoint(drawingLayer, width, 0, 10, Colors.Black);
        drawPoint(drawingLayer, 0, height, 10, Colors.Black);
        drawPoint(drawingLayer, width, height, 10, Colors.Black);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, drawingLayer.getRawColorsRef(new Rect(0,0,1,1))!.memory);
    }

    private render() {
        if (this.program === undefined) return;

        const gl = this.gl;
        const gray = Colors.Gray;

        gl.clearColor(gray.r, gray.g, gray.b, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniformMatrix4fv(this.matrixUniLoc, false, this.matrix);

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

        gl.flush();

    }

    isValid(): boolean {
        return this._isValid;
    }

    getCanvas(): Canvas {
        return this.canvas;
    }

    getOffset(): Offset {
        return this.renderParameter.offset;
    }

    setOffset(offset: Offset) {
        this.renderParameter.offset = offset;
    }

    getScale(): number {
        return this.renderParameter.scale;
    }

    setScale(scale: number) {
        this.renderParameter.scale = scale;
    }

    getSize(): Size {
        return this.size;
    }

    getScaleOption(): ScaleOption {
        return this.renderParameter.scaleOption;
    }

    setScaleOption(scaleOption: ScaleOption) {
        this.renderParameter.scaleOption = scaleOption;
    }

    canUndo(): boolean {
        if (this.undoManager === undefined) return false;
        return this.undoManager.canUndo();
    }

    undo() {
        if (this.undoManager === undefined) return false;
        const result = this.undoManager.undo();
        if (!result.dirtyRect.isEmpty()) {
            this.canvas.render(false, result.dirtyRect);
        }
    }

    canRedo(): boolean {
        if (this.undoManager === undefined) return false;
        return this.undoManager.canRedo();
    }

    redo() {
        if (this.undoManager === undefined) return false;
        const result = this.undoManager.redo();
        if (!result.dirtyRect.isEmpty()) {
            this.canvas.render(false, result.dirtyRect);
        }
    }

    invalidate(render?: boolean) {
        // TODO:
    }

    async toBlob(): Promise<Blob> {
        return new Blob();
    }

    dispose() {
        for (let i = this.disposables.length - 1; i >= 0; i--) {
            this.disposables[i]();
        }
        this.disposables.length = 0;
    }
}