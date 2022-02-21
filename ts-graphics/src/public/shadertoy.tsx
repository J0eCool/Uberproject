import React, { useState } from 'react';
import ReactDOM from 'react-dom';

function unnull<T>(val: T|null|undefined): T {
    if (val == null || val == undefined) {
        throw "assert failed: was null";
    }
    return val;
}

/** Loads a file from the server's data/ folder */
async function loadFile(filename: string): Promise<string> {
    return await (await fetch(`/data/${filename}`)).text();
}

type GLRender = WebGLRenderingContextBase;

function compileShader(gl: GLRender, shader: WebGLShader, text: string) {
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0) {
        throw new Error(unnull(gl.getShaderInfoLog(shader)));
    }
}
async function createShader(gl: GLRender, kind: number, filename: string): Promise<WebGLShader> {
    const shader = unnull(gl.createShader(kind));
    const text = await loadFile(filename);
    compileShader(gl, shader, text);
    return shader;
}

async function linkProgram(gl: GLRender, program: WebGLProgram) {
    gl.linkProgram(program);
    gl.useProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS) == 0) {
        throw new Error(unnull(gl.getProgramInfoLog(program)));
    }
}
async function createProgram(gl: GLRender, vert: WebGLShader, frag: WebGLShader): Promise<WebGLProgram> {
    const program = unnull(gl.createProgram());
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    linkProgram(gl, program);
    // gl.detachShader(program, vert);
    // gl.detachShader(program, frag);

    return program;
}

function App(props: any) {
    return <div>
        <div>
            <button onClick={() => unnull(document.getElementById('canvas')).requestFullscreen()}>Fullscreen</button>
        </div>
        <canvas id="canvas" width={1920} height={1080} />
    </div>;
}

async function initReact() {
    let app = <App />;
    ReactDOM.render(app, document.getElementById('app'));
}

async function initGL(): Promise<void> {
    const canvas = unnull(document.getElementById('canvas')) as HTMLCanvasElement;
    const gl = unnull(canvas.getContext('webgl2'));

    const vertexShader = await createShader(gl, gl.VERTEX_SHADER, 'shadertoy.vert');
    const fragmentShader = await createShader(gl, gl.FRAGMENT_SHADER, 'shadertoy.frag');
    const shaderProgram = await createProgram(gl, vertexShader, fragmentShader);

    // every second, check if the text has changed, if so reload
    // let oldFrag: string|null = null;
    let oldFrag = '';
    setInterval(async () => {
        const text = await loadFile('shadertoy.frag');
        // only check this once in case the compile+link throws an error
        const changed = text != oldFrag;
        oldFrag = text;
        if (changed) {
            console.log('yo dog')
            compileShader(gl, fragmentShader, text);
            linkProgram(gl, shaderProgram);
        }
    }, 1000);

    // next: fullscreen that shit
    // then: param sliders
    // then: multiple files
        // save settings per shader - have a shadertoy.json file

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

    const timeLoc = gl.getUniformLocation(shaderProgram, 'uTime');
    const arLoc = gl.getUniformLocation(shaderProgram, 'uAspectRatio');
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
        gl.uniform1f(gl.getUniformLocation(shaderProgram, 'uTime'),
            ((window.performance || Date).now() - startTime) / 1000);
        gl.uniform1f(gl.getUniformLocation(shaderProgram, 'uAspectRatio'),
            canvas.width / canvas.height);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        // gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(frame);
    })();
}

async function main() {
    await initReact();
    await initGL();
}

main();
