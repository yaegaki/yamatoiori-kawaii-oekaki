import { RendererBase, RenderParameter } from "./Renderer";
import { Size, Rect } from "../Common";
import { ILayer } from "../Layers/Layer";
import { VertexShaderSource, FragmentShaderSource, VertexShaderPositionAttrib, VertexShaderTexCoordAttrib, VertexShaderMVPMatrixUni, FragmentShaderTexUni } from "./GPURendererShader";
import { Colors, Color } from "../Color";
import { memcopy } from "../Memory";

export class GPURenderer extends RendererBase {
    static createGPURenderer(size: Size, gl: WebGLRenderingContext, background: Color = Colors.Gray): GPURenderer | null {
        const disposables: (() => void)[] = [];
        const dispose = () => {
            for (let i = disposables.length - 1; i >= 0; i--) {
                disposables[i]();
            }
            disposables.length = 0;
        };

        const program = GPURenderer.createProgram(gl);
        if (program === null) return null;
        disposables.push(() => gl.deleteProgram(program));

        const vertexPositionBuffer = gl.createBuffer();
        const vertexTexCoordBuffer = gl.createBuffer();
        const indexBuffer = gl.createBuffer();
        disposables.push(() => {
            gl.deleteBuffer(vertexPositionBuffer);
            gl.deleteBuffer(vertexTexCoordBuffer);
            gl.deleteBuffer(indexBuffer);
        });

        if (vertexPositionBuffer === null || vertexTexCoordBuffer === null || indexBuffer === null) {
            dispose();
            return null;
        }


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
            dispose();
            return null;
        }

        if (texUniLoc === null) {
            console.warn('invalid fragment shader.');
            dispose();
            return null;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
        gl.enableVertexAttribArray(posAttribLoc);
        gl.vertexAttribPointer(posAttribLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);
        gl.enableVertexAttribArray(texCoordAttribLoc);
        gl.vertexAttribPointer(texCoordAttribLoc, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        gl.uniform1i(texUniLoc, 0);

        const texture = GPURenderer.createTexture(gl);
        disposables.push(() => {
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.deleteTexture(texture);
        });

        if (texture === null) {
            dispose();
            return null;
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(texUniLoc, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        const bg = background;
        gl.clearColor(bg.r, bg.g, bg.b, bg.a);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.flush();

        const matrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);

        return new GPURenderer(size, gl, program, texture, matrixUniLoc, matrix, bg);
    }

    private buffer: Uint8Array;
    private isTextureCreated: boolean = false; 
    private isDirtyViewport: boolean = false;

    constructor(size: Size,
        private gl: WebGLRenderingContext,
        private program: WebGLProgram,
        private texture: WebGLTexture,
        private matrixUniLoc: WebGLUniformLocation,
        private matrix: Float32Array,
        background: Color) {
        super(size, background);
        this.buffer = new Uint8Array(size.width * size.height * 4);
    }

    protected onSizeChange() {
        this.gl.canvas.width = this.size.width;
        this.gl.canvas.height = this.size.height;
        this.gl.viewport(0, 0, this.size.width, this.size.height);
        // viewportが変わるとmatrixの再計算が必要なのでチェックする
        this.isDirtyViewport = true;
    }

    protected onBackgroundChange() {
    }

    protected renderCore(prevParam: RenderParameter, param: RenderParameter, isParamChanged: boolean, layer: ILayer, layerRenderRect: Rect): Rect {
        const gl = this.gl;

        const bg = this.background;
        gl.clearColor(bg.r, bg.g, bg.b, bg.a);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (!layerRenderRect.isEmpty()) {
            this.uploadLayerToGPU(this.gl, this.texture, layer, layerRenderRect);
        }

        if (isParamChanged || this.isDirtyViewport) {
            this.fillMatrixFromRenderParameter(layer.getSize(), param);
            gl.uniformMatrix4fv(this.matrixUniLoc, false, this.matrix);

            const layerSize = layer.getSize();
            layerRenderRect = new Rect(0, 0, layerSize.width, layerSize.height);
            this.isDirtyViewport = false;
        }

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        gl.flush();

        // GPUの場合は画面全体を再描画しているけどCPURendererに合わせて変わったと思われる部分を返す
        return layerRenderRect.transform(param.scale, param.offset).align();
    }

    invalidate(param: RenderParameter, layer: ILayer) {
        const layerSize = layer.getSize();
        this.renderCore(param, param, true, layer, new Rect(0, 0, layerSize.width, layerSize.height));
    }

    private static createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
        const vertexShader = GPURenderer.createShader(gl, gl.VERTEX_SHADER, VertexShaderSource);
        const fragmentShader = GPURenderer.createShader(gl, gl.FRAGMENT_SHADER, FragmentShaderSource);

        if (vertexShader === null || fragmentShader === null) {
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return null;
        }

        const program = gl.createProgram();
        if (program === null) {
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            console.warn('can not create program.');
            return null;
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.useProgram(program);

            // useProgramした時点でshaderは不要
            gl.detachShader(program, vertexShader);
            gl.detachShader(program, fragmentShader);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);

            return program;
        }
        else {
            const log = gl.getProgramInfoLog(program);
            console.warn(`can not link program.`);
            console.warn(log);
            gl.detachShader(program, vertexShader);
            gl.detachShader(program, fragmentShader);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            gl.deleteProgram(program);
            return null;
        }
    }

    private static createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
        const shader = gl.createShader(type);
        if (shader === null) {
            console.warn(`can not create shader type : ${type}`);
            return false;
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        }
        else {
            const log = gl.getShaderInfoLog(shader);
            console.warn(`can not compile shader type : ${type}`);
            console.warn(log);
            gl.deleteShader(shader);
            return null;
        }
    }

    private static createTexture(gl: WebGLRenderingContext): WebGLTexture | null {
        const texture = gl.createTexture();
        if (texture === null) {
            console.log('can not create shader.');
            return null;
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        // どんなサイズのテクスチャでも扱えるようにする設定
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        return texture;
    }

    private fillMatrixFromRenderParameter(layerSize: Size, param: RenderParameter) {
        const { width: vWidth, height: vHeight } = this.size;
        const { width: lWidth, height: lHeight } = layerSize;

        // viewは左上が(-1, 1) 右下が(1, -1)

        // このスケールにするとViewとLayerのピクセルサイズが一致する
        const baseScaleX = lWidth / vWidth;
        const basescaleY = lHeight / vHeight;

        const scaleX = baseScaleX * param.scale;
        const scaleY = basescaleY * param.scale;


        this.matrix[0] = scaleX;
        this.matrix[5] = scaleY;


        this.matrix[12] = param.offset.x / vWidth * 2;
        this.matrix[13] = param.offset.y / vHeight * 2;
    }

    private uploadLayerToGPU(gl: WebGLRenderingContext, texture: WebGLTexture, layer: ILayer, uploadRect: Rect) {
        // TODO: レイヤのサイズが変わっていた場合の処理
        const layerSize = layer.getSize();
        if (this.isTextureCreated) {
            const memoryRect = layer.getRawColorsReadOnlyRef(uploadRect)!;
            let offset = 0;
            const stride = memoryRect.width;
            const totalSize = stride * memoryRect.height;
            if (this.buffer.length < totalSize) {
                this.buffer = new Uint8Array(totalSize);
            }
            for (let i = 0; i < memoryRect.height; i++) {
                memcopy(this.buffer, offset, memoryRect.memory, memoryRect.offset + i * memoryRect.stride, stride);
                offset += stride;
            }

            gl.texSubImage2D(gl.TEXTURE_2D, 0, uploadRect.x, uploadRect.y, uploadRect.width, uploadRect.height, gl.RGBA, gl.UNSIGNED_BYTE, this.buffer);
        }
        else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, layerSize.width, layerSize.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, layer.getRawColorsReadOnlyRef(uploadRect)!.memory);
            this.isTextureCreated = true;
        }
    }
}