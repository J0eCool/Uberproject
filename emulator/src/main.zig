const std = @import("std");
const net = @import("net");

const Allocator = std.mem.Allocator;
const log = std.log.info;
const expect = std.testing.expect;
const expectEqual = std.testing.expectEqual;

const Expr = union(enum) {
    literal: i32,
    binary: struct {
        op: []const u8,
        lhs: *Expr,
        rhs: *Expr,
    },
};

fn destroy(allocator: *Allocator, expr: *Expr) void {
    switch (expr.*) {
        .literal => {},
        .binary => |*e| {
            // recurse to the branches
            destroy(allocator, e.lhs);
            destroy(allocator, e.rhs);
        },
    }
    // release the memory for this Expr
    allocator.destroy(expr);
}

fn parse(allocator: *Allocator, input: []const u8) !*Expr {
    const stack_size = 100;
    var stack: [stack_size]?*Expr = [1]?*Expr{null}**stack_size;
    var stack_count: u32 = 0;

    var i: u32 = 0;
    while (i < input.len) : (i += 1) {
        switch (input[i]) {
            '0'...'9' => |c| {
                var next = try allocator.create(Expr);
                next.* = Expr { .literal = c - '0' };
                stack[stack_count] = next;
                stack_count += 1;
            },
            ' ' => {},
            else => {
                var next = try allocator.create(Expr);
                next.* = Expr { .binary = .{
                    .op = input[i..i+1],
                    .lhs = stack[stack_count-2].?,
                    .rhs = stack[stack_count-1].?,
                } };
                stack[stack_count-2] = next;
                stack_count -= 1;
            },
        }
    }
    return stack[stack_count-1].?;
}

const RuntimeError = error {
    UnknownOp,
};

fn eval(expr: *const Expr) RuntimeError!i32 {
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
    unreachable;
}

fn curl(addr: []const u8) !void {
    log("Curling {s}", .{addr});
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = &gpa.allocator();

    try curl("www.google.com");
    const ast = try parse(allocator, "2 4 + 5 -");
    defer destroy(allocator, ast);
    log("baba booey: {}", .{ast});
    log("baba booey: {}", .{eval(ast)});
}
