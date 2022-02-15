import { Note, NoteData } from '../shared/note_data';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

// todo: handle recursively contained notes
function NoteView(props: { note: Note }) {
    return <div>
        {props.note.text}
        <ul>{props.note.contains.map(n =>
            <li key={n.id}><NoteView note={n} /></li>)
        }</ul>
    </div>;
}

function App(props: { data: NoteData }) {
    console.log(props.data);
    return <div>
        {Object.values(props.data.notes).map(n => <NoteView key={n.id} note={n} />)}
    </div>;
}

async function main() {
    const json = await (await fetch('./notes')).json();
    const data = NoteData.fromJson(json);

    let app = <App data={data}/>;
    ReactDOM.render(app, document.getElementById('app'));
}

main();
