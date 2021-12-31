const std = @import("std");
const net = @import("net");

const stack = @import("stack_calc.zig");

const Allocator = std.mem.Allocator;
const log = std.log.info;
const expect = std.testing.expect;
const expectEqual = std.testing.expectEqual;

fn curl(addr: []const u8) !void {
    log("Curling {s}", .{addr});
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = &gpa.allocator();

    try curl("www.google.com");
    const ast = try stack.parse(allocator, "2 4 + 5 -");
    defer ast.destroy(allocator);
    log("baba booey: {}", .{ast});
    log("baba booey: {}", .{stack.eval(ast)});
}
