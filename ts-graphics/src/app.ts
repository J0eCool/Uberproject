import express from 'express';
import fs from 'fs';
const app = express();

const PORT = 3137;

/** Get the filename for the resource requested by a user */
function getFilename(requested: string): string {
    const dir = 'static';
    var ret = `${dir}${requested}`;
    if (requested == '/') {
        ret = `${dir}/index.html`;
    }
    if (fs.existsSync(ret)) {
        return ret;
    }
    
    // check dist/static for compiled client-side .ts
    const tsDistDir = 'dist/public';
    ret = `${tsDistDir}${requested}`;
    if (fs.existsSync(ret)) {
        return ret;
    }

    throw new Error(`File for path "${requested}" not found`);
}

app.get('*', (req, res) => {
    console.log(`GET for ${req.path}`);
    const path = getFilename(req.path);
    fs.readFile(path, (err, data) => {
        if (err) {
            console.error(`Couldn't load file ${path}`, err);
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
