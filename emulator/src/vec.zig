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
