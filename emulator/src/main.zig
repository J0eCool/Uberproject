const std = @import("std");
const sdl = @import("./sdl.zig");
const c = sdl.c;

const Kernel = @import("kernel.zig").Kernel;
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

    var kernel = try Kernel.init(allocator, rand);
    defer kernel.deinit();
    try kernel.run();
}

test {
    _ = @import("tests.zig");
}
