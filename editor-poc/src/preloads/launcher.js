import { preloads } from './preloads_core';

// Launcher - Simple launcher for Applications
preloads['preload://launcher'] = {
    type: 'builtin://Application',
    title: 'Launcher',
    imports: {
        graph: 'builtin://Graph',
        vue: 'builtin://VueApp',
    },
    initFunc(imports) { return {
        init() {
            imports.vue.setAppHtml(`
                <h3>Application List</h3>
                <ul>
                    <li v-for="node in nodes"
                        v-if="node.type === 'builtin://Application'"
                        :id="node.id">
                        <a :href='"./?app=" + node.id'>
                            <b>{{node.title}}</b>
                        </a>
                    </li>
                </ul>
            `);

            let app = imports.vue.newApp({
                el: '#app',
                data: {
                    searchType: '',
                    nodes: imports.graph.getNodes(),
                },
            });
        },
    }; },
};
