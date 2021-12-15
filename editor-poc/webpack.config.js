const path = require('path');

module.exports = {
    entry: './src/script.js',
    mode: 'development',
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'bundle.js',
    },
};
