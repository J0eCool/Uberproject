const std = @import("std");
const sdl = @import("./sdl.zig");
const c = sdl.c;

const stack = @import("stack_calc.zig");
const util = @import("util.zig");
const Window = @import("window.zig").Window;

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const log = std.log.info;

const Box = struct {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    w: f32 = 60,
    h: f32 = 60,

    r: f32 = 0.9,
    g: f32 = 0.1,
    b: f32 = 0.1,

    fn draw(self: Box, renderer: ?*c.SDL_Renderer) void {
        var rect = c.SDL_Rect{
            .x = @floatToInt(c_int, self.x),
            .y = @floatToInt(c_int, self.y),
            .w = @floatToInt(c_int, self.w),
            .h = @floatToInt(c_int, self.h),
        };
        _ = c.SDL_SetRenderDrawColor(renderer,
            @floatToInt(u8, 255 * self.r),
            @floatToInt(u8, 255 * self.g),
            @floatToInt(u8, 255 * self.b),
            0xff);
        _ = c.SDL_RenderFillRect(renderer, &rect);
    }
};

const BoxList = ArrayList(Box);

pub const Scene = struct {
    window: Window,
    boxes: BoxList,

    fn init(title: [*c]const u8, allocator: Allocator, rand: std.rand.Random) !Scene {
        var scene = Scene {
            .window = Window.init(title, 1024, 600),
            .boxes = ArrayList(Box).init(allocator),
        };
        for (util.times(5)) |_| {
            try scene.addRandomBox(rand);
        }
        return scene;
    }
    fn deinit(self: Scene) void {
        self.boxes.deinit();
        self.window.deinit();
    }

    fn addRandomBox(self: *Scene, rand: std.rand.Random) !void {
        var box = Box {
            .x = rand.float(f32) * 800 + 20,
            .y = rand.float(f32) * 400 + 20,
            .vx = rand.floatNorm(f32) * 80,
            .vy = rand.floatNorm(f32) * 80,
            .w = rand.floatNorm(f32) * 15 + 40,
            .h = rand.floatNorm(f32) * 15 + 40,
        };
        try self.boxes.append(box);
    }
    fn removeRandomBox(self: *Scene, rand: std.rand.Random) void {
        if (self.boxes.items.len == 0) {
            return;
        }
        const idx = rand.int(u32) % self.boxes.items.len;
        _ = self.boxes.swapRemove(idx);
    }

    fn update(self: Scene, dt: f32) void {
        for (self.boxes.items) |*box| {
            if (box.x < 0) {
                box.vx = std.math.fabs(box.vx);
            }
            if (box.x + box.w > @intToFloat(f32, self.window.w)) {
                box.vx = -std.math.fabs(box.vx);
            }
            if (box.y < 0) {
                box.vy = std.math.fabs(box.vy);
            }
            if (box.y + box.h > @intToFloat(f32, self.window.h)) {
                box.vy = -std.math.fabs(box.vy);
            }
            box.x += box.vx * dt;
            box.y += box.vy * dt;
        }
    }

    fn render(self: Scene) void {
        _ = c.SDL_SetRenderDrawColor(self.window.renderer, 0x10, 0x10, 0x10, 0xff);
        _ = c.SDL_RenderClear(self.window.renderer);

        for (self.boxes.items) |box| {
            box.draw(self.window.renderer);
        }

        c.SDL_RenderPresent(self.window.renderer);
    }
};

/// Holds a bunch of scenes, manages their shared state
pub const SceneBox = struct {
    allocator: Allocator,
    scenes: ArrayList(Scene),
    rand: std.rand.Random,
    pub fn init(allocator: Allocator, rand: std.rand.Random) SceneBox {
        return SceneBox {
            .allocator = allocator,
            .scenes = ArrayList(Scene).init(allocator),
            .rand = rand,
        };
    }
    pub fn deinit(self: *SceneBox) void {
        self.scenes.deinit();
    }

    pub fn run(self: *SceneBox) !void {
        var scenes = [_]Scene {
            try Scene.init("Window 1", self.allocator, self.rand),
            try Scene.init("window 2", self.allocator, self.rand),
        };
        defer for (scenes) |scene| scene.deinit();

        mainloop: while (true) {
            // Input
            var sdl_event: c.SDL_Event = undefined;
            while (c.SDL_PollEvent(&sdl_event) != 0) {
                switch (sdl_event.type) {
                    c.SDL_QUIT => break :mainloop,
                    c.SDL_KEYDOWN => {
                        switch (sdl_event.key.keysym.sym) {
                            c.SDLK_ESCAPE => break :mainloop,
                            c.SDLK_e => {
                                try scenes[0].addRandomBox(self.rand);
                            },
                            c.SDLK_w => {
                                scenes[0].removeRandomBox(self.rand);
                            },
                            else => {},
                        }
                    },
                    else => {},
                }
            }

            // Update
            const dt = 1.0 / 60.0;
            for (scenes) |*scene| {
                scene.update(dt);
            }

            // Render
            for (scenes) |*scene| {
                scene.render();
            }
        }
    }
};
