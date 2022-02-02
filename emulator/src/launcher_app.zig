const std = @import("std");
const c = @import("./sdl.zig").c;
const gl = @import("./opengl.zig");

const stack = @import("./stack_calc.zig");
const util = @import("./util.zig");

const gfx = @import("./graphics.zig");
const gui = @import("./gui.zig");
const Input = @import("./input.zig").Input;
const Vec2 = @import("./vec.zig").Vec2;

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const log = std.log.info;

const BoxList = ArrayList(gfx.Box);

const process = @import("./process.zig");
const Process = process.Process;

/// App that launches other apps, home page
pub const Launcher = struct {
    const Data = struct {
        gui: gui.Gui,
    };
    fn init(self: *Process) void {
        const data = self.getData(Data);
        data.gui = gui.Gui.init(self.allocator, &self.input, &self.window);
    }
    fn deinit(self: *Process) void {
        const data = self.getData(Data);
        data.gui.deinit();
    }

    fn update(self: *Process, dt: f32) void {
        _ = dt;
        const data = self.getData(Data);
        const loader = self.imports.loader;
        if (data.gui.button()) {
            std.log.info("I see you :)", .{});
        }
        if (data.gui.button() or self.input.wasKeyJustPressed('n')) {
            loader.loadProgram(loader.self, "Shader");
        }
        if (data.gui.button() or self.input.wasKeyJustPressed('m')) {
            loader.loadProgram(loader.self, "Boxes");
        }
        if (data.gui.button() or self.input.wasKeyJustPressed('j')) {
            loader.loadProgram(loader.self, "Art");
        }
        if (data.gui.button()) {
            loader.loadProgram(loader.self, "Spiral");
        }
    }

    fn draw(self: *Process) void {
        const data = self.getData(Data);
        
        gl.viewport(0, 0, self.window.w, self.window.h);
        gl.clearColor(0.05, 0.1, 0.05, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        data.gui.draw();

        c.SDL_GL_SwapWindow(self.window.ptr);
    }

    pub const app = process.Program {
        .init = init,
        .deinit = deinit,
        .update = Launcher.update,
        .draw = draw,
    };
};
