const std = @import("std");

const util = @import("util.zig");
const expectEqual = util.expectEqual;

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;

pub const Expr = union(enum) {
    literal: i32,
    binary: struct {
        op: []const u8,
        lhs: *Expr,
        rhs: *Expr,
    },

    pub fn destroy(expr: *Expr, allocator: *const Allocator) void {
        switch (expr.*) {
            .literal => {},
            .binary => |*e| {
                // recurse to the branches
                e.lhs.destroy(allocator);
                e.rhs.destroy(allocator);
            },
        }
        // release the memory for this Expr
        allocator.destroy(expr);
    }
};

pub fn parse(allocator: *const Allocator, input: []const u8) !*Expr {
    var stack = ArrayList(*Expr).init(allocator.*);
    defer stack.deinit();

    var i: u32 = 0;
    while (i < input.len) : (i += 1) {
        switch (input[i]) {
            '0'...'9' => |c| {
                var next = try allocator.create(Expr);
                next.* = Expr { .literal = c - '0' };
                try stack.append(next);
            },
            ' ' => {},
            else => {
                var next = try allocator.create(Expr);
                const rhs = stack.pop();
                const lhs = stack.pop();
                next.* = Expr { .binary = .{
                    .op = input[i..i+1],
                    .lhs = lhs,
                    .rhs = rhs,
                } };
                try stack.append(next);
            },
        }
    }
    return stack.pop();
}

pub const RuntimeError = error {
    UnknownOp,
};

pub fn eval(expr: *const Expr) RuntimeError!i32 {
    switch (expr.*) {
        .literal => |val| return val,
        .binary => |e| {
            const lhs = try eval(e.lhs);
            const rhs = try eval(e.rhs);
            if (std.mem.eql(u8, e.op, "+")) {
                return lhs + rhs;
            }
            if (std.mem.eql(u8, e.op, "-")) {
                return lhs - rhs;
            }
            return RuntimeError.UnknownOp;
        },
    }
}

fn exec(allocator: *const Allocator, input: []const u8) !i32 {
    const expr = try parse(allocator, input);
    defer expr.destroy(allocator);
    return eval(expr);
}

pub fn repl(allocator: *const Allocator) !void {
    const stdout = std.io.getStdOut();
    const writer = stdout.writer();
    const stdin = std.io.getStdIn();
    const reader = stdin.reader();

    var buffer: [1024]u8 = undefined;
    while (true) {
        _ = try writer.write("$> ");
        const line = (try util.getLine(reader, &buffer)) orelse break;
        if (line.len == 0) {
            break;
        }
        const expr = try parse(allocator, line);
        defer expr.destroy(allocator);
        try writer.print(" = {}\n", .{eval(expr)});
    }
    _ = try writer.write("Finished.\n");
}

test "stack_calc tests" {
    const allocator = &std.testing.allocator;
    try expectEqual(2, exec(allocator, "1 1 +"));
    try expectEqual(RuntimeError.UnknownOp, exec(allocator, "2 2 *"));
}
