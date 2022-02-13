// This example creates an HTML canvas which uses WebGL to
// render spinning confetti using JavaScript. We're going
// to walk through the code to understand how it works, and
// see how TypeScript's tooling provides useful insight.

// This example builds off: example:working-with-the-dom

// First up, we need to create an HTML canvas element, which
// we do via the DOM API and set some inline style attributes:

function unnull<T>(val: T|null): T {
    if (val == null) {
        throw "assert failed: was null";
    }
    return val;
}

async function compileShader(gl: WebGLRenderingContextBase, kind: number, filename: string): Promise<WebGLShader> {
    const shader = unnull(gl.createShader(kind));
    const text = await (await fetch(filename)).text();
    gl.shaderSource(shader, text);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0) {
        console.error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

async function start(): Promise<void> {
    const canvas = <HTMLCanvasElement>unnull(document.getElementById('canvas'));
    const gl = unnull(canvas.getContext('webgl2'));

    const vertexShader = await compileShader(gl, gl.VERTEX_SHADER, 'shadertoy.vert');
    const fragmentShader = await compileShader(gl, gl.FRAGMENT_SHADER, 'shadertoy.frag');

    const shaderProgram = unnull(gl.createProgram());
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    const verts = new Float32Array([
        -1.0, -1.0, 0.0,
        -1.0,  1.0, 0.0,
         1.0, -1.0, 0.0,
         1.0, -1.0, 0.0,
        -1.0,  1.0, 0.0,
         1.0,  1.0, 0.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const stride = 3;
    const offset = 0;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const loc = gl.getAttribLocation(shaderProgram, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, stride * 4, offset * 4);

    const timeUniformLocation = gl.getUniformLocation(shaderProgram, 'uTime');
    const startTime = (window.performance || Date).now();

    // Start the background colour as black
    gl.clearColor(0, 0, 0, 1);

    // Allow alpha channels on in the vertex shader
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Set the WebGL context to be the full size of the canvas
    gl.viewport(0, 0, canvas.width, canvas.height);

    (function frame() {        
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.useProgram(shaderProgram);
        gl.bindVertexArray(vao);
        gl.uniform1f(timeUniformLocation, ((window.performance || Date).now() - startTime) / 1000);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        // gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(frame);
    })();
}

start();