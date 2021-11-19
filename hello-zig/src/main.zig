extern fn print(i32) void;

// to compile:
// zig build-lib src/main.zig -target wasm32-freestanding -O ReleaseSafe -dynamic
// && wasm2wat main.wasm -o main.wat -f

// the -dynamic flag is needed in order to generate the code as a .wasm instead
// of as a .a


export fn add(a: i32, b: i32) void {
    print(a + b);
}
