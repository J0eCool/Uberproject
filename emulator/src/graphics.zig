const c = @import("./sdl.zig").c;
const Vec2 = @import("./vec.zig").Vec2;

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
