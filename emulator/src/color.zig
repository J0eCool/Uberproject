const util = @import("./util.zig");
const Vec3 = @import("./vec.zig").Vec3;

/// A color in the RGB color space
/// Colors are stored as values between 0 and 1
/// Can be used to interop with OpenGL
pub const RGB = packed struct {
    r: f32,
    g: f32,
    b: f32,

    pub fn init(r: f32, g: f32, b: f32) RGB {
        return RGB { .r = r, .g = g, .b = b };
    }

    /// Converts a color from RGB to HSV
    pub fn toHSV(c: RGB) HSV {
        const cmax = @maximum(c.r, @maximum(c.g, c.b));
        const cmin = @minimum(c.r, @minimum(c.g, c.b));
        const dc = cmax - cmin;
        const h =
            if (dc == 0.0)
                0.0
            else if (cmax == c.r)
                60*@mod((c.g - c.b)/dc, 6)
            else if (cmax == c.g)
                60*((c.b - c.r)/dc + 2)
            else //  cmax == c.b
                60*((c.r - c.g)/dc + 4);
        const s =
            if (cmax == 0.0) 0.0
            else dc/cmax;
        const v = cmax;
        return HSV.init(h, s, v);
    }
};

/// A color in the HSV color space
pub const HSV = struct {
    h: f32,
    s: f32,
    v: f32,

    pub fn init(h: f32, s: f32, v: f32) HSV {
        return HSV { .h = h, .s = s, .v = v };
    }
};


test "RGB.toHSV()" {
    // Fully-saturated monochromatic
    try util.expectEqual(RGB.init(1.0, 0, 0).toHSV(), HSV.init(  0, 1, 1.0));
    try util.expectEqual(RGB.init(0, 1.0, 0).toHSV(), HSV.init(120, 1, 1.0));
    try util.expectEqual(RGB.init(0, 0, 1.0).toHSV(), HSV.init(240, 1, 1.0));
    try util.expectEqual(RGB.init(0.5, 0, 0).toHSV(), HSV.init(  0, 1, 0.5));
    try util.expectEqual(RGB.init(0, 0.5, 0).toHSV(), HSV.init(120, 1, 0.5));
    try util.expectEqual(RGB.init(0, 0, 0.5).toHSV(), HSV.init(240, 1, 0.5));

    // Grays (0% saturation)
    try util.expectEqual(RGB.init(0.0, 0.0, 0.0).toHSV(), HSV.init(0, 0, 0.0));
    try util.expectEqual(RGB.init(0.2, 0.2, 0.2).toHSV(), HSV.init(0, 0, 0.2));
    try util.expectEqual(RGB.init(0.5, 0.5, 0.5).toHSV(), HSV.init(0, 0, 0.5));
    try util.expectEqual(RGB.init(0.8, 0.8, 0.8).toHSV(), HSV.init(0, 0, 0.8));
    try util.expectEqual(RGB.init(1.0, 1.0, 1.0).toHSV(), HSV.init(0, 0, 1.0));

    // Blends
    try util.expectEqual(RGB.init(1.0, 0.5, 0).toHSV(), HSV.init(30, 1, 1.0));
    try util.expectEqual(RGB.init(0.25, 0.5, 1.0).toHSV(), HSV.init(220, 0.75, 1.0));
    try util.expectEqual(RGB.init(0.75, 0, 1.0).toHSV(), HSV.init(285, 1, 1.0));
    try util.expectEqual(RGB.init(0.75, 0.5, 1.0).toHSV(), HSV.init(270, 0.5, 1.0));
}
