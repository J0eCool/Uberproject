// An OpenGL wrapper

const std = @import("std");

pub const c = @cImport({
    @cInclude("glew.h");
});

pub const Int = c.GLint;
pub const Uint = c.GLuint;
pub const Sizei = c.GLint;

pub const VERTEX_SHADER = c.GL_VERTEX_SHADER;
pub const FRAGMENT_SHADER = c.GL_FRAGMENT_SHADER;

pub const DEPTH_TEST = c.GL_DEPTH_TEST;
pub const LEQUAL = c.GL_LEQUAL;
pub const BLEND = c.GL_BLEND;
pub const SRC_ALPHA = c.GL_SRC_ALPHA;
pub const ONE_MINUS_SRC_ALPHA = c.GL_ONE_MINUS_SRC_ALPHA;

pub const COLOR_BUFFER_BIT = c.GL_COLOR_BUFFER_BIT;
pub const DEPTH_BUFFER_BIT = c.GL_DEPTH_BUFFER_BIT;

pub const Shader = Uint;

pub const FLOAT = c.GL_FLOAT;
pub const UNSIGNED_BYTE = c.GL_UNSIGNED_BYTE;

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
    try compileShader(result, source);
    return result;
}

pub fn compileShader(shader: Shader, source: []const u8) !void {
    c.__glewShaderSource.?(shader, 1, @ptrCast([*c]const[*c]const u8, &source), null);
    c.__glewCompileShader.?(shader);

    // Print error message when things go wrong
    var success: c.GLint = 1;
    getShaderiv(shader, c.GL_COMPILE_STATUS, &success);
    if (success == 0) {
        var length: c.GLint = 0;
        getShaderiv(shader, c.GL_INFO_LOG_LENGTH, &length);
        var buffer = [_]u8{ 0 } ** 1024;
        if (length > buffer.len) {
            return error.ErrorMessageTooLong;
        }
        c.__glewGetShaderInfoLog.?(shader, length, null, @ptrCast([*c]u8, &buffer[0]));
        std.log.err("Error loading shader: {s}", .{buffer});
        return error.ShaderFailedToLoad;
    }
}

/// Wrapper for shader programs
pub const Program = struct {
    id: c.GLuint,
    vert: Shader,
    frag: Shader,
    vert_uniforms: [16]Int = [_]Int{-1} ** 16,
    frag_uniforms: [16]Int = [_]Int{-1} ** 16,

    /// Loads a program from two loaded shaders
    pub fn init(vert: Shader, frag: Shader) !Program {
        const result = Program {
            .id = c.__glewCreateProgram.?(),
            .vert = vert,
            .frag = frag,
        };
        try result.link();
        return result;
    }

    pub fn use(self: Program) void {
        c.__glewUseProgram.?(self.id);
    }

    pub fn link(self: Program) !void {
        c.__glewAttachShader.?(self.id, self.vert);
        c.__glewAttachShader.?(self.id, self.frag);
        c.__glewLinkProgram.?(self.id);
        c.__glewDetachShader.?(self.id, self.vert);
        c.__glewDetachShader.?(self.id, self.frag);

        // Print error message when things go wrong
        var success: Int = 1;
        getProgramiv(self.id, c.GL_LINK_STATUS, &success);
        if (success == 0) {
            var length: Int = 0;
            getProgramiv(self.id, c.GL_INFO_LOG_LENGTH, &length);
            var buffer = [_]u8{ 0 } ** 1024;
            if (length > buffer.len) {
                return error.ErrorMessageTooLong;
            }
            c.__glewGetProgramInfoLog.?(self.id, length, null, @ptrCast([*c]u8, &buffer[0]));
            std.log.err("Error loading program: {s}", .{buffer});
            return error.ProgramFailedToLoad;
        }
    }

    pub fn getAttribLocation(self: Program, attrib: []const u8) Uint {
        const ret = c.__glewGetAttribLocation.?(self.id, @ptrCast([*c]const u8, attrib));
        // TODO: check error code
        return @intCast(Uint, ret);
    }

    pub fn getUniformLocation(self: Program, name: []const u8) Int {
        return c.__glewGetUniformLocation.?(self.id, @ptrCast([*c]const u8, name));
    }

    /// Sets a shader uniform with a particular name
    pub fn uniform1f(self: Program, name: []const u8, x: f32) void {
        c.__glewUniform1f.?(self.getUniformLocation(name), x);
    }
    /// Sets a shader uniform, similar to `uniform1f`
    pub fn uniform2f(self: Program, name: []const u8, x: f32, y: f32) void {
        c.__glewUniform2f.?(self.getUniformLocation(name), x, y);
    }
    /// Sets a shader uniform, similar to `uniform1f`
    pub fn uniform3f(self: Program, name: []const u8, x: f32, y: f32, z: f32) void {
        c.__glewUniform3f.?(self.getUniformLocation(name), x, y, z);
    }
};

//------------------------------------------------------------------------------
// uncategorized

/// Sets up the GL viewport.
/// The viewport can be used to split the rendering window into multiple sub-views
/// ... maybe? https://gamedev.stackexchange.com/questions/147522/what-is-glviewport-for-and-why-it-is-not-necessary-sometimes
pub fn viewport(x: i32, y: i32, w: i32, h: i32) void {
    c.glViewport(x, y, w, h);
}
pub fn enable(thing: Uint) void {
    c.glEnable(thing);
}
pub fn depthFunc(thing: Uint) void {
    c.glDepthFunc(thing);
}
pub fn blendFunc(src: Uint, dest: Uint) void {
    c.glBlendFunc(src, dest);
}
pub fn clearColor(r: f32, g: f32, b: f32, a: f32) void {
    c.glClearColor(r, g, b, a);
}
pub fn clear(flags: Uint) void {
    c.glClear(flags);
}

//------------------------------------------------------------------------------
// Buffers

/// VBO
pub const Buffer = Uint;
/// VAO
pub const VertexArray = Uint;

pub const ARRAY_BUFFER = c.GL_ARRAY_BUFFER;

pub const STATIC_DRAW = c.GL_STATIC_DRAW;

pub const TRIANGLES = c.GL_TRIANGLES;

/// Generate a single buffer
pub fn genBuffer() Buffer {
    var vbo: Uint = undefined;
    c.__glewGenBuffers.?(1, &vbo);
    return vbo;
}
pub fn bindBuffer(kind: Uint, vbo: Buffer) void {
    c.__glewBindBuffer.?(kind, vbo);
}
pub fn bufferData(comptime T: type, kind: Uint, data: []const T, draw_kind: Uint) void {
    c.__glewBufferData.?(kind, @intCast(c_longlong, data.len * @sizeOf(T)), &data[0], draw_kind);
}

pub fn genVertexArray() VertexArray {
    var vao: Uint = undefined;
    c.__glewGenVertexArrays.?(1, &vao);
    return vao;
}
pub fn bindVertexArray(vao: VertexArray) void {
    c.__glewBindVertexArray.?(vao);
}
pub fn enableVertexAttribArray(loc: Uint) void {
    c.__glewEnableVertexAttribArray.?(loc);
}
pub fn drawArrays(kind: Uint, start: Int, num: Int) void {
    c.glDrawArrays(kind, start, num);
}

pub fn vertexAttribPointer(index: Uint, size: Int, ty: Uint,
        normalized: c.GLboolean, stride: Sizei, offset: usize) void {
    c.__glewVertexAttribPointer.?(index, size, ty, normalized, stride,
        @intToPtr(?*const anyopaque, offset));
}

//------------------------------------------------------------------------------
// Shader Loading

/// Creates an empty shader object
/// Is undone by `deleteShader`
pub fn createShader(kind: Uint) Shader {
    return c.__glewCreateShader.?(kind);
}

/// Free the memory and invalidate the name associated with a specific shader
/// Undoes `createShader`
/// Will not delete a shader until it is no longer attached to a GL Program
pub fn deleteShader(shader: Shader) void {
    c.__glewDeleteShader.?(shader);
}

pub fn getShaderiv(shader: Shader, info: Uint, result: *Int) void {
    c.__glewGetShaderiv.?(shader, info, result);
}
pub fn getProgramiv(program: Uint, info: Uint, result: *Int) void {
    c.__glewGetProgramiv.?(program, info, result);
}

//------------------------------------------------------------------------------
// Textures

pub const Texture = Uint;

pub const TEXTURE_2D = c.GL_TEXTURE_2D;

pub const NEAREST = c.GL_NEAREST;
pub const LINEAR = c.GL_LINEAR;

pub const TEXTURE_MIN_FILTER = c.GL_TEXTURE_MIN_FILTER;
pub const TEXTURE_MAG_FILTER = c.GL_TEXTURE_MAG_FILTER;
pub const TEXTURE_WRAP_S = c.GL_TEXTURE_WRAP_S;
pub const TEXTURE_WRAP_T = c.GL_TEXTURE_WRAP_T;
pub const CLAMP_TO_EDGE = c.GL_CLAMP_TO_EDGE;

pub const RGBA = c.GL_RGBA;

pub fn genTexture() Texture {
    var id: Texture = undefined;
    c.glGenTextures(1, &id);
    return id;
}

pub fn bindTexture(target: Uint, id: Texture) void {
    c.glBindTexture(target, id);
}

/// Passes texture data to the GPU
/// `target` - texture target, e.g. TEXTURE_2D
/// `format` - format of the pixel data (e.g. RGB)
/// `ty` - (aka "type") type of pixel data (e.g. UNSIGNED_BYTE)
/// `data` - the data in question
/// see: https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/glTexImage2D.xhtml
pub fn texImage2D(target: Uint, level: Int, internal: Int,
        width: Sizei, height: Sizei, border: Int, format: Uint,
        ty: Uint, data: []const u8) void {
    c.glTexImage2D(target, level, internal, width, height, border, format, ty,
        @ptrCast(*const anyopaque, data));
}

pub fn texParameteri(target: Uint, param: Uint, val: Int) void {
    c.glTexParameteri(target, param, val);
}
