const c = @import("./sdl.zig").c;

pub const Vec2 = struct {
    x: f32,
    y: f32,

    pub fn init(x: f32, y: f32) Vec2 {
        return Vec2 { .x = x, .y = y };
    }

    // Vec-scalar ops
    pub fn scale(v: Vec2, s: f32) Vec2 {
        return Vec2 { .x = v.x*s, .y = v.y*s };
    }

    // Vec-vec ops
    pub fn add(a: Vec2, b: Vec2) Vec2 {
        return Vec2 { .x = a.x+b.x, .y = a.y+b.y };
    }
    pub fn sub(a: Vec2, b: Vec2) Vec2 {
        return Vec2 { .x = a.x-b.x, .y = a.y-b.y };
    }

    /// Dot product
    pub fn dot(a: Vec2, b: Vec2) f32 {
        return a.x*b.x + a.y*b.y;
    }
    /// Cross product
    pub fn cross(a: Vec2, b: Vec2) f32 {
        return a.x*b.y - a.y*b.x;
    }

    /// Magnitude
    pub fn len(v: Vec2) f32 {
        return @sqrt(v.dot(v));
    }
    /// Unit vector, or {0, 0} if magnitude is 0
    pub fn unit(v: Vec2) Vec2 {
        const m = v.len();
        if (m == 0) {
            return Vec2 { .x = 0, .y = 0 };
        }
        return Vec2 { .x = v.x/m, .y = v.y/m };
    }
};

pub const Color = struct {
    r: f32,
    g: f32,
    b: f32,

    pub fn init(r: f32, g: f32, b: f32) Color {
        return Color { .r = r, .g = g, .b = b };
    }
};

pub const Box = struct {
    pos: Vec2,
    vel: Vec2,
    size: Vec2,

    color: Color = Color.init(0.9, 0.1, 0.1),

    pub fn draw(self: Box, renderer: ?*c.SDL_Renderer) void {
        var rect = c.SDL_Rect{
            .x = @floatToInt(c_int, self.pos.x),
            .y = @floatToInt(c_int, self.pos.y),
            .w = @floatToInt(c_int, self.size.x),
            .h = @floatToInt(c_int, self.size.y),
        };
        _ = c.SDL_SetRenderDrawColor(renderer,
            @floatToInt(u8, 255 * self.color.r),
            @floatToInt(u8, 255 * self.color.g),
            @floatToInt(u8, 255 * self.color.b),
            0xff);
        _ = c.SDL_RenderFillRect(renderer, &rect);
    }
};
