// Scratch file for playing around with ideas
// This code may be totally unused beyond tests

const std = @import("std");
const math = std.math;

const util = @import("./util.zig");
const expectEqual = util.expectEqual;

const RoundingError = error {
    TooBig,
};

fn RoundType(comptime from: type, comptime to: type) type {
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

test "scratch.RoundType" {
    try expectEqual(RoundingError!i32, RoundType(f32, i32));
    try expectEqual(RoundingError!i32, RoundType(comptime_float, i32));
    try expectEqual(RoundingError!comptime_int, RoundType(comptime_float, comptime_int));

    try expectEqual(f32, RoundType(f32, f32));
    try expectEqual(comptime_float, RoundType(comptime_float, comptime_float));
    try expectEqual(comptime_float, RoundType(f32, comptime_float));
}

pub fn floor(comptime T: type, x: anytype) RoundType(@TypeOf(x), T) {
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

test "scratch.floor" {
    try expectEqual(5, floor(i32, 5.5));
    try expectEqual(RoundingError.TooBig, floor(i32, 1e55));

    try expectEqual(f32, @TypeOf(floor(f32, 1.5)));
}
