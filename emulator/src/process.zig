const std = @import("std");
const c = @import("./sdl.zig").c;

const stack = @import("./stack_calc.zig");
const util = @import("./util.zig");
const Window = @import("./window.zig").Window;

const gfx = @import("./graphics.zig");
const Input = @import("./input.zig").Input;
const Vec2 = @import("./vec.zig").Vec2;

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const log = std.log.info;

const BoxList = ArrayList(gfx.Box);

pub const Imports = struct {
    loader: struct {
        self: *anyopaque,
        loadProgram: fn(self: *anyopaque, name: []const u8) void,
    },
};

/// Runtime representation of userland programs that run atop the kernel
pub const Process = struct {
    const Self = @This();
    pub const Info = struct {
        update: fn(self: *Self, dt: f32) void,
        // draw: fn(Self) void,
    };

    window: Window,
    boxes: BoxList,
    vtable: Info,
    input: Input,
    rand: std.rand.Random,
    imports: Imports,

    pub fn init(title: [*c]const u8, allocator: Allocator, rand: std.rand.Random,
            program: Info, imports: Imports) !Self {
        var scene = Self {
            .window = Window.init(title, 1024, 600),
            .boxes = BoxList.init(allocator),
            .input = Input {},
            .vtable = program,
            .imports = imports,
            .rand = rand,
        };
        for (util.times(5)) |_| {
            try scene.addRandomBox(rand);
        }
        return scene;
    }
    pub fn deinit(self: Self) void {
        self.boxes.deinit();
        self.window.deinit();
    }

    pub fn addRandomBox(self: *Self, rand: std.rand.Random) !void {
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
    pub fn removeRandomBox(self: *Self, rand: std.rand.Random) void {
        if (self.boxes.items.len == 0) {
            return;
        }
        const idx = rand.int(u32) % self.boxes.items.len;
        _ = self.boxes.swapRemove(idx);
    }

    pub fn update(self: *Self, dt: f32) void {
        self.vtable.update(self, dt);
    }

    pub fn render(self: Self) void {
        _ = c.SDL_SetRenderDrawColor(self.window.renderer, 0x10, 0x10, 0x10, 0xff);
        _ = c.SDL_RenderClear(self.window.renderer);

        for (self.boxes.items) |box| {
            box.draw(self.window.renderer);
        }

        c.SDL_RenderPresent(self.window.renderer);
    }
};
