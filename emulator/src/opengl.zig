// An OpenGL wrapper

const std = @import("std");

pub const c = @cImport({
    @cInclude("epoxy/gl.h");
});

pub const Shader = c.GLuint;

/// Load a shader represented by the text given
/// kind == GL_VERTEX_SHADER or GL_FRAGMENT_SHADER
pub fn loadShader(kind: c.GLenum, source: []const u8) !Shader {
    const result = c.glCreateShader(kind);
    c.glShaderSource(result, 1, @ptrCast([*c]const[*c]const u8, &source), null);
    c.glCompileShader(result);

    // Print error message when things go wrong
    var success: c.GLint = 1;
    c.glGetShaderiv(result, c.GL_COMPILE_STATUS, &success);
    if (success == 0) {
        var length: c.GLint = 0;
        c.glGetShaderiv(result, c.GL_INFO_LOG_LENGTH, &length);
        var buffer = [_]u8{ 0 } ** 1024;
        if (length > buffer.len) {
            return error.ErrorMessageTooLong;
        }
        c.glGetShaderInfoLog(result, length, null, @ptrCast([*c]u8, &buffer[0]));
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
        const result = Program { .id = c.glCreateProgram() };
        c.glAttachShader(result.id, vert);
        c.glAttachShader(result.id, frag);
        c.glLinkProgram(result.id);
        c.glDetachShader(result.id, vert);
        c.glDetachShader(result.id, frag);

        // Print error message when things go wrong
        var success: c.GLint = 1;
        c.glGetProgramiv(result.id, c.GL_LINK_STATUS, &success);
        if (success == 0) {
            var length: c.GLint = 0;
            c.glGetProgramiv(result.id, c.GL_INFO_LOG_LENGTH, &length);
            var buffer = [_]u8{ 0 } ** 1024;
            if (length > buffer.len) {
                return error.ErrorMessageTooLong;
            }
            c.glGetProgramInfoLog(result.id, length, null, @ptrCast([*c]u8, &buffer[0]));
            std.log.err("Error loading program: {s}", .{buffer});
            return error.ProgramFailedToLoad;
        }

        return result;
    }
};
