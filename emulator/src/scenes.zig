const std = @import("std");
const c = @import("./sdl.zig").c;

const stack = @import("./stack_calc.zig");
const util = @import("./util.zig");
const Window = @import("./window.zig").Window;

const gfx = @import("./graphics.zig");
const Vec2 = @import("./vec.zig").Vec2;

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const log = std.log.info;

const BoxList = ArrayList(gfx.Box);

/// Userland programs that run atop the kernel
pub const Program = struct {
    const Self = @This();
    const Info = struct {
        update: fn(self: Self, dt: f32) void,
        // draw: fn(Self) void,
    };

    window: Window,
    boxes: BoxList,
    vtable: Info,

    fn init(title: [*c]const u8, allocator: Allocator, rand: std.rand.Random,
            program: Info) !Self {
        var scene = Self {
            .window = Window.init(title, 1024, 600),
            .boxes = BoxList.init(allocator),
            .vtable = program,
        };
        for (util.times(5)) |_| {
            try scene.addRandomBox(rand);
        }
        return scene;
    }
    fn deinit(self: Self) void {
        self.boxes.deinit();
        self.window.deinit();
    }

    fn addRandomBox(self: *Self, rand: std.rand.Random) !void {
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
    fn removeRandomBox(self: *Self, rand: std.rand.Random) void {
        if (self.boxes.items.len == 0) {
            return;
        }
        const idx = rand.int(u32) % self.boxes.items.len;
        _ = self.boxes.swapRemove(idx);
    }

    fn update(self: Self, dt: f32) void {
        self.vtable.update(self, dt);
    }

    fn render(self: Self) void {
        _ = c.SDL_SetRenderDrawColor(self.window.renderer, 0x10, 0x10, 0x10, 0xff);
        _ = c.SDL_RenderClear(self.window.renderer);

        for (self.boxes.items) |box| {
            box.draw(self.window.renderer);
        }

        c.SDL_RenderPresent(self.window.renderer);
    }
};

fn bouncyBox(self: Program, dt: f32) void {
    for (self.boxes.items) |*box| {
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

fn circleBox(self: Program, dt: f32) void {
    const win_size = Vec2.init(@intToFloat(f32, self.window.w),@intToFloat(f32, self.window.h));
    const win_center = win_size.scale(0.5);
    for (self.boxes.items) |*box| {
        const delta = box.pos.sub(win_center).unit();
        const vel = Vec2.init(delta.y, -delta.x).scale(120);
        box.pos = box.pos.add(vel.scale(dt));
    }
}

/// Holds a bunch of programs, manages their shared state
pub const SceneBox = struct {
    allocator: Allocator,
    programs: ArrayList(Program),
    rand: std.rand.Random,
    shouldQuit: bool = false,

    pub fn init(allocator: Allocator, rand: std.rand.Random) SceneBox {
        return SceneBox {
            .allocator = allocator,
            .programs = ArrayList(Program).init(allocator),
            .rand = rand,
        };
    }
    pub fn deinit(self: *SceneBox) void {
        for (self.programs.items) |scene| scene.deinit();
        self.programs.deinit();
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
                        },
                        c.SDL_WINDOWEVENT_SIZE_CHANGED => {
                            scene.window.w = event.window.data1;
                            scene.window.h = event.window.data2;
                        },
                        else => {},
                    }
                },
                c.SDL_KEYDOWN => switch (event.key.keysym.sym) {
                    c.SDLK_ESCAPE => self.shouldQuit = true,
                    c.SDLK_e => {
                        try self.programs.items[0].addRandomBox(self.rand);
                    },
                    c.SDLK_w => {
                        self.programs.items[0].removeRandomBox(self.rand);
                    },
                    c.SDLK_RETURN => {
                        try self.programs.append(try Program.init("Noot", self.allocator, self.rand,
                            Program.Info {.update = circleBox}));
                    },
                    else => {},
                },
                else => {},
            }
        }
    }

    pub fn run(self: *SceneBox) !void {
        try self.programs.append(try Program.init("Root", self.allocator, self.rand,
            Program.Info {.update = bouncyBox}));

        while (!self.shouldQuit and self.programs.items.len > 0) {
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
