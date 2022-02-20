// Server for Notes app

import { NoteData } from './shared/note_data';

import express from 'express';
import fs from 'fs';

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
    ret = `dist/public${requested}`;
    if (fs.existsSync(ret)) {
        return ret;
    }

    throw new Error(`File for path "${requested}" not found`);
}

function loadFile(path: string,
        onErr: ((err: NodeJS.ErrnoException) => void) | null,
        onSuccess: (data: Buffer) => void): void {
    fs.readFile(path, (err, data) => {
        if (err) {
            console.error(`Couldn't load file ${path}`, err);
            if (onErr) {
                onErr(err);
            }
            return;
        } else {
            onSuccess(data);
        }
    });
}

/** Sends the contents of a file as a response */
function sendFile(path: string, res: express.Response): void {
    loadFile(path, (err) => {
        const code = 404; // Internal Server Error
        res.statusCode = code;
        res.send(`Error ${code}`)
    }, (data) => {
        res.send(data.toString('utf8'));
    });
}

function main(): void {
    var noteData: NoteData;
    loadFile('data/notes.json', null, (data) => {
        noteData = NoteData.fromJson(JSON.parse(data.toString('utf8')));
    });

    const app = express();

    // parses `Content-Type: application/json` by default
    app.use(express.json());

    app.get('/notes', (req, res) => {
        res.send(noteData.toJson());
    });
    app.put('/notes', (req, res) => {
        noteData = NoteData.fromJson(req.body);
        // todo: save to disk (maybe do validation)
        res.sendStatus(200);
    });

    // todo: make a /shaders endpoint and turn shadertoy into a shader editor
    // store shaders in data/shaders dir
    // in general store dynamic data in data/ folder

    app.get('*', (req, res) => {
        console.log(`GET for ${req.path}`);
        const path = getFilename(req.path);
        sendFile(path, res);
    });

    app.listen(PORT, () => {
        console.log(`Express listening at http://localhost:${PORT}`);
    });
}

main();
