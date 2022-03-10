/// <reference path="./w3e.ts"/>
/// <reference path="./matrix.ts"/>

(() => {
    if (!W3E) {
        console.error('Failed to load W3E');
        return;
    }

    if (!matIV) {
        console.error('Failed to load matIV');
        return;
    }

    const vertex_shader = `
        attribute vec3 position;
        attribute vec4 color;
        uniform mat4 mvpMatrix;
        varying vec4 vColor;
        
        void main(void){
            vColor = color;
            gl_Position = mvpMatrix * vec4(position, 1.0);
        }
    `;

    const fragment_shader = `
        precision mediump float;
        varying vec4 vColor;

        void main(void){
            gl_FragColor = vColor;
        }
    `;

    // パラメータから自動的に初期化設定
    const w3e = new W3E({
        width: innerWidth,
        height: innerHeight,
        vertex_shader,
        fragment_shader,
    });

    // ドキュメント上に canvas を描画
    w3e.append(document.body);

    // モデルデータを用意
    w3e.create_polygon(
        [{
            attribute: 'position',
            dimension: 3, // (X,Y,Z)
            vertex: [
                0.0, 0.5, 0.0,
                0.5, 0.0, 0.0,
                -0.5, 0.0, 0.0
            ],
        },
        {
            attribute: 'color',
            dimension: 4, // (R,G,B,A)
            vertex: [
                0.0, 1.0, 0.0, 1.0,
                1.0, 0.0, 0.0, 1.0,
                0.0, 0.0, 1.0, 1.0
            ],
        }],
        {
            positions: [
                [1.5, -1.0, 0.0],
                [-1.5, -1.0, 0.0],
                [0.0, 0.5, 0.0],
            ]
        }
    );

    w3e.create_polygon(
        [{
            attribute: 'position',
            dimension: 3, // (X,Y,Z)
            vertex: [
                0.0, 0.5, 0.0,
                0.5, 0.0, 0.0,
                -0.5, 0.0, 0.0
            ],
        },
        {
            attribute: 'color',
            dimension: 4, // (R,G,B,A)
            vertex: [
                1.0, 1.0, 0.0, 1.0,
                1.0, 0.0, 1.0, 1.0,
                1.0, 1.0, 0.0, 1.0
            ],
        }],
        {
            positions: [
                [1.0, 0.0, -1.0],
                [-2.0, 0.0, 1.0],
                [2.0, -1.0, 1.0],
            ],
            rotate: [0, 1, 0],
        }
    );

    const loop = () => {
        // 描画命令の発行とレンダリング
        w3e.render();
        requestAnimationFrame(loop);
    };

    loop();
})();
