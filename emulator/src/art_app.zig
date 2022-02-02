const std = @import("std");
const c = @import("./sdl.zig").c;
const gl = @import("./opengl.zig");

const gfx = @import("./graphics.zig");
const gui = @import("./gui.zig");
const util = @import("./util.zig");

const Input = @import("./input.zig").Input;
const Vec2 = @import("./vec.zig").Vec2;
const Texture = @import("./texture.zig").Texture;

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const log = std.log.info;

const process = @import("./process.zig");
const Process = process.Process;

pub const ArtApp = struct {
    const Data = struct {
        program: gl.Program,
        texture: Texture,
        time: f32 = 0.0,

        box_vbo: gl.Buffer,
        box_vao: gl.VertexArray,
    };

    fn init(self: *Process) void {
        const data = self.getData(Data);

        const vert = gl.loadShader(gl.VERTEX_SHADER,
            @embedFile("../assets/shaders/textured_2d.vert")) catch unreachable;
        const frag = gl.loadShader(gl.FRAGMENT_SHADER,
            @embedFile("../assets/shaders/textured_2d.frag")) catch unreachable;
        data.program = gl.Program.init(vert, frag) catch unreachable;

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
        data.texture = Texture.init(self.allocator, 1024, 1024) catch unreachable;
    }

    fn deinit(self: *Process) void {
        const data = self.getData(Data);
        data.texture.deinit();
    }

    fn update(self: *Process, dt: f32) void {
        const data = self.getData(Data);
        data.time += dt;
    }

    fn draw(self: *Process) void {
        const data = self.getData(Data);
        gl.viewport(0, 0, self.window.w, self.window.h);
        gl.clearColor(0.1, 0.12, 0.15, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        data.texture.bind();
        const t = @floatToInt(usize, 256 * data.time);
        for (util.times(@intCast(usize, data.texture.w * data.texture.h))) |_, i| {
            data.texture.buffer[4*i + 0] = 0;
            data.texture.buffer[4*i + 1] = @intCast(u8, (t+i) % 256);
            data.texture.buffer[4*i + 2] = 0;
            data.texture.buffer[4*i + 3] = 255;
        }
        data.texture.sendData();

        data.program.use();
        data.program.uniform1f("uTime", data.time);
        data.program.uniform2f("uUVPos", 0, 0);
        data.program.uniform2f("uUVSize", 1, 1);
        data.program.uniform3f("uColor", 1, 1, 1);
        gl.bindVertexArray(data.box_vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        c.SDL_GL_SwapWindow(self.window.ptr);
    }

    pub const app = process.Program {
        .init = init,
        .deinit = deinit,
        .update = update,
        .draw = draw,
    };
};
