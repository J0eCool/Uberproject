const std = @import("std");
const c = @import("./sdl.zig").c;
const gl = @import("./opengl.zig");
const g = gl.c;

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
    program: gl.Program,

    fn init(title: [*c]const u8, allocator: Allocator, rand: std.rand.Random) !Scene {
        const vert = try gl.loadShader(g.GL_VERTEX_SHADER, "sayder");
        const frag = try gl.loadShader(g.GL_FRAGMENT_SHADER, "sayder");

        var scene = Scene {
            .window = Window.init(title, 1024, 600),
            .boxes = ArrayList(Box).init(allocator),
            .program = try gl.Program.init(vert, frag),
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
        g.glViewport(0, 0, self.window.w, self.window.h);
        g.glClearColor(0.1, 0.12, 0.15, 1.0);
        g.glClear(g.GL_COLOR_BUFFER_BIT | g.GL_DEPTH_BUFFER_BIT);

        for (self.boxes.items) |box| {
            box.draw(self.window.renderer);
        }

        // c.SDL_RenderPresent(self.window.renderer);
        c.SDL_GL_SwapWindow(self.window.ptr);
    }
};

/// Holds a bunch of scenes, manages their shared state
pub const SceneBox = struct {
    allocator: Allocator,
    scenes: ArrayList(Scene),
    rand: std.rand.Random,
    shouldQuit: bool = false,

    pub fn init(allocator: Allocator, rand: std.rand.Random) SceneBox {
        return SceneBox {
            .allocator = allocator,
            .scenes = ArrayList(Scene).init(allocator),
            .rand = rand,
        };
    }
    pub fn deinit(self: *SceneBox) void {
        for (self.scenes.items) |scene| scene.deinit();
        self.scenes.deinit();
    }

    /// Gets a Scene index from an SDL window ID ; used for matching events to Scenes
    /// Returns an index so we can modify the list if need be
    fn getSceneIndexFromWindowId(self: *SceneBox, id: usize) !usize {
        for (self.scenes.items) |scene, i| {
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
                    const scene = &self.scenes.items[idx];
                    switch (event.window.event) {
                        c.SDL_WINDOWEVENT_CLOSE => {
                            scene.deinit();
                            _ = self.scenes.swapRemove(idx);
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
                        try self.scenes.items[0].addRandomBox(self.rand);
                    },
                    c.SDLK_w => {
                        self.scenes.items[0].removeRandomBox(self.rand);
                    },
                    c.SDLK_RETURN => {
                        try self.scenes.append(try Scene.init("Noot", self.allocator, self.rand));
                    },
                    else => {},
                },
                else => {},
            }
        }
    }

    pub fn run(self: *SceneBox) !void {
        try self.scenes.append(try Scene.init("Root", self.allocator, self.rand));

        while (!self.shouldQuit and self.scenes.items.len > 0) {
            // Input
            try self.handleInput();

            // Update
            const dt = 1.0 / 60.0;
            for (self.scenes.items) |*scene| {
                scene.update(dt);
            }

            // Render
            for (self.scenes.items) |*scene| {
                scene.render();
            }
        }
    }
};
