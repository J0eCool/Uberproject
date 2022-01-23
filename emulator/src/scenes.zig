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

const BoxApp = @import("./box_app.zig").BoxApp;

const process = @import("./process.zig");
const Process = process.Process;

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
