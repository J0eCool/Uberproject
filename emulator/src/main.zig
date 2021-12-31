const std = @import("std");
const builtin = @import("builtin");

const stack = @import("stack_calc.zig");

const Allocator = std.mem.Allocator;
const log = std.log.info;
const expect = std.testing.expect;
const expectEqual = std.testing.expectEqual;

fn getLine(reader: anytype, buffer: []u8) !?[]const u8 {
    var line: []const u8 = (try reader.readUntilDelimiterOrEof(buffer, '\n')) orelse return null;
    if (builtin.os.tag == .windows) {
        line = std.mem.trimRight(u8, line, "\r");
    }
    return line;
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = &gpa.allocator();

    const stdout = std.io.getStdOut();
    const writer = stdout.writer();
    const stdin = std.io.getStdIn();
    const reader = stdin.reader();

    var buffer: [1024]u8 = undefined;
    while (true) {
        _ = try writer.write("$> ");
        const line = (try getLine(reader, &buffer)).?;
        if (line.len == 0) {
            break;
        }
        const expr = try stack.parse(allocator, line);
        defer expr.destroy(allocator);
        try writer.print(" = {}\n", .{stack.eval(expr)});
    }
    _ = try writer.write("Finished.\n");
}
