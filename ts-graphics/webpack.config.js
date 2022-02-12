const path = require('path');

module.exports = {
  entry: './src/public/notes.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  mode: 'development',
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'public/notes.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
