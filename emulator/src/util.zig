const std = @import("std");
const math = std.math;
const builtin = @import("builtin");

/// Wrapper for std.testing.expectEqual to avoid problems with imprecise type matching
/// see https://github.com/ziglang/zig/issues/4437
pub fn expectEqual(expected: anytype, actual: anytype) !void {
    try std.testing.expectEqual(@as(@TypeOf(actual), expected), actual);
}

const RoundingError = error {
    TooBig,
};

fn roundType(comptime from: type, comptime to: type) type {
    switch (@typeInfo(to)) {
        .Float, .ComptimeFloat => return to,
        .Int, .ComptimeInt =>
            switch (from) {
                f32, f64, f128, comptime_float => return RoundingError!to,
                else => @compileError("Unsupported integer rounding"),
            },
        else => @compileError("Unsupported rounding type"),
    }
}

test "util.roundType" {
    try expectEqual(RoundingError!i32, roundType(f32, i32));
    try expectEqual(RoundingError!i32, roundType(comptime_float, i32));
    try expectEqual(RoundingError!comptime_int, roundType(comptime_float, comptime_int));

    try expectEqual(f32, roundType(f32, f32));
    try expectEqual(comptime_float, roundType(comptime_float, comptime_float));
    try expectEqual(comptime_float, roundType(f32, comptime_float));
}

pub fn floor(comptime T: type, x: anytype) roundType(@TypeOf(x), T) {
    // this is similar to std.math.lossyCast
    const ret =
        if (@TypeOf(x) == comptime_float) math.floor(@as(f64, x))
        else math.floor(x);
    switch (@typeInfo(T)) {
        .Int => {
            if (ret > math.maxInt(T)) {
                return RoundingError.TooBig;
            }
            return @floatToInt(T, ret);
        },
        .Float => return @floatCast(T, ret),
        else => @compileError("Unsupported floor type"),
    }
}

test "util.floor" {
    try expectEqual(5, floor(i32, 5.5));
    try expectEqual(RoundingError.TooBig, floor(i32, 1e55));

    try expectEqual(f32, @TypeOf(floor(f32, 1.5)));
}

/// Reads a line of input from a reader; uses a buffer for storage but returns a slice (or null)
pub fn getLine(reader: anytype, buffer: []u8) !?[]const u8 {
    var line: []const u8 = (try reader.readUntilDelimiterOrEof(buffer, '\n')) orelse return null;
    if (builtin.os.tag == .windows) {
        line = std.mem.trimRight(u8, line, "\r");
    }
    return line;
}
