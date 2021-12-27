const std = @import("std");
const logInfo = std.log.info;
const expect = std.testing.expect;
const expectEqual = std.testing.expectEqual;


fn fib(n: i32) i32 {
    if (n < 2) {
        return n;
    } else {
        return fib(n - 1) + fib(n - 2);
    }
}

test "fib test" {
    const cases = .{
        .{0, 0},
        .{1, 1},
        .{2, 1},
        .{3, 2},
        .{5, 5},
        .{7, 13},
        .{10, 55},
        .{12, 144},
    };
    inline for (cases) |case| {
        try expectEqual(fib(case[0]), case[1]);
    }
}

pub fn main() anyerror!void {
    const x: u32 = @as(u32, 5);
    const nums = [_]i32{0, 1, 2, 3, 5, 7, 10, 15, 20, 40};
    logInfo("All your codebase are belong to {d}.", .{x});
    for (nums) |n| {
        logInfo("fib({d}) = {d}", .{n, fib(n)});
    }
}

test "basic test" {
    try std.testing.expectEqual(10, 3 + 7);
}
