// Initialize nodes with all the builtin types and applications
let builtins = {
    // Primitive types (no type imports)
    'builtin://String': {
        type: 'builtin://Type',
        name: "String",
        params: [],
        fields: {},
        types: {},
    },

    // Generic types
    'builtin://Array': {
        type: 'builtin://Type',
        name: "Array",
        params: ['t'],
        fields: {},
        types: {},
    },
    'builtin://Dict': {
        type: 'builtin://Type',
        name: "Dictionary",
        params: ['key', 'val'],
        fields: {},
        types: {},
    },

    // More complex builtin types
    'builtin://Application': {
        type: 'builtin://Type',
        name: "Application",
        params: [],
        fields: {
            title: 'String',
        },
        types: {
            String: ['import', 'builtin://String'],
        },
    },
    'builtin://Type': {
        type: 'builtin://Type',
        name: 'Type',
        // type parameters for generic types, e.g. Array<String>
        params: [],
        // names + types of properties on a type
        // TODO: more than just POD structs
        fields: {
            fields: ['Dict', 'String', 'SExpr'],
            name: 'String',
            params: ['Array', 'TypeName'],
            types: ['Dict', 'TypeName', ['Array', 'String']],
        },
        // type imports; what specific URLs are we referencing
        types: {
            Array: ['import', 'builtin://Array'],
            Dict: ['import', 'builtin://Dict'],
            SExpr: ['variant', 'String', 'SExpr'],
            String: ['import', 'builtin://String'],
            Type: ['import', 'builtin://Type'],
            TypeExpr: ['import', 'builtin://Type'],
            TypeName: ['import', 'builtin://String'],
            Url: ['import', 'builtin://String'],
        },
    },

    // Types for sample apps
    'builtin://Teet': {
        type: 'builtin://Type',
        name: 'Teet',
        fields: {
            description: 'String',
            parent: 'Teet',
        },
        types: {
            String: ['import', 'builtin://String'],
            Teet: ['self'],
        },
    },

    // Applications
    'builtin://node-viewer': {
        type: 'builtin://Application',
        title: 'Node Viewer',
        template: `
            <h3>Nodes</h3>
            <ul>
                <li v-for="node in nodes" :id="node.id">
                    <a v-if="node.type === 'builtin://Application'"
                        :href='"./?app=" + node.id'>
                        <b>{{node.id}}</b>
                    </a>
                    <b v-else>{{node.id}}</b>
                    - {{node.type}}
                    <ul>
                    <li v-if="node.links.length > 0">
                        Links
                        <ul>
                        <li v-for="link in node.links">
                            <a :href="'#' + link">{{link}}</a>
                        </li>
                        </ul>
                    </li>
                    <li v-if="backlinks[node.id].length > 0">
                        Backlinks
                        <ul>
                        <li v-for="link in backlinks[node.id]">
                            <a :href="'#' + link">{{link}}</a>
                        </li>
                        </ul>
                    </li>
                    <li v-for="type, key in nodes[node.type].fields">
                        {{key}}: {{node[key]}}
                    </li>
                    </ul>
                </li>
            </ul>
        `,
    },
    'builtin://teeter': {
        type: 'builtin://Application',
        title: 'Teeter App',
        template: `
            <h3>Teeter</h3>
            <ul>
            <teet v-for="node in nodes"
                v-if="node.type === 'builtin://Teet' && node.parent === null"
                :node="node"
                :nodes="nodes"
                :selected="selected"
                :key="node.id"
                @select="select($event)"
                @publish="publish($event)"
            ></teet>
            <teet-writer v-if="selected === null"
                @publish="publish($event)"
            ></teet-writer>
            </ul>
        `,
        init() {
            Vue.component('teet-writer', {
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
            Vue.component('teet', {
                props: ['node', 'nodes', 'selected'],
                template: 
                    `<li>
                        {{node.description}}
                        <button @click="$emit('select', node)">Reply</button>
                        <ul>
                            <teet v-for="child in nodes"
                                v-if="child.type === 'builtin://Teet' && child.parent === node.id"
                                :node="child"
                                :nodes="nodes"
                                :selected="selected"
                                :key="child.id"
                                @select="$emit('select', $event)"
                                @publish="$emit('publish', $event)"
                            ></teet>
                            <teet-writer v-if="selected === node"
                                @publish="$emit('publish', $event)"
                            ></teet-writer>
                        </ul>
                    </li>`,
            });
        },
    },
    'builtin://glowy-sun': {
        type: 'builtin://Application',
        title: 'A glowy sun',
        template: `
            <canvas id='canvas' width=320 height=240
                style="position:absolute;left:0px;top:0px;
                width:100%;max-height:100%;
                object-fit:contain;image-rendering:pixelated"
            ></canvas>
        `,
    },
};

// Initialize any un-set fields that all Nodes need
for (let id in builtins) {
    let node = builtins[id];
    node.id = id;
    node.links = [];

    // auto-populate links for type imports
    if (node.type === 'builtin://Type') {
        for (let ty of Object.keys(node.types)) {
            let loader = node.types[ty];
            if (loader[0] === 'import' && !node.links.includes(loader[1])) {
                node.links.push(loader[1]);
            }
        }
    }
}
