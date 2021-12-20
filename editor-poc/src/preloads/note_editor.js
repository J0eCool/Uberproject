import React from 'react';
import ReactDOM from 'react-dom';

import { preloads } from './preloads_core';

preloads['preload://note-editor'] = {
    type: 'builtin://Application',
    title: 'Note Editor',
    imports: {
        graph: 'builtin://Graph',
    },
    initFunc(imports) { return {
        init() {
            function App(props) {
                return <div>
                    <h3>Coming soon!</h3>
                </div>;
            }

            let app = <App />;
            ReactDOM.render(app, document.getElementById('app'));
        },
    }; },
};
