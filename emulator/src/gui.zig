const gl = @import("./opengl.zig");
const input = @import("./input.zig");

const vec = @import("./vec.zig");
const Vec2 = vec.Vec2;

pub const Gui = struct {
    input: *input.Input,

    program: gl.Program = undefined,

    rect_vbo: gl.Buffer = undefined,
    rect_vao: gl.VertexArray = undefined,
    pos_loc: gl.Uint = undefined,

    cursor: Vec2,
    default_cursor: Vec2,

    pub fn init(in: *input.Input) Gui {
        const default_cursor = Vec2.init(30, 30);
        var self = Gui {
            .input = in,
            .cursor = default_cursor,
            .default_cursor = default_cursor,
        };
        const vert = gl.loadShader(gl.VERTEX_SHADER, Gui.vert_shader) catch unreachable;
        const frag = gl.loadShader(gl.FRAGMENT_SHADER, frag_shader) catch unreachable;
        self.program = gl.Program.init(vert, frag) catch unreachable;

        self.rect_vbo = gl.genBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self.rect_vbo);
        const box_verts = [_]f32{
            0.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            1.0, 1.0, 0.0,
        };
        gl.bufferData(f32, gl.ARRAY_BUFFER, box_verts[0..], gl.STATIC_DRAW);
        self.rect_vao = gl.genVertexArray();
        gl.bindVertexArray(self.rect_vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, self.rect_vbo); // technically it's already bound
        self.pos_loc = self.program.getAttribLocation("aPos");
        gl.enableVertexAttribArray(self.pos_loc);
        gl.c.__glewVertexAttribPointer.?(self.pos_loc,
            3, gl.c.GL_FLOAT, gl.c.GL_FALSE, 3 * @sizeOf(f32), null);

        return self;
    }
    pub fn button(self: Gui) bool {
        _ = self;
        return false;
    }
    pub fn draw(self: Gui) void {
        _ = self;
    }

    const vert_shader =
        \\attribute vec3 aPos;
        \\
        \\uniform vec3 uPos;
        \\uniform vec2 uScale;
        \\
        \\varying vec2 vPos;
        \\
        \\void main() {
        \\    vec3 pos = aPos*vec3(uScale, 1) + uPos;
        \\    vPos = pos;
        \\    gl_Position = vec4(pos, 1.0);
        \\}
        ;
    const frag_shader =
        \\precision mediump float;
        \\
        \\//uniform vec4 uColor;
        \\
        \\void main() {
        \\    gl_FragColor = vec4(1, 1, 1, 1);
        \\}
        ;
    };
