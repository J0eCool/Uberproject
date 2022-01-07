/// Abstraction for an open Window to render to

const c = @import("./sdl.zig").c;

pub const Window = struct {
    ptr: ?*c.SDL_Window = null,
    renderer: ?*c.SDL_Renderer = null,
    w: i32,
    h: i32,

    pub fn create(w: i32, h: i32) Window {
        var window = Window { .w = w, .h = h };
        window.ptr = c.SDL_CreateWindow("Em you later", c.SDL_WINDOWPOS_CENTERED,
            c.SDL_WINDOWPOS_CENTERED, window.w, window.h, 0);
        errdefer c.SDL_DestroyWindow(window.ptr);

        window.renderer = c.SDL_CreateRenderer(window.ptr, 0, c.SDL_RENDERER_PRESENTVSYNC);
        return window;
    }

    pub fn destroy(self: Window) void {
        c.SDL_DestroyRenderer(self.renderer);
        c.SDL_DestroyWindow(self.ptr);
    }
};
