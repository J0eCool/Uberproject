import { Note, NoteData } from '../shared/note_data';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

// todo: handle recursively contained note loops
function NoteView(props: { note: Note }) {
    const note = props.note;
    const time = !note.containedIn.length && <p>({note.created.toLocaleString()})</p>;
    return <div>
        {note.text}
        <ul>{note.contains.map(n =>
            <li key={n.id}><NoteView note={n} /></li>)
        }</ul>
        {time}
    </div>;
}

function createNewNote(data: NoteData, containedIn: Note | null): Note {
    const id = data.nextId++;
    const note = new Note(id, "Hi i'm new");
    if (containedIn) {
        note.containedIn.push(containedIn);
        containedIn.contains.push(note);
    }
    data.notes[id] = note;
    return note;
}

/** Sends current note data to the server */
function saveNotes(data: NoteData) {
    createNewNote(data, data.notes[1]);
    fetch('/notes', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.toJson()),
    });
}

function App(props: { data: NoteData }) {
    // Only show notes if they aren't part of some larger note
    return <div>
        <button onClick={() => saveNotes(props.data)}>Save to server</button>
        {Object.values(props.data.notes).map(n => n.containedIn.length        
            ? null
            : <NoteView key={n.id} note={n} />)}
    </div>;
}

async function main() {
    const json = await (await fetch('./notes')).json();
    const data = NoteData.fromJson(json);

    let app = <App data={data}/>;
    ReactDOM.render(app, document.getElementById('app'));
}

main();
