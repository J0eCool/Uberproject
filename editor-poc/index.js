const static = require('node-static');
const http = require('http');
const path = require('path');
const PORT = process.env.PORT || 8101;

const files = new static.Server(path.join(__dirname, 'public'));
http.createServer((req, res) => {
    files.serve(req, res);
}).listen(PORT);
console.log('Server started on port:', PORT);
