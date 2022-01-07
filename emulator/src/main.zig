const std = @import("std");
const sdl = @import("./sdl.zig");
const c = sdl.c;

const stack = @import("stack_calc.zig");
const util = @import("util.zig");
const Window = @import("window.zig").Window;

const Allocator = std.mem.Allocator;
const log = std.log.info;

const Box = struct {
    x: f32,
    y: f32,
    w: f32 = 60,
    h: f32 = 60,

    r: f32 = 224,
    g: f32 = 32,
    b: f32 = 32,

    fn new(x: f32, y:f32) Box {
        return Box { .x = x, .y = y };
    }

    fn draw(self: Box, renderer: ?*c.SDL_Renderer) void {
        var rect = c.SDL_Rect{
            .x = @floatToInt(c_int, self.x),
            .y = @floatToInt(c_int, self.y),
            .w = @floatToInt(c_int, self.w),
            .h = @floatToInt(c_int, self.h),
        };
        _ = c.SDL_SetRenderDrawColor(renderer,
            @floatToInt(u8, self.r),
            @floatToInt(u8, self.g),
            @floatToInt(u8, self.b),
            0xff);
        _ = c.SDL_RenderFillRect(renderer, &rect);
    }
};

fn addRandomBox(boxes: *std.ArrayList(Box), rand: std.rand.Random) !void {
    const x = rand.float(f32) * 800 + 20;
    const y = rand.float(f32) * 400 + 20;
    try boxes.append(Box.new(x, y));
}
fn removeRandomBox(boxes: *std.ArrayList(Box), rand: std.rand.Random) void {
    const idx = rand.int(u32) % boxes.items.len;
    _ = boxes.swapRemove(idx);
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var prng = std.rand.DefaultPrng.init(blk: {
        var seed: u64 = undefined;
        try std.os.getrandom(std.mem.asBytes(&seed));
        break :blk seed;
    });
    const rand = prng.random();

    sdl.init(sdl.Init.Video);
    defer sdl.quit();

    const window = Window.create(1024, 600);
    defer window.destroy();
    const renderer = window.renderer;

    var boxes = std.ArrayList(Box).init(allocator);
    defer boxes.deinit();

    var i: i32 = 0;
    while (i < 5) : (i += 1) {
        try addRandomBox(&boxes, rand);
    }

    var frame: usize = 0;
    mainloop: while (true) {
        var sdl_event: c.SDL_Event = undefined;
        while (c.SDL_PollEvent(&sdl_event) != 0) {
            switch (sdl_event.type) {
                c.SDL_QUIT => break :mainloop,
                c.SDL_KEYDOWN => {
                    switch (sdl_event.key.keysym.sym) {
                        c.SDLK_ESCAPE => break :mainloop,
                        c.SDLK_e => {
                            try addRandomBox(&boxes, rand);
                        },
                        c.SDLK_w => {
                            removeRandomBox(&boxes, rand);
                        },
                        else => {},
                    }
                },
                else => {},
            }
        }

        _ = c.SDL_SetRenderDrawColor(renderer, 0xff, 0xff, 0xff, 0xff);
        _ = c.SDL_RenderClear(renderer);

        for (boxes.items) |box| {
            box.draw(renderer);
        }

        c.SDL_RenderPresent(renderer);
        frame += 1;
    }
}

test {
    _ = stack;
    _ = util;
}
