const std = @import("std");
const sdl = @import("./sdl.zig");
const c = sdl.c;

const scenes_mod = @import("scenes.zig");
const stack = @import("stack_calc.zig");
const util = @import("util.zig");
const Window = @import("window.zig").Window;

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const log = std.log.info;

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

    var scenes = scenes_mod.SceneBox.init(allocator, rand);
    defer scenes.deinit();
    try scenes.run();
}

test {
    _ = stack;
    _ = util;
}
