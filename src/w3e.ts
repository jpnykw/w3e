interface W3EProps {
    width: number | null;
    height: number | null;
    vertex_shader: string;
    fragment_shader: string;
}

interface W3EMatrix {
    raw: any;
    model: number[];
    view: number[];
    projection: number[];
    mvp: number[];
}

interface W3EPolygon {
    attribute: string;
    vertex: number[];
    dimension: number;
}

class W3E {
    private _canvas: HTMLCanvasElement;
    private _gl: WebGLRenderingContext;
    private _program: WebGLProgram;
    private _matrix: W3EMatrix;
    private _polygon: { props: W3EPolygon[], positions: number[][] }[];

    constructor(props: W3EProps) {
        this._initialize(props);
    }

    private _initialize({ width, height, vertex_shader, fragment_shader }: Partial<W3EProps>) {
        // 行列の初期化
        const raw = new matIV();
        const model = raw.identity(raw.create());
        const view = raw.identity(raw.create());
        const projection = raw.identity(raw.create());
        const mvp = raw.identity(raw.create());
        this._matrix = { raw, model, view, projection, mvp };

        // 描画するオブジェクト系の初期化
        this._polygon = [];

        // canvas を作成
        this._canvas = document.createElement('canvas');
        if (width) this._canvas.width = width;
        if (height) this._canvas.height = height;

        // canvas から WebGL コンテキストの取得
        this._gl = this._canvas.getContext('webgl');
        if (!this._gl) {
            console.error('WebGL is not supported in your browser.');
            return;
        }

        // シェーダーのコンパイル
        this._program = this._create_program({
            vertex_shader: this._create_shader('vertex', vertex_shader),
            fragment_shader: this._create_shader('fragment', fragment_shader),
        });
    }

    private _create_shader(type, program) {       
        let shader = null;

        switch(type){
            case 'vertex': {
                shader = this._gl.createShader(this._gl.VERTEX_SHADER);
                break;
            }

            case 'fragment': {
                shader = this._gl.createShader(this._gl.FRAGMENT_SHADER);
                break;
            }

            default: {
                console.error(`Unknown shader type: ${type}`);
                return;
            }
        }

        this._gl.shaderSource(shader, program);
        this._gl.compileShader(shader);
        if (this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS)) return shader;
        console.error(this._gl.getShaderInfoLog(shader));
    }

    private _create_program({ vertex_shader, fragment_shader }) {
        const program = this._gl.createProgram();
        this._gl.attachShader(program, vertex_shader);
        this._gl.attachShader(program, fragment_shader);
        this._gl.linkProgram(program);

        if (this._gl.getProgramParameter(program, this._gl.LINK_STATUS)) {
            this._gl.useProgram(program);
            return program;
        }

        console.error(this._gl.getProgramInfoLog(program));
    }

    // 頂点バッファ(VBO)の生成と通知
    private _create_vbo(data: number[]) {
        var vbo = this._gl.createBuffer();
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vbo);
        this._gl.bufferData(this._gl.ARRAY_BUFFER, new Float32Array(data), this._gl.STATIC_DRAW);
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, null);
        return vbo;
    }

    // 任意のポリゴンを作成する独自関数
    public create_polygon(props: W3EPolygon[], positions: number[][]) {
        // オブジェクトを実際に追加するのは後で行うので一旦内部的に情報だけ格納する
        this._polygon.push({ props, positions });
    }

    public append(parent: Node) {
        parent.appendChild(this._canvas);
    }

    private _render_pipeline() {
        // 座標変換行列の生成と通知
        this._matrix.raw.lookAt([0.0, 0.0, 3.0], [0, 0, 0], [0, 1, 0], this._matrix.view);
        this._matrix.raw.perspective(90, this._canvas.width / this._canvas.height, 0.1, 100, this._matrix.projection);

        // オブジェクトを実際に追加するのは pipeline 内部で行う
        for (const { props, positions } of this._polygon) {
            for (const { attribute, vertex, dimension } of props) {
                const location = this._gl.getAttribLocation(this._program, attribute);
                const vbo = this._create_vbo(vertex);
                this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vbo);
                this._gl.enableVertexAttribArray(location);
                this._gl.vertexAttribPointer(location, dimension, this._gl.FLOAT, false, 0, 0);
            }

            const uniLocation = this._gl.getUniformLocation(this._program, 'mvpMatrix');
            const tmpMatrix = this._matrix.raw.identity(this._matrix.raw.create());
            this._matrix.raw.multiply(this._matrix.projection, this._matrix.view, tmpMatrix);
    
            for (const [index, [x, y, z]] of Object.entries(positions)) {
                // ２つ目以降のオブジェクトを描画する際には行列を初期化
                if (Number(index) > 0) this._matrix.raw.identity(this._matrix.model);
                // モデルを移動させるためのモデル座標変換行列
                this._matrix.raw.translate(this._matrix.model, [x, y, z], this._matrix.model);
                // model 変換, view 変換, projection 変換を行う
                this._matrix.raw.multiply(tmpMatrix, this._matrix.model, this._matrix.mvp);
                this._gl.uniformMatrix4fv(uniLocation, false, this._matrix.mvp);
                this._gl.drawArrays(this._gl.TRIANGLES, 0, 3);
            }
        }
    }

    public render() {
        this._gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this._gl.clearDepth(1.0);
        this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

        // レンダリング
        this._render_pipeline();
        this._gl.drawArrays(this._gl.TRIANGLES, 0, 3);
        this._gl.flush();
    }
}
