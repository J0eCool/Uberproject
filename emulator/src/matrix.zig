pub const Mat4 = packed struct {
    data: [16]f32,

    pub fn identity() Mat4 {
        return Mat4 { .data = [16]f32{
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        } };
    }
};
