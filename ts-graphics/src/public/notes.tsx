import React, { useState } from 'react';
import ReactDOM from 'react-dom';

// type Props = {};
function App(props: any) {
    return <div>
        Hello friendo, no pretendo
    </div>;
}

async function main() {
    let app = <App />;
    ReactDOM.render(app, document.getElementById('app'));

    const data = await (await fetch('./notes')).json();
    console.log(data);
}

main();
