import { preloads } from './preloads_core';

// Tooter - threaded messages with replies, little else
preloads['preload://Toot'] = {
    type: 'builtin://Type',
    name: 'Toot',
    fields: {
        description: 'String',
        parent: 'Toot',
    },
    methods: {},
    types: {
        String: ['import', 'builtin://String'],
        Toot: ['self'],
    },
};
preloads['preload://tooter'] = {
    type: 'builtin://Application',
    title: 'Tooter App',
    imports: {
        graph: 'builtin://Graph',
        vue: 'builtin://VueApp',
    },
    initFunc(imports) { return {
        init() {
            imports.vue.setAppHtml(`
                <h3>Tooter</h3>
                <ul>
                <toot v-for="node in nodes"
                    v-if="node.type === 'preload://Toot' && node.parent === null"
                    :node="node"
                    :nodes="nodes"
                    :selected="selected"
                    :key="node.id"
                    @select="select($event)"
                    @publish="publish($event)"
                ></toot>
                <toot-writer v-if="selected === null"
                    @publish="publish($event)"
                ></toot-writer>
                </ul>
            `);

            imports.vue.component('toot-writer', {
                data() {
                    return {
                        message: '',
                    };
                },
                template:
                    `<div>
                        <textarea v-model="message"></textarea>
                        <button @click="$emit('publish', message)">Publish</button>
                    </div>`,
            });
            imports.vue.component('toot', {
                props: ['node', 'nodes', 'selected'],
                template:
                    `<li>
                        {{node.description}}
                        <button @click="$emit('select', node)">Reply</button>
                        <ul>
                            <toot v-for="child in nodes"
                                v-if="child.type === 'preload://Toot' && child.parent === node.id"
                                :node="child"
                                :nodes="nodes"
                                :selected="selected"
                                :key="child.id"
                                @select="$emit('select', $event)"
                                @publish="$emit('publish', $event)"
                            ></toot>
                            <toot-writer v-if="selected === node"
                                @publish="$emit('publish', $event)"
                            ></toot-writer>
                        </ul>
                    </li>`,
            });

            let app = imports.vue.newApp({
                el: '#app',
                data: {
                    backlinks: imports.graph.getBacklinks(),
                    nodes: imports.graph.getNodes(),
                    message: '',
                    selected: null,
                },
                methods: {
                    select(item) {
                        if (app.selected === item) {
                            app.selected = null;
                        } else {
                            app.selected = item;
                        }
                    },
                    publish(text) {
                        let parent = app.selected && app.selected.id;
                        let node = {
                            // Generic properties
                            id: generateId(),
                            type: 'preload://Toot',
                            links: parent ? [parent] : [],
            
                            // Note-specific properties
                            description: text,
                            parent,
                        };
                        app.message = '';
                        app.selected = null;
                        saveNode(node.id, node);
                    },
                },
            });
        },
    }; },
};
