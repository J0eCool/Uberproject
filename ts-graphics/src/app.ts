import express from 'express';
import fs from 'fs';
const app = express();

const PORT = 3137;

app.get('*', (req, res) => {
    console.log(`GET for ${req.path}`);
    const dir = 'static';
    var filename = `${dir}${req.path}`;
    if (req.path == '/') {
        filename = `${dir}/shadertoy.html`;
    }
    if (fs.existsSync(`dist/${filename}`)) {
        // check dist/static for compiled client-side .ts
        filename = `dist/${filename}`;
    }
    fs.readFile(filename, (err, data) => {
        if (err) {
            console.error(`Couldn't load file ${filename}`, err);
            const code = 404; // Internal Server Error
            res.statusCode = code;
            res.send(`Error ${code}`)
            return;
        }
        res.send(data.toString('utf8'));
    });
});

app.listen(PORT, () => {
    console.log(`Express listening at http://localhost:${PORT}`);
});
