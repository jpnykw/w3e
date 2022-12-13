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
    inv: number[]; // 光源用
}

interface W3EPolygon {
    attribute: string;
    vertex: number[];
    dimension: number;
}

interface W3EPolygonProps {
    positions: number[][];
    rotate?: number[];
}

interface W3EStatus {
    tick: number;
}

interface W3ELight {
    parallel: number[];
}

class W3E {
    private _canvas: HTMLCanvasElement;
    private _gl: WebGLRenderingContext;
    private _program: WebGLProgram;
    private _matrix: W3EMatrix;
    private _polygon: ({props: W3EPolygon[]} & W3EPolygonProps)[];
    private _status: W3EStatus;
    private _index: number[];
    private _light: W3ELight;

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
        const inv = raw.identity(raw.create());
        this._matrix = { raw, model, view, projection, mvp, inv };

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

        this._index = [
            0, 1, 2,
            1, 2, 3,
        ];

        // 光源情報
        this._light = {
            parallel: [-0.5, 0.5, 0.5]
        }

        // 内部ステータスの初期化
        this._status = {
            tick: 0,
        };
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

    // 頂点バッファ(VBO)の生成
    private _create_vbo(data: number[]) {
        const vbo = this._gl.createBuffer();
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vbo);
        this._gl.bufferData(this._gl.ARRAY_BUFFER, new Float32Array(data), this._gl.STATIC_DRAW);
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, null);
        return vbo;
    }

    // インデックスバッファ(IBO)の生成
    private _create_ibo(data: number[]) {
        const ibo = this._gl.createBuffer();
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, ibo);
        this._gl.bufferData(this._gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), this._gl.STATIC_DRAW);
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, null);
        return ibo;
    }

    // 任意のポリゴンを作成する関数
    public create_polygon(props: W3EPolygon[], { positions = null, rotate = null }: Partial<W3EPolygonProps>) {
        // オブジェクトを実際に追加するのは後で行うので一旦内部的に情報だけ格納する
        this._polygon.push({ props, positions, rotate });
    }

    public create_plane(x: number, y: number, z: number, size: number) {
      this.create_polygon(
          [{
              attribute: 'position',
              dimension: 3, // (X,Y,Z)
              vertex: [
                x - size / 2, y - size / 2, z,
                x + size / 2, y - size / 2, z,
                x + size / 2, y + size / 2, z,
              ],
          },
          {
              attribute: 'color',
              dimension: 4, // (R,G,B,A)
              vertex: [
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
              ],
          }],
          {
              positions: [
                  [0.0, 0.0, 0.0],
              ],
          }
      );
      this.create_polygon(
          [{
              attribute: 'position',
              dimension: 3, // (X,Y,Z)
              vertex: [
                x + size / 2, y + size / 2, z,
                x - size / 2, y + size / 2, z,
                x - size / 2, y - size / 2, z,
              ],
          },
          {
              attribute: 'color',
              dimension: 4, // (R,G,B,A)
              vertex: [
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
              ],
          }],
          {
              positions: [
                  [0.0, 0.0, 0.0],
              ],
          }
      );
    }

    // トーラスを作成する関数
    public create_torus(row: number, column: number, irad: number, orad: number) {
        const [pos, nor, col, idx] = [[], [], [], []];

        for (let i = 0; i <= row; i++) {
            const r = Math.PI * 2 / row * i;
            const rr = Math.cos(r);
            const ry = Math.sin(r);

            for (let ii = 0; ii <= column; ii++) {
                const tr = Math.PI * 2 / column * ii;
                const tx = (rr * irad + orad) * Math.cos(tr);
                const ty = ry * irad;
                const tz = (rr * irad + orad) * Math.sin(tr);
                pos.push(tx, ty, tz);
                const rx = rr * Math.cos(tr);
                const rz = rr * Math.sin(tr);
                nor.push(rx, ry, rz);
                const tc = this._hsva(360 / column * ii, 1, 1, 1);
                col.push(tc[0], tc[1], tc[2], tc[3]);
            }
        }

        for (let i = 0; i < row; i++) {
            for (let ii = 0; ii < column; ii++) {
                const r = (column + 1) * i + ii;
                idx.push(r, r + column + 1, r + 1);
                idx.push(r + column + 1, r + column + 2, r + 1);
            }
        }

        this.create_polygon(
            [
                {
                    attribute: 'position',
                    dimension: 3,
                    vertex: pos,
                },
                {
                    attribute: 'normal',
                    dimension: 3,
                    vertex: nor,
                },
                {
                    attribute: 'color',
                    dimension: 4,
                    vertex: col,
                }
            ],
            {}
        );

        this._index = idx;
    }

    private _hsva(h, s, v, a) {
        if (s > 1 || v > 1 || a > 1) return;

        const th = h % 360;
        const i = Math.floor(th / 60);
        const f = th / 60 - i;
        const m = v * (1 - s);
        const n = v * (1 - s * f);
        const k = v * (1 - s * (1 - f));
        const color = [];

        if (!(s > 0) && !(s < 0)) {
            color.push(v, v, v, a); 
        } else {
            const r = [v, n, m, m, k, v];
            const g = [k, v, v, n, m, m];
            const b = [m, m, k, v, v, n];
            color.push(r[i], g[i], b[i], a);
        }

        return color;
    }

    // 要素を追加する関数
    public append(parent: Node) {
        parent.appendChild(this._canvas);
    }

    private _render_pipeline() {
        // 座標変換行列の生成と通知
        this._matrix.raw.lookAt([0.0, 0.0, 20.0], [0, 0, 0], [0, 1, 0], this._matrix.view);
        this._matrix.raw.perspective(45, this._canvas.width / this._canvas.height, 0.1, 100, this._matrix.projection);

        // カリングと深度テスト
        this._gl.enable(this._gl.DEPTH_TEST);
        this._gl.depthFunc(this._gl.LEQUAL);
        this._gl.enable(this._gl.CULL_FACE);

        // 頂点を使い回すために IBO を生成して設定する
        const ibo = this._create_ibo(this._index);
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, ibo);

        // オブジェクトを実際に追加するのは pipeline 内部で行う
        for (const { props, positions, rotate } of this._polygon) {
            for (const { attribute, vertex, dimension } of props) {
                const location = this._gl.getAttribLocation(this._program, attribute);
                const vbo = this._create_vbo(vertex);
                this._gl.bindBuffer(this._gl.ARRAY_BUFFER, vbo);
                this._gl.enableVertexAttribArray(location);
                this._gl.vertexAttribPointer(location, dimension, this._gl.FLOAT, false, 0, 0);
            }

            // uniform location
            const uniLocation = [
                this._gl.getUniformLocation(this._program, 'mvpMatrix'),
                this._gl.getUniformLocation(this._program, 'invMatrix'),
                this._gl.getUniformLocation(this._program, 'lightDirection'),
            ];

            const tmpMatrix = this._matrix.raw.identity(this._matrix.raw.create());
            this._matrix.raw.multiply(this._matrix.projection, this._matrix.view, tmpMatrix);

            // model, view, projection 変換と光源の計算
            const convert_and_attach = () => {
                this._matrix.raw.multiply(tmpMatrix, this._matrix.model, this._matrix.mvp);
                this._gl.uniformMatrix4fv(uniLocation[0], false, this._matrix.mvp);
                this._gl.uniformMatrix4fv(uniLocation[1], false, this._matrix.inv);
                this._gl.uniform3fv(uniLocation[2], this._light.parallel);
                this._gl.drawArrays(this._gl.TRIANGLES, 0, 3);
            }

            if (positions === null) {
                this._matrix.raw.identity(this._matrix.model);
                this._matrix.raw.translate(this._matrix.model, [0.0, 0.0, 0.0], this._matrix.model);

                // 回転
                this._matrix.raw.rotate(this._matrix.model, this._status.tick * Math.PI / 180, [0, 1, 1], this._matrix.model);

                convert_and_attach();
            } else {
                for (const [index, [x, y, z]] of Object.entries(positions)) {
                    // ２つ目以降のオブジェクトを描画する際には行列を初期化
                    if (Number(index) > 0) this._matrix.raw.identity(this._matrix.model);
    
                    // モデルを移動させるためのモデル座標変換行列
                    this._matrix.raw.translate(this._matrix.model, [x, y, z], this._matrix.model);

                    // モデルが固有のアニメーションを持つ場合はここで行列計算を行う
                    if (rotate) this._matrix.raw.rotate(this._matrix.model, this._status.tick * Math.PI / 180, rotate, this._matrix.model);

                    convert_and_attach();
                }
            }
        }
    }

    public render() {
        // 内部ステータス更新
        this._status.tick = this._status.tick + 1;

        // 画面リセット
        this._gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this._gl.clearDepth(1.0);
        this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

        // レンダリング
        this._render_pipeline();
        // this._gl.drawArrays(this._gl.TRIANGLES, 0, 3);
        this._gl.drawElements(this._gl.TRIANGLES, this._index.length, this._gl.UNSIGNED_SHORT, 0);
        this._gl.flush();
    }
}
