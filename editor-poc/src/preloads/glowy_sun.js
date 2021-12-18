import { preloads } from './preloads_core';

// Glowy Sun - Canvas demo to show graphical applications
preloads['preload://glowy-sun'] = {
    type: 'builtin://Application',
    title: 'A glowy sun',
    imports: {
        canvas: 'builtin://CanvasApp',
    },
    initFunc(imports) { return {
        init() {
            console.log('nodes!', nodes);
            imports.canvas.init(320, 240);
            let canvas = document.getElementById('canvas');
            this.width = canvas.width;
            this.height = canvas.height;
            let w = this.width;
            let h = this.height;
            this.ctx = canvas.getContext('2d');
            this.pixels = new Uint8Array(4 * w * h);
            this.image = this.ctx.createImageData(w, h);
            
            this.particles = [];
            for (let i = 0; i < 200000; ++i) {
                let r = Math.random() + Math.random();
                if (r >= 1) { r = 2 - r; }
                let angle = Math.random() * 2*Math.PI;
                let maxR = Math.min(w, h)/4;
                let x = w/2 + maxR*r*Math.cos(angle);
                let y = h/2 + maxR*r*Math.sin(angle);
                let speed = 5000.0;
                let c = r / maxR;
                angle += Math.PI/2;
                let randSpeed = 0.25;
                let vx = c * speed * Math.cos(angle) * (1 + randSpeed*(Math.random() - 0.5));
                let vy = c * speed * Math.sin(angle) * (1 + randSpeed*(Math.random() - 0.5));
                r = 0;
                let g = 0;
                let b = 0;
                let color = Math.random()*3;
                if (color < 1) { r = 1; }
                else if (color < 2) { g = 1; }
                else { b = 1; }
                this.particles.push({
                    x, y,
                    vx, vy,
                    r, g, b,
                });
            }
        },
        update() {
            let dt = 1/60;

            let w = this.width;
            let h = this.height;
            let pixels = this.pixels;

            // clear canvas to black
            for (let i = 0; i < w*h; ++i) {
                let pix = 4 * i;
                pixels[pix+0] = 0;
                pixels[pix+1] = 0;
                pixels[pix+2] = 0;
                pixels[pix+3] = 255;
            }

            let c = 20;
            let accel = 1.25;
            for (let p of this.particles) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx += -p.vy * accel * dt;
                p.vy += p.vx * accel * dt;

                let pix = ((p.x|0) + (p.y|0)*w)<<2;
                pixels[pix+0] += (c * p.r)*(256-pixels[pix+0])/256;
                pixels[pix+1] += (c * p.g)*(256-pixels[pix+1])/256;
                pixels[pix+2] += (c * p.b)*(256-pixels[pix+2])/256;
            }

            this.image.data.set(pixels);
            this.ctx.putImageData(this.image, 0, 0);
        },
    }; },
};
