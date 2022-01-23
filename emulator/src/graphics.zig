const gl = @import("./opengl.zig");

const Vec2 = @import("./vec.zig").Vec2;
const Window = @import("./window.zig").Window;

pub const Color = struct {
    r: f32,
    g: f32,
    b: f32,

    pub fn init(r: f32, g: f32, b: f32) Color {
        return Color { .r = r, .g = g, .b = b };
    }
};

pub const Box = struct {
    pos: Vec2,
    vel: Vec2 = Vec2.init(0, 0),
    size: Vec2,

    color: Color = Color.init(0.9, 0.1, 0.1),
};

/// Render Instruction - used to build a list of rendering instructions, to support
/// rendering in a FP-style
pub const Instr = union(enum) {
    box: Box,

    pub fn draw(self: Instr, program: gl.Program, win: Window) void {
        switch (self) {
            .box => |box| {
                const x = 2.0 * (box.pos.x / @intToFloat(f32, win.w) - 0.5);
                const y = 2.0 * (box.pos.y / @intToFloat(f32, win.h) - 0.5);
                const w = 2.0 * box.size.x / @intToFloat(f32, win.w);
                const h = 2.0 * box.size.y / @intToFloat(f32, win.h);
                program.uniform3f("uPos", x, y, 0.0);
                program.uniform2f("uScale", w, h);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            },
        }
    }
};
