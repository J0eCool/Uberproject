const std = @import("std");
const c = @import("./sdl.zig").c;
const gl = @import("./opengl.zig");

const util = @import("./util.zig");

const Allocator = std.mem.Allocator;

/// Holds a buffer of data that maps to a GL Texture
pub const Texture = struct {
    id: gl.Texture,
    w: i32,
    h: i32,
    buffer: []u8,
    allocator: Allocator,

    const Self = @This();

    pub fn init(allocator: Allocator, w: usize, h: usize) !Self {
        const buffer = try allocator.alloc(u8, 4*w*h);
        const id = gl.genTexture();
        const ret = Self {
            .id = id,
            .w = @intCast(i32, w),
            .h = @intCast(i32, h),
            .buffer = buffer,
            .allocator = allocator,
        };
        ret.bind();
        // idk if this matters, given we have uninitialized memory here?
        ret.sendData();

        // Set up texture parameters, min/mag filter, yada
        const filter = gl.NEAREST;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        return ret;
    }
    pub fn deinit(self: Self) void {
        self.allocator.free(self.buffer);
    }

    pub fn bind(self: Self) void {
        gl.bindTexture(gl.TEXTURE_2D, self.id);
    }

    // Sends data from RAM to the GPU
    pub fn sendData(self: Self) void {
        self.bind();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, self.w, self.h, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, self.buffer);
    }
};
