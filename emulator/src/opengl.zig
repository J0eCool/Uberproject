// An OpenGL wrapper

const std = @import("std");

pub const c = @cImport({
    @cInclude("glew.h");
});

pub const int = c.GLint;
pub const uint = c.GLuint;

pub const VERTEX_SHADER = c.GL_VERTEX_SHADER;
pub const FRAGMENT_SHADER = c.GL_FRAGMENT_SHADER;

pub const DEPTH_TEST = c.GL_DEPTH_TEST;
pub const LEQUAL = c.GL_LEQUAL;
pub const BLEND = c.GL_BLEND;
pub const SRC_ALPHA = c.GL_SRC_ALPHA;
pub const ONE_MINUS_SRC_ALPHA = c.GL_ONE_MINUS_SRC_ALPHA;

pub const COLOR_BUFFER_BIT = c.GL_COLOR_BUFFER_BIT;
pub const DEPTH_BUFFER_BIT = c.GL_DEPTH_BUFFER_BIT;

pub const Shader = uint;

pub fn glewInit() !void {
    const err = c.glewInit();
    if (err != c.GLEW_OK) {
        return error.GlewInitFailed;
    }
}

/// Load a shader represented by the text given
/// kind == GL_VERTEX_SHADER or GL_FRAGMENT_SHADER
pub fn loadShader(kind: c.GLenum, source: []const u8) !Shader {
    const result = createShader(kind);
    c.__glewShaderSource.?(result, 1, @ptrCast([*c]const[*c]const u8, &source), null);
    c.__glewCompileShader.?(result);

    // Print error message when things go wrong
    var success: c.GLint = 1;
    getShaderiv(result, c.GL_COMPILE_STATUS, &success);
    if (success == 0) {
        var length: c.GLint = 0;
        getShaderiv(result, c.GL_INFO_LOG_LENGTH, &length);
        var buffer = [_]u8{ 0 } ** 1024;
        if (length > buffer.len) {
            return error.ErrorMessageTooLong;
        }
        c.__glewGetShaderInfoLog.?(result, length, null, @ptrCast([*c]u8, &buffer[0]));
        std.log.err("Error loading shader: {s}", .{buffer});
        return error.ShaderFailedToLoad;
    }

    return result;
}

/// Wrapper for shader programs
pub const Program = struct {
    id: c.GLuint,
    vert_uniforms: [16]c.GLint = [_]c.GLint{-1} ** 16,
    frag_uniforms: [16]c.GLint = [_]c.GLint{-1} ** 16,

    /// Loads a program from two loaded shaders
    pub fn init(vert: Shader, frag: Shader) !Program {
        const result = Program { .id = c.__glewCreateProgram.?() };
        c.__glewAttachShader.?(result.id, vert);
        c.__glewAttachShader.?(result.id, frag);
        c.__glewLinkProgram.?(result.id);
        c.__glewDetachShader.?(result.id, vert);
        c.__glewDetachShader.?(result.id, frag);

        // Print error message when things go wrong
        var success: c.GLint = 1;
        getProgramiv(result.id, c.GL_LINK_STATUS, &success);
        if (success == 0) {
            var length: c.GLint = 0;
            getProgramiv(result.id, c.GL_INFO_LOG_LENGTH, &length);
            var buffer = [_]u8{ 0 } ** 1024;
            if (length > buffer.len) {
                return error.ErrorMessageTooLong;
            }
            c.__glewGetProgramInfoLog.?(result.id, length, null, @ptrCast([*c]u8, &buffer[0]));
            std.log.err("Error loading program: {s}", .{buffer});
            return error.ProgramFailedToLoad;
        }

        return result;
    }
};

//------------------------------------------------------------------------------
// uncategorized

pub fn viewport(x: i32, y: i32, w: i32, h: i32) void {
    c.glViewport(x, y, w, h);
}
pub fn enable(thing: uint) void {
    c.glEnable(thing);
}
pub fn depthFunc(thing: uint) void {
    c.glDepthFunc(thing);
}
pub fn blendFunc(src: uint, dest: uint) void {
    c.glBlendFunc(src, dest);
}
pub fn clearColor(r: f32, g: f32, b: f32, a: f32) void {
    c.glClearColor(r, g, b, a);
}
pub fn clear(flags: uint) void {
    c.glClear(flags);
}

//------------------------------------------------------------------------------
// Buffers

pub const Buffer = uint;
pub const ARRAY_BUFFER = c.GL_ARRAY_BUFFER;

pub fn genBuffers(n: i32) Buffer {
    var id: uint = undefined;
    c.glGenBuffers(n, &id);
    return id;
}
pub fn bindBuffer(kind: uint, id: Buffer) void {
    c.glBindBuffer(kind, id);
}
pub fn bufferData(comptime T: type, kind: uint, data: []T, draw_kind: uint) void {
    c.glBufferData(kind, data.len * @sizeOf(T), &data[0], draw_kind);
}

//------------------------------------------------------------------------------
// Shader Loading

pub fn createShader(kind: uint) Shader {
    return c.__glewCreateShader.?(kind);
}
pub fn getShaderiv(shader: Shader, info: uint, result: *int) void {
    c.__glewGetShaderiv.?(shader, info, result);
}
pub fn getProgramiv(program: uint, info: uint, result: *int) void {
    c.__glewGetProgramiv.?(program, info, result);
}
