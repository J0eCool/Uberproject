const std = @import("std");
const c = @import("./sdl.zig").c;

const stack = @import("./stack_calc.zig");
const Window = @import("./window.zig").Window;

const Input = @import("./input.zig").Input;

const Allocator = std.mem.Allocator;
const ArrayList = std.ArrayList;
const log = std.log.info;


/// External functions imported into a process
/// For now just assume that these are all statically provided by the system
pub const Imports = struct {
    loader: struct {
        self: *anyopaque,
        loadProgram: fn(self: *anyopaque, name: []const u8) void,
    },
};

/// Static info; a blueprint used to load processes
pub const Program = struct {
    init: fn(*Process) void,
    deinit: fn(*Process) void,
    update: fn(self: *Process, dt: f32) void,
    draw: fn(*Process) void,
};

/// Runtime representation of userland programs that run atop the kernel
pub const Process = struct {
    const Self = @This();
    /// Amount of stack memory to allocate per-process
    const stack_size = 64 * 1024;

    window: Window,
    vtable: Program,
    input: Input,
    allocator: Allocator,
    rand: std.rand.Random,
    imports: Imports,

    stack: [stack_size]u8 = [_]u8{0} ** stack_size,

    pub fn init(title: [*c]const u8, allocator: Allocator, rand: std.rand.Random,
            program: Program, imports: Imports) !Self {
        var process = Self {
            .window = Window.init(title, 1024, 600),
            .input = Input {},
            .vtable = program,
            .imports = imports,
            .allocator = allocator,
            .rand = rand,
        };
        process.vtable.init(&process);
        return process;
    }
    pub fn deinit(self: *Self) void {
        self.vtable.deinit(self);
        self.window.deinit();
    }

    pub fn update(self: *Self, dt: f32) void {
        self.vtable.update(self, dt);
    }

    pub fn render(self: *Self) void {
        self.vtable.draw(self);
    }

    /// Cast the data stored in the process' stack to a different type for ease of use
    pub fn getData(self: *Self, comptime DataT: type) *DataT {
        // TODO: investigate how this works so it doesn't explode maybe
        // specifically: is alignCast changing the alignment? dropping data?
        // overaligning the pointer? how does that point to the same stack then?
        return @ptrCast(*DataT, @alignCast(@alignOf(*usize), &self.stack));
    }
};
