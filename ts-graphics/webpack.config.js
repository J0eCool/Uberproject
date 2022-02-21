const path = require('path');

module.exports = {
    entry: {
        notes: './src/public/notes.tsx',
        shadertoy: './src/public/shadertoy.tsx',
    },
    mode: 'development',
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: 'ts-loader',
            exclude: /node_modules/,
        }],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'public/[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
};
