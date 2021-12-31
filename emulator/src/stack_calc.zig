const std = @import("std");

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;

pub const Expr = union(enum) {
    literal: i32,
    binary: struct {
        op: []const u8,
        lhs: *Expr,
        rhs: *Expr,
    },

    pub fn destroy(expr: *Expr, allocator: *Allocator) void {
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

pub fn parse(allocator: *Allocator, input: []const u8) !*Expr {
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
    return stack.items[stack.items.len-1];
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
