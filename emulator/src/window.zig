/// Abstraction for an open Window to render to

const c = @import("./sdl.zig").c;

pub const Window = struct {
    ptr: ?*c.SDL_Window = null,
    renderer: ?*c.SDL_Renderer = null,
    w: i32,
    h: i32,

    pub fn init(title: [*c]const u8, w: i32, h: i32) Window {
        var window = Window { .w = w, .h = h };
        const flags = c.SDL_WINDOW_RESIZABLE;
        window.ptr = c.SDL_CreateWindow(title, c.SDL_WINDOWPOS_CENTERED,
            c.SDL_WINDOWPOS_CENTERED, window.w, window.h, flags);
        errdefer c.SDL_DestroyWindow(window.ptr);

        window.renderer = c.SDL_CreateRenderer(window.ptr, 0, c.SDL_RENDERER_PRESENTVSYNC);
        return window;
    }

    pub fn deinit(self: Window) void {
        c.SDL_DestroyRenderer(self.renderer);
        c.SDL_DestroyWindow(self.ptr);
    }
};
