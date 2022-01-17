const c = @import("./sdl.zig").c;

const n_keys = 256;
const n_mouse_buttons = 6;

/// Represents the current state of an input key
/// high bit for "is key down"
/// low bit is for "was key pressed/released this frame"
const KeyState = enum(u2) {
    Released = 0b00,
    WentUp = 0b01,
    Held = 0b10,
    WentDown = 0b11,
};

pub const Input = struct {
    keys: [n_keys]KeyState = .{KeyState.Released} ** n_keys,

    /// Called at the start of each frame, before new input events are processed
    pub fn startFrame(self: *Input) void {
        for (self.keys) |*key| {
            key.* = @intToEnum(KeyState, @enumToInt(key.*) & 0b10);
        }
    }

    pub fn handleEvent(self: *Input, event: c.SDL_Event) void {
        switch (event.type) {
            c.SDL_KEYDOWN => {
                const idx = @intCast(usize, event.key.keysym.sym);
                if (idx < n_keys) {
                    self.keys[idx] = KeyState.WentDown;
                }
            },
            c.SDL_KEYUP => {
                const idx = @intCast(usize, event.key.keysym.sym);
                if (idx < n_keys) {
                    self.keys[idx] = KeyState.WentUp;
                }
            },
            else => {},
        }
    }

    // Polling funcs
    pub fn isKeyHeld(self: Input, key: u8) bool {
        return self.keys[key] & KeyState.Held;
    }
    pub fn wasKeyJustPressed(self: Input, key: u8) bool {
        return self.keys[key] == KeyState.WentDown;
    }
};
