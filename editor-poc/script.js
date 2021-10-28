function generateId() {
    return crypto.randomUUID();
}

// Initialize nodes with all the builtin types and applications
let nodes = {
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
    'builtin://NodeViewer': {
        type: 'builtin://Application',
        title: 'Node Viewer',
    },
    'builtin://Teeter': {
        type: 'builtin://Application',
        title: 'Teeter App',
    },
};

// Initialize any un-set fields that all Nodes need
for (let id in nodes) {
    let node = nodes[id];
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

// Load data from storage
for (let i = 0; i < localStorage.length; ++i) {
    let key = localStorage.key(i);
    nodes[key] = JSON.parse(localStorage.getItem(key));
}
// Setup storage event listener to sync with edits in other tabs
window.addEventListener('storage', (event) => {
    Vue.set(nodes, event.key, JSON.parse(event.newValue));
});

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

let urlParams = new URLSearchParams(window.location.search);
let application = nodes[urlParams.get('app')] || nodes['builtin://NodeViewer'];
document.title = application.title;

let app = new Vue({
    el: '#app',
    data: {
        application,
        nodes,
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
                type: 'builtin://Teet',
                links: parent ? [parent] : [],

                // Note-specific properties
                description: text,
                parent,
            };
            app.message = '';
            app.selected = null;
            Vue.set(nodes, node.id, node);
            localStorage.setItem(node.id, JSON.stringify(node));
        },
    },
});
