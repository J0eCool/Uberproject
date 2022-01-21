const std = @import("std");

pub fn build(b: *std.build.Builder) void {
    // Standard target options allows the person running `zig build` to choose
    // what target to build for. Here we do not override the defaults, which
    // means any target is allowed, and the default is native. Other options
    // for restricting supported target set are available.
    const target = b.standardTargetOptions(.{});

    // Standard release options allow the person running `zig build` to select
    // between Debug, ReleaseSafe, ReleaseFast, and ReleaseSmall.
    const mode = b.standardReleaseOptions();

    const exe = b.addExecutable("emulator", "src/main.zig");
    exe.setTarget(target);
    exe.setBuildMode(mode);

    // just hardcode this for now, screw it
    const sdl_path = "C:\\Programming\\SDL2-2.0.14\\x86_64-w64-mingw32\\";
    exe.addIncludeDir(sdl_path ++ "include\\SDL2");
    exe.addLibPath(sdl_path ++ "lib");
    b.installBinFile(sdl_path ++ "bin\\SDL2.dll", "SDL2.dll");
    exe.linkSystemLibrary("sdl2");

    // OpenGL - doesn't work at the moment
    // Epoxy is an OpenGL loader, I'm not sure how to get Zig to link libepoxy.dll.a
    // We don't need to use epoxy, but we do need some GL loading library
    // for reference: https://www.khronos.org/opengl/wiki/OpenGL_Loading_Library
    // Alternatively we could go for a zig-based wrapper
    // see: https://github.com/prime31/zig-renderkit
    const glew_path = "C:\\Programming\\Tools\\glew-2.1.0\\";
    exe.addIncludeDir(glew_path ++ "include\\GL");
    exe.addLibPath(glew_path ++ "lib\\Release\\x64");
    b.installBinFile(glew_path ++ "bin\\Release\\x64\\glew32.dll", "glew32.dll");
    exe.linkSystemLibrary("opengl32");
    exe.linkSystemLibrary("glew32");

    exe.linkLibC();
    exe.install();

    const run_cmd = exe.run();
    run_cmd.step.dependOn(b.getInstallStep());
    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);

    const exe_tests = b.addTest("src/main.zig");
    exe_tests.setTarget(target);
    exe_tests.setBuildMode(mode);

    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&exe_tests.step);
}
