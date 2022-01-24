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

const BoxList = ArrayList(gfx.Box);

const process = @import("./process.zig");
const Process = process.Process;

pub const BoxApp = struct {
    const Data = struct {
        boxes: BoxList,
        program: gl.Program,

        box_vbo: gl.Buffer,
        box_vao: gl.VertexArray,
        pos_loc: gl.Uint,

        fn addRandomBox(self: *Data, rand: std.rand.Random) !void {
            var box = gfx.Box {
                .pos = Vec2.init(
                    rand.float(f32) * 800 + 20,
                    rand.float(f32) * 400 + 20,
                ),
                .vel = Vec2.init(
                    rand.floatNorm(f32) * 80,
                    rand.floatNorm(f32) * 80,
                ),
                .size = Vec2.init(
                    rand.floatNorm(f32) * 15 + 40,
                    rand.floatNorm(f32) * 15 + 40,
                ),
            };
            try self.boxes.append(box);
        }
        fn removeRandomBox(self: *Data, rand: std.rand.Random) void {
            if (self.boxes.items.len == 0) {
                return;
            }
            const idx = rand.int(u32) % self.boxes.items.len;
            _ = self.boxes.swapRemove(idx);
        }
    };

    fn init(self: *Process) void {
        const data = self.getData(Data);
        data.boxes = BoxList.init(self.allocator);

        const vert = gl.loadShader(gl.VERTEX_SHADER,
            \\attribute vec3 aPos;
            \\
            \\uniform vec3 uPos;
            \\uniform vec2 uScale;
            \\
            \\varying vec2 vPos;
            \\
            \\void main() {
            \\    vec3 pos = aPos*vec3(uScale, 1) + uPos;
            \\    vPos = pos;
            \\    gl_Position = vec4(pos, 1.0);
            \\}
        ) catch unreachable;
        const frag = gl.loadShader(gl.FRAGMENT_SHADER,
            \\precision mediump float;
            \\
            \\//uniform vec4 uColor;
            \\
            \\void main() {
            \\    gl_FragColor = vec4(1, 1, 1, 1);
            \\}
        ) catch unreachable;
        data.program = gl.Program.init(vert, frag) catch unreachable;

        data.box_vbo = gl.genBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, data.box_vbo);
        const box_verts = [_]f32{
            0.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
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

        for (util.times(5)) |_| {
            data.addRandomBox(self.rand) catch unreachable;
        }
    }
    fn deinit(self: *Process) void {
        const data = self.getData(Data);
        data.boxes.deinit();
    }

    fn bouncyBox(self: *Process, dt: f32) void {
        const data = self.getData(Data);
        if (self.input.wasKeyJustPressed('e')) {
            data.addRandomBox(self.rand) catch {};
        }
        if (self.input.wasKeyJustPressed('w')) {
            data.removeRandomBox(self.rand);
        }

        for (data.boxes.items) |*box| {
            if (box.pos.x < 0) {
                box.vel.x = std.math.fabs(box.vel.x);
            }
            if (box.pos.x + box.size.x > @intToFloat(f32, self.window.w)) {
                box.vel.x = -std.math.fabs(box.vel.x);
            }
            if (box.pos.y < 0) {
                box.vel.y = std.math.fabs(box.vel.y);
            }
            if (box.pos.y + box.size.y > @intToFloat(f32, self.window.h)) {
                box.vel.y = -std.math.fabs(box.vel.y);
            }
            box.pos = box.pos.add(box.vel.scale(dt));
        }
    }

    fn circleBox(self: *Process, dt: f32) void {
        const data = self.getData(Data);
        if (self.input.wasKeyJustPressed('e')) {
            data.addRandomBox(self.rand) catch {};
        }
        if (self.input.wasKeyJustPressed('w')) {
            data.removeRandomBox(self.rand);
        }

        const win_size = Vec2.init(@intToFloat(f32, self.window.w), @intToFloat(f32, self.window.h));
        const win_center = win_size.scale(0.5);
        for (data.boxes.items) |*box| {
            const delta = box.pos.sub(win_center).unit();
            const vel = Vec2.init(delta.y, -delta.x).scale(120);
            box.pos = box.pos.add(vel.scale(dt));
        }
    }

    fn draw(self: *Process) void {
        const data = self.getData(Data);
        gl.viewport(0, 0, self.window.w, self.window.h);
        gl.clearColor(0.1, 0.12, 0.15, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        data.program.use();
        gl.bindVertexArray(data.box_vao);
        for (data.boxes.items) |box| {
            const instr = gfx.Instr{.box = box};
            instr.draw(data.program, self.window);
        }

        c.SDL_GL_SwapWindow(self.window.ptr);
    }

    pub const bouncy = process.Program {
        .init = init,
        .deinit = deinit,
        .update = bouncyBox,
        .draw = draw,
    };
    pub const circle = process.Program {
        .init = init,
        .deinit = deinit,
        .update = circleBox,
        .draw = draw,
    };
};
