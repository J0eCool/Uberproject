/// Abstraction for an open Window to render to

const std = @import("std");
const c = @import("./sdl.zig").c;
const g = @import("./opengl.zig").c;

pub const Window = struct {
    ptr: ?*c.SDL_Window = null,
    renderer: ?*c.SDL_Renderer = null,
    glContext: ?*anyopaque = null,
    id: usize = 0,
    w: i32,
    h: i32,

    pub fn init(title: [*c]const u8, w: i32, h: i32) Window {
        var window = Window { .w = w, .h = h };
        const flags = c.SDL_WINDOW_RESIZABLE | c.SDL_WINDOW_OPENGL;
        window.ptr = c.SDL_CreateWindow(title, c.SDL_WINDOWPOS_CENTERED,
            c.SDL_WINDOWPOS_CENTERED, window.w, window.h, flags);
        errdefer c.SDL_DestroyWindow(window.ptr);
        window.id = c.SDL_GetWindowID(window.ptr);

        window.renderer = c.SDL_CreateRenderer(window.ptr, 0, c.SDL_RENDERER_PRESENTVSYNC);
        errdefer c.SDL_DestroyRenderer(window.renderer);

        window.glContext = c.SDL_GL_CreateContext(window.ptr);
        // g.loadExtensions();

        g.glEnable(g.GL_DEPTH_TEST);
        g.glDepthFunc(g.GL_LEQUAL);
        g.glEnable(g.GL_BLEND);
        g.glBlendFunc(g.GL_SRC_ALPHA, g.GL_ONE_MINUS_SRC_ALPHA);

        std.log.debug("Opened window \"{s}\" with id={}", .{title, window.id});
        return window;
    }

    pub fn deinit(self: Window) void {
        c.SDL_DestroyRenderer(self.renderer);
        c.SDL_DestroyWindow(self.ptr);
    }
};
