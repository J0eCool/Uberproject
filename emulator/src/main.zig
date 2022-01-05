const std = @import("std");

const stack = @import("stack_calc.zig");
const util = @import("util.zig");

const Allocator = std.mem.Allocator;
const log = std.log.info;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = &gpa.allocator();
    try stack.repl(allocator);
}

test {
    _ = stack;
    _ = util;
}
