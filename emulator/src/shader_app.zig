const std = @import("std");
const c = @import("./sdl.zig").c;
const gl = @import("./opengl.zig");

const gfx = @import("./graphics.zig");
const gui = @import("./gui.zig");
const util = @import("./util.zig");

const Input = @import("./input.zig").Input;
const Launcher = @import("./launcher_app.zig").Launcher;
const Vec2 = @import("./vec.zig").Vec2;

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const log = std.log.info;

const process = @import("./process.zig");
const Process = process.Process;

pub const ShaderApp = struct {
    const Data = struct {
        program: gl.Program,
        time: f32 = 0.0,

        box_vbo: gl.Buffer,
        box_vao: gl.VertexArray,
        pos_loc: gl.Uint,

        fn reloadFrag(self: Data, proc: Process) void {
            const contents = util.readWholeFile(proc.allocator, frag_file) catch |err| {
                std.log.err("Unable to open shader file {s}\n  error: {}", .{frag_file, err});
                return;
            };
            defer proc.allocator.free(contents);
            gl.compileShader(self.program.frag, contents) catch |err| {
                std.log.err("Unable to compile shader: {}", .{err});
                return;
            };
            self.program.link() catch |err| {
                std.log.err("Unable to link shader program: {}", .{err});
                return;
            };
        }
    };

    // note: path is relative to zig-out/bin/emulator.exe
    const frag_file = "assets/shaders/2-fractal.frag";

    fn init(self: *Process) void {
        const data = self.getData(Data);

        const vert = gl.loadShader(gl.VERTEX_SHADER,
            \\attribute vec3 aPos;
            \\
            \\varying vec2 vPos;
            \\
            \\void main() {
            \\    vPos = aPos;
            \\    gl_Position = vec4(aPos, 1.0);
            \\}
        ) catch unreachable;
        const frag_contents = util.readWholeFile(self.allocator, frag_file) catch unreachable;
        defer self.allocator.free(frag_contents);
        const frag = gl.loadShader(gl.FRAGMENT_SHADER, frag_contents) catch unreachable;
        data.program = gl.Program.init(vert, frag) catch unreachable;

        data.box_vbo = gl.genBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, data.box_vbo);
        const box_verts = [_]f32{
            -1.0, -1.0, 0.0,
            -1.0, 1.0, 0.0,
            1.0, -1.0, 0.0,
            1.0, -1.0, 0.0,
            -1.0, 1.0, 0.0,
            1.0, 1.0, 0.0,
        };
        gl.bufferData(f32, gl.ARRAY_BUFFER, box_verts[0..], gl.STATIC_DRAW);
        data.box_vao = gl.genVertexArray();
        gl.bindVertexArray(data.box_vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, data.box_vbo); // technically it's already bound
        data.pos_loc = data.program.getAttribLocation("aPos");
        gl.enableVertexAttribArray(data.pos_loc);
        gl.c.__glewVertexAttribPointer.?(data.pos_loc,
            3, gl.c.GL_FLOAT, gl.c.GL_FALSE, 3 * @sizeOf(f32), null);

    }
    fn deinit(self: *Process) void {
        _ = self;
    }

    fn update(self: *Process, dt: f32) void {
        const data = self.getData(Data);
        data.time += dt;

        if (self.input.wasKeyJustPressed('r')) {
            data.reloadFrag(self.*);
        }
    }

    fn draw(self: *Process) void {
        const data = self.getData(Data);
        gl.viewport(0, 0, self.window.w, self.window.h);
        gl.clearColor(0.1, 0.12, 0.15, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        data.program.use();
        data.program.uniform1f("uTime", data.time);
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
