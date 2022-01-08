// An SDL wrapper written by hand mostly so that ZLS can give me autocomplete info

/// Shared c import of SDL.h, reuse this so Zig knows the C opaque types match each other
/// across compilation units
pub const c = @cImport({
    @cInclude("SDL.h");
});

/// Flags for SDL_Init
pub const Init = enum(c_uint) {
    Video = c.SDL_INIT_VIDEO,
    Audio = c.SDL_INIT_AUDIO,
};

/// SDL_Init
pub fn init(flags: Init) void {
    _ = c.SDL_Init(@enumToInt(flags));
}

/// SDL_Quit
pub fn quit() void {
    c.SDL_Quit();
}

// pub const Window = c.SDL_Window;

// pub fn createWindow(title: [*c]const u8, posX: i32, posY: i32, w: i32, h: i32, xx: i32) *Window {
//     return c.SDL_CreateWindow(title, posX, posY, w, h, xx);
// }
