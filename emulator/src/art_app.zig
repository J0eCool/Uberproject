const std = @import("std");
const sdl = @import("./sdl.zig");
const gl = @import("./opengl.zig");

const gfx = @import("./graphics.zig");
const gui = @import("./gui.zig");
const util = @import("./util.zig");

const color = @import("./color.zig");
const RGB = color.RGB;
const HSV = color.HSV;

const Input = @import("./input.zig").Input;
const Vec2 = @import("./vec.zig").Vec2;
const Texture = @import("./texture.zig").Texture;

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const log = std.log.info;

const process = @import("./process.zig");
const Process = process.Process;

pub const ArtApp = struct {
    pub const app = process.Program {
        .init = init,
        .deinit = deinit,
        .update = update,
        .draw = draw,
    };

    const Data = struct {
        program: gl.Program,
        texture: Texture,
        time: f32 = 0.0,

        canvas: []f32,
        w: usize,
        h: usize,

        brush_size: f32 = 5.0,
        brush_color: f32 = 1.0,
        brush_opacity: f32 = 1.0,

        box_vbo: gl.Buffer,
        box_vao: gl.VertexArray,
    };

    const Self = @This();

    fn init(self: *Process) void {
        const data = self.getData(Data);

        const vert = gl.loadShader(gl.VERTEX_SHADER,
            @embedFile("../assets/shaders/textured_2d.vert")) catch unreachable;
        const frag = gl.loadShader(gl.FRAGMENT_SHADER,
            @embedFile("../assets/shaders/textured_2d.frag")) catch unreachable;
        data.program = gl.Program.init(vert, frag) catch unreachable;

        data.brush_size = 5.0;
        data.brush_color = 1.0;
        data.brush_opacity = 1.0;

        // Model data
        data.box_vbo = gl.genBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, data.box_vbo);
        const box_verts = [_]f32{
            -1.0, -1.0, 0.0, 0, 0,
            -1.0,  1.0, 0.0, 0, 1,
             1.0, -1.0, 0.0, 1, 0,
             1.0, -1.0, 0.0, 1, 0,
            -1.0,  1.0, 0.0, 0, 1,
             1.0,  1.0, 0.0, 1, 1,
        };
        gl.bufferData(f32, gl.ARRAY_BUFFER, box_verts[0..], gl.STATIC_DRAW);
        data.box_vao = gl.genVertexArray();
        gl.bindVertexArray(data.box_vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, data.box_vbo); // technically it's already bound
        const pos = data.program.getAttribLocation("aPos");
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 3, gl.c.GL_FLOAT, gl.c.GL_FALSE, 5 * @sizeOf(f32), 0);
        const uv = data.program.getAttribLocation("aTexUV");
        gl.enableVertexAttribArray(uv);
        gl.vertexAttribPointer(uv, 2, gl.c.GL_FLOAT, gl.c.GL_FALSE, 5 * @sizeOf(f32), 3*@sizeOf(f32));

        // Texture data
        data.w = 300;
        data.h = 200;
        data.texture = Texture.init(self.allocator, data.w, data.h) catch unreachable;
        data.canvas = self.allocator.alloc(f32, data.w*data.h) catch unreachable;

        for (util.times(data.w)) |_, x| {
            const c = @intToFloat(f32, x) / @intToFloat(f32, data.w);
            for (util.times(data.h)) |_, y| {
                data.canvas[x + data.w*y] = c;
            }
        }
    }

    fn deinit(self: *Process) void {
        const data = self.getData(Data);
        self.allocator.free(data.canvas);
        data.texture.deinit();
    }

    fn update(self: *Process, dt: f32) void {
        const data = self.getData(Data);
        data.time += dt;

        // Set brush from keybaord
        data.brush_size = keyRange(self, "123456", data.brush_size, 1.0, 13.0);
        data.brush_color = keyRange(self, "qwert", data.brush_color, 0.0, 1.0);
        data.brush_opacity = keyRange(self, "asdfg", data.brush_opacity, 0.1, 1.0);

        // Draw when button is held
        if (self.input.isLeftMouseButtonHeld()) {
            const screen_x = @intToFloat(f32, self.input.mouse_x) / @intToFloat(f32, self.window.w);
            const screen_y = 1 - @intToFloat(f32, self.input.mouse_y) / @intToFloat(f32, self.window.h);
            const mx = @floatToInt(i32, screen_x * @intToFloat(f32, data.w));
            const my = @floatToInt(i32, screen_y * @intToFloat(f32, data.h));
            const r = @floatToInt(i32, data.brush_size);
            var i: i32 = -r;
            while (i <= r) : (i += 1) {
                const x = mx + i;
                if (x < 0 or x >= @intCast(i32, data.w)) continue;
                var j: i32 = -r;
                while (j <= r) : (j += 1) {
                    const y = my + j;
                    if (y < 0 or y >= @intCast(i32, data.h)) continue;
                    if (i*i + j*j <= r*r){
                        const idx = @intCast(usize, x) + data.w*@intCast(usize, y);
                        data.canvas[idx] = util.lerp(data.brush_opacity, data.canvas[idx], data.brush_color);
                    }
                }
            }
        }
    }

    fn keyRange(self: *Process, keys: []const u8, cur: f32, lo: f32, hi: f32) f32 {
        for (keys) |key, i| {
            if (self.input.wasKeyJustPressed(key)) {
                const t = @intToFloat(f32, i) / @intToFloat(f32, keys.len-1);
                return util.lerp(t, lo, hi);
            }
        }
        return cur;
    }

    fn draw(self: *Process) void {
        const data = self.getData(Data);
        gl.viewport(0, 0, self.window.w, self.window.h);
        gl.clearColor(0.1, 0.12, 0.15, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        updateTextureData(self);

        data.program.use();
        data.program.uniform1f("uTime", data.time);
        data.program.uniform2f("uUVPos", 0, 0);
        data.program.uniform2f("uUVSize", 1, 1);
        data.program.uniform3f("uColor", 1, 1, 1);
        data.texture.bind();
        gl.bindVertexArray(data.box_vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        sdl.glSwapWindow(self.window.ptr);
    }

    /// Randomly sample between two colors - used as a blend function to dither
    inline fn sample(self: *Process, t: f32, from: RGB, to: RGB) RGB {
        return if (self.rand.float(f32) > t) from else to;
    }

    fn randomHue(self: *Process) RGB {
        return HSV.init(self.rand.float(f32)*360, 1, 1).toRGB();
    }
    fn randomValue(self: *Process) RGB {
        const value = self.rand.float(f32);
        return RGB.init(value, value, value);
    }

    /// Complex gradient, slow
    fn gradientMapA(self: *Process, val: f32) RGB {
        const p0 = 0.25;
        const p1 = 1-p0;
        if (val < p0) {
            const t = val / p0;
            return sample(self, t, randomValue(self).scale(1-t/2), RGB.white);
        } else if (val < p1) {
            const t = (val - p0) / (p1 - p0);
            return RGB.lerp(t, RGB.white, RGB.black);
        } else {
            const t = (val - p1) / (1 - p1);
            return sample(self, t, RGB.black, randomHue(self));
        }
    }

    /// Simple sampling gradient
    fn gradientMapB(self: *Process, val: f32) RGB {
        const lo = RGB.init(0, 0, 0);
        const hi = RGB.init(1, 1, 1);
        return sample(self, val, lo, hi);
    }

    /// Inverse of gradientA?
    fn gradientMapC(self: *Process, val: f32) RGB {
        _ = self;
        const p0 = 0.25;
        const p1 = 1-p0;
        if (val < p0) {
            const t = val / p0;
            return RGB.lerp(t, RGB.white.scale(0.5), RGB.white);
        } else if (val < p1) {
            const t = (val - p0) / (p1 - p0);
            return RGB.lerp(t, RGB.white, RGB.black);
        } else {
            const t = (val - p1) / (1 - p1);
            return RGB.lerp(t, RGB.black, RGB.white.scale(0.75));
        }
    }

    fn updateTextureData(self: *Process) void {
        const data = self.getData(Data);
        std.debug.assert(data.w == data.texture.w);
        std.debug.assert(data.h == data.texture.h);
        const buffer = data.texture.buffer;
        for (data.canvas) |val, i| {
            const c = gradientMapA(self, val);
            // const c =
            //     if (i < data.canvas.len/3)
            //         gradientMapA(self, val)
            //     else if (i < data.canvas.len*2/3)
            //         gradientMapC(self, val)
            //     else
            //         gradientMapB(self, val);
            buffer[4*i + 0] = @floatToInt(u8, 255*c.r);
            buffer[4*i + 1] = @floatToInt(u8, 255*c.g);
            buffer[4*i + 2] = @floatToInt(u8, 255*c.b);
            buffer[4*i + 3] = 255;
        }
        data.texture.sendData();
    }
};
