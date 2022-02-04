const std = @import("std");
const builtin = @import("builtin");

/// Wrapper for std.testing.expectEqual to avoid problems with imprecise type matching
/// see https://github.com/ziglang/zig/issues/4437
pub fn expectEqual(expected: anytype, actual: anytype) !void {
    try std.testing.expectEqual(@as(@TypeOf(actual), expected), actual);
}

/// Reads a line of input from a reader; uses a buffer for storage but returns a slice (or null)
pub fn getLine(reader: anytype, buffer: []u8) !?[]const u8 {
    var line: []const u8 = (try reader.readUntilDelimiterOrEof(buffer, '\n')) orelse return null;
    if (builtin.os.tag == .windows) {
        line = std.mem.trimRight(u8, line, "\r");
    }
    return line;
}

/// For those times when you just want to do something N times in a for loop
pub fn times(n: usize) []const u0 {
    return @as([*]u0, undefined)[0..n];
}

test "util.times" {
    var x: usize = 0;
    var y: usize = 0;
    for (times(10)) |_, i| {
        x += 1;
        y += i;
    }
    try expectEqual(10, x);
    try expectEqual(45, y);
}

pub fn readWholeFile(allocator: std.mem.Allocator, rel_path: []const u8) ![:0]u8 {
    // var path_buffer: [std.fs.MAX_PATH_BYTES]u8 = undefined;
    var path_buffer = [_]u8{0} ** std.fs.MAX_PATH_BYTES;
    const path = try std.fs.realpath(rel_path, &path_buffer);
    errdefer std.log.err("readWholeFile error, abspath was {s}", .{path});
    const file = try std.fs.openFileAbsolute(path, .{});
    return try file.readToEndAllocOptions(allocator, 1024*1024, null, @alignOf(u8), 0);
}

pub fn lerp(t: f32, lo: f32, hi: f32) f32 {
    const t0 = std.math.clamp(t, 0, 1);
    return (1 - t0) * lo + t0 * hi;
}

test "util.lerp" {
    // boundary conditions
    try expectEqual(5, lerp(0, 5, 15));
    try expectEqual(15, lerp(1, 5, 15));

    // clamp lerp to either end
    try expectEqual(10, lerp(1.5, 2, 10));

    try expectEqual(10, lerp(0.5, 5, 15));
}
