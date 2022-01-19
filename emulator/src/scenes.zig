const std = @import("std");
const c = @import("./sdl.zig").c;

const stack = @import("./stack_calc.zig");
const util = @import("./util.zig");

const gfx = @import("./graphics.zig");
const Input = @import("./input.zig").Input;
const Vec2 = @import("./vec.zig").Vec2;

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const log = std.log.info;

const BoxList = ArrayList(gfx.Box);

const process = @import("./process.zig");
const Process = process.Process;

const BoxApp = struct {
    const Data = struct {
        boxes: BoxList,

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
        for (util.times(5)) |_| {
            data.addRandomBox(self.rand) catch {};
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
        _ = c.SDL_SetRenderDrawColor(self.window.renderer, 0x10, 0x10, 0x10, 0xff);
        _ = c.SDL_RenderClear(self.window.renderer);

        for (data.boxes.items) |box| {
            box.draw(self.window.renderer);
        }

        c.SDL_RenderPresent(self.window.renderer);
    }

    const bouncy = process.Program {
        .init = init,
        .deinit = deinit,
        .update = bouncyBox,
        .draw = draw,
    };
    const circle = process.Program {
        .init = init,
        .deinit = deinit,
        .update = circleBox,
        .draw = draw,
    };
};

const Launcher = struct {
    fn init(self: *Process) void {
        _ = self;
    }
    fn deinit(self: *Process) void {
        _ = self;
    }

    fn update(self: *Process, dt: f32) void {
        _ = dt;
        const loader = self.imports.loader;
        if (self.input.wasKeyJustPressed('h')) {
            std.log.info("I see you :)", .{});
        }
        if (self.input.wasKeyJustPressed('n')) {
            loader.loadProgram(loader.self, "Smeef");
        }
        if (self.input.wasKeyJustPressed('m')) {
            loader.loadProgram(loader.self, "Meef");
        }
    }

    fn draw(self: *Process) void {
        _ = c.SDL_SetRenderDrawColor(self.window.renderer, 0x10, 0x20, 0x10, 0xff);
        _ = c.SDL_RenderClear(self.window.renderer);

        c.SDL_RenderPresent(self.window.renderer);
    }

    const app = process.Program {
        .init = init,
        .deinit = deinit,
        .update = Launcher.update,
        .draw = draw,
    };
};

/// Holds a bunch of programs, manages their shared state
pub const SceneBox = struct {
    allocator: Allocator,
    programs: ArrayList(Process),
    /// programs that are loaded and waiting for event loop
    queuedPrograms: ArrayList(Process),
    focused: ?*Process = null,
    rand: std.rand.Random,
    shouldQuit: bool = false,

    fn loadProgram(self: *SceneBox, name: []const u8) void {
        std.log.info("Loading program {s}", .{name});
        const vtable: process.Program =
            if (std.mem.eql(u8, name, "Loader")) Launcher.app
            else if (std.mem.eql(u8, name, "Smeef")) BoxApp.bouncy
            else if (std.mem.eql(u8, name, "Meef")) BoxApp.circle
            else {
                std.log.err("No program with name {s}", .{name});
                return;
            };
        const imports = process.Imports {
            .loader = .{
                .self = @ptrCast(*anyopaque, self),
                .loadProgram = @ptrCast(fn(*anyopaque, []const u8) void, SceneBox.loadProgram),
            },
        };
        const program = Process.init(@ptrCast([*c]const u8, name),
                self.allocator, self.rand, vtable, imports) catch |err| {
            std.log.err("Failed to init program with err={}", .{err});
            return;
        };
        self.queuedPrograms.append(program) catch {
            std.log.err("self.programs.append(program)", .{});
            return;
        };
    }

    pub fn init(allocator: Allocator, rand: std.rand.Random) !*SceneBox {
        var box = try allocator.create(SceneBox);
        box.* = SceneBox {
            .allocator = allocator,
            .programs = ArrayList(Process).init(allocator),
            .queuedPrograms = ArrayList(Process).init(allocator),
            .rand = rand,
        };
        box.loadProgram("Loader");
        return box;
    }

    pub fn deinit(self: *SceneBox) void {
        for (self.programs.items) |*scene| scene.deinit();
        self.programs.deinit();
        self.queuedPrograms.deinit();
        self.allocator.destroy(self);
    }

    /// Gets a Scene index from an SDL window ID ; used for matching events to programs
    /// Returns an index so we can modify the list if need be
    fn getSceneIndexFromWindowId(self: *SceneBox, id: usize) !usize {
        for (self.programs.items) |scene, i| {
            if (scene.window.id == id) {
                return i;
            }
        }
        return error.WindowNotFound;
    }

    fn handleInput(self: *SceneBox) !void {
        // update each program's Input
        for (self.programs.items) |*program| {
            program.input.startFrame();
        }

        // poll for events
        // handle Window-level events here, and pass the rest to the focused window
        var event: c.SDL_Event = undefined;
        while (c.SDL_PollEvent(&event) != 0) {
            switch (event.type) {
                // c.SDL_QUIT => break :mainloop,
                c.SDL_WINDOWEVENT => {
                    const idx = self.getSceneIndexFromWindowId(event.window.windowID) catch continue;
                    const scene = &self.programs.items[idx];
                    switch (event.window.event) {
                        c.SDL_WINDOWEVENT_CLOSE => {
                            scene.deinit();
                            _ = self.programs.swapRemove(idx);
                            if (self.programs.items.len == 0) {
                                return;
                            }
                            // We probably immediately get a WINDOWEVENT_FOCUS_GAINED on the
                            // next window, but I'd rather have NO point in the program where
                            // self.focused isn't a valid pointer
                            self.focused = &self.programs.items[idx % self.programs.items.len];
                        },
                        c.SDL_WINDOWEVENT_SIZE_CHANGED => {
                            scene.window.w = event.window.data1;
                            scene.window.h = event.window.data2;
                        },
                        c.SDL_WINDOWEVENT_FOCUS_GAINED => {
                            self.focused = scene;
                        },
                        else => {},
                    }
                },
                c.SDL_KEYDOWN => switch (event.key.keysym.sym) {
                    c.SDLK_ESCAPE => self.shouldQuit = true,
                    else => {},
                },
                else => {},
            }
            if (self.focused) |proc| {
                proc.input.handleEvent(event);
            }
        }
    }

    fn keepRunning(self: *SceneBox) bool {
        if (self.shouldQuit) return false;
        const n_processes = self.programs.items.len + self.queuedPrograms.items.len;
        return n_processes > 0;
    }

    pub fn run(self: *SceneBox) !void {
        while (self.keepRunning()) {
            // Add queued programs into the list
            for (self.queuedPrograms.items) |program| {
                try self.programs.append(program);
            }
            self.queuedPrograms.shrinkRetainingCapacity(0);

            if (self.focused == null) {
                self.focused = &self.programs.items[0];
            }

            // Input
            try self.handleInput();

            // Update
            const dt = 1.0 / 60.0;
            for (self.programs.items) |*scene| {
                scene.update(dt);
            }

            // Render
            for (self.programs.items) |*scene| {
                scene.render();
            }
        }
    }
};
