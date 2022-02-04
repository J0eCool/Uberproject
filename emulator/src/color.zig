const std = @import("std");

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
        // algorithm from https://www.rapidtables.com/convert/color/rgb-to-hsv.html
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

    pub fn lerp(t: f32, from: RGB, to: RGB) RGB {
        return RGB.init(
            util.lerp(t, from.r, to.r),
            util.lerp(t, from.g, to.g),
            util.lerp(t, from.b, to.b),
        );
    }

    pub fn scale(c: RGB, s: f32) RGB {
        return RGB.init(s * c.r, s * c.g, s * c.b);
    }

    pub const white = RGB.init(1, 1, 1);
    pub const black = RGB.init(0, 0, 0);
};


/// A color in the HSV color space
pub const HSV = struct {
    h: f32,
    s: f32,
    v: f32,

    pub fn init(h: f32, s: f32, v: f32) HSV {
        return HSV { .h = h, .s = s, .v = v };
    }

    // converts to a color in the RGB color space
    pub fn toRGB(hsv: HSV) RGB {
        // algorithm from https://www.rapidtables.com/convert/color/hsv-to-rgb.html
        const c = hsv.v*hsv.s;
        const x = c*(1 - std.math.fabs(@mod(hsv.h/60, 2) - 1));
        const m = hsv.v - c;
        var rgb =
            if (hsv.h < 60)       RGB.init(c, x, 0)
            else if (hsv.h < 120) RGB.init(x, c, 0)
            else if (hsv.h < 180) RGB.init(0, c, x)
            else if (hsv.h < 240) RGB.init(0, x, c)
            else if (hsv.h < 300) RGB.init(x, 0, c)
            else                  RGB.init(c, 0, x);
        rgb.r += m;
        rgb.g += m;
        rgb.b += m;
        return rgb;
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

/// Helper function for conversion tests
fn testHsvToRgb(hsv: HSV, rgb: RGB) !void {
    const conv = hsv.toRGB();
    const eq = std.math.approxEqAbs;
    const eps = 0.0001;
    const is_equal =
        eq(f32, conv.r, rgb.r, eps) and
        eq(f32, conv.g, rgb.g, eps) and
        eq(f32, conv.b, rgb.b, eps);
    if (!is_equal) {
        std.log.err("ERROR", .{});
        std.log.err("Given   : H={d:.2}, S={d:.2}, V={d:.2}", .{hsv.h, hsv.s, hsv.v});
        std.log.err("Actual  : R={d:.2}, G={d:.2}, B={d:.2}", .{conv.r, conv.g, conv.b});
        std.log.err("Expected: R={d:.2}, G={d:.2}, B={d:.2}", .{rgb.r, rgb.g, rgb.b});
        return error.TestExpectedEqual;
    }
}
test "HSV.toRGB()" {
    // Fully-saturated monochromatic
    try testHsvToRgb(HSV.init(  0, 1, 1.0), RGB.init(1.0, 0, 0));
    try testHsvToRgb(HSV.init(120, 1, 1.0), RGB.init(0, 1.0, 0));
    try testHsvToRgb(HSV.init(240, 1, 1.0), RGB.init(0, 0, 1.0));
    try testHsvToRgb(HSV.init(  0, 1, 0.5), RGB.init(0.5, 0, 0));
    try testHsvToRgb(HSV.init(120, 1, 0.5), RGB.init(0, 0.5, 0));
    try testHsvToRgb(HSV.init(240, 1, 0.5), RGB.init(0, 0, 0.5));

    // Grays (0% saturation)
    try testHsvToRgb(HSV.init(0, 0, 0.0), RGB.init(0.0, 0.0, 0.0));
    try testHsvToRgb(HSV.init(0, 0, 0.2), RGB.init(0.2, 0.2, 0.2));
    try testHsvToRgb(HSV.init(0, 0, 0.5), RGB.init(0.5, 0.5, 0.5));
    try testHsvToRgb(HSV.init(0, 0, 0.8), RGB.init(0.8, 0.8, 0.8));
    try testHsvToRgb(HSV.init(0, 0, 1.0), RGB.init(1.0, 1.0, 1.0));

    // Blends
    try testHsvToRgb(HSV.init(30, 1, 1.0), RGB.init(1.0, 0.5, 0));
    try testHsvToRgb(HSV.init(220, 0.75, 1.0), RGB.init(0.25, 0.5, 1.0));
    try testHsvToRgb(HSV.init(285, 1, 1.0), RGB.init(0.75, 0, 1.0));
    try testHsvToRgb(HSV.init(270, 0.5, 1.0), RGB.init(0.75, 0.5, 1.0));
}
