function generateId() {
    return crypto.randomUUID();
}

let nodes = {};
let backlinks = {};

// Loads a node into the graph and add backlinks
function setNode(id, node) {
    if (node.id !== id) { throw 'mismatched node ID'; }

    Vue.set(nodes, id, node);

    // helper function to initialize backlinks for an id
    function check(id) {
        if (!backlinks.hasOwnProperty(id)) {
            Vue.set(backlinks, id, []);
        }
    }
    // initialize backlinks[id]; may have already been done below
    check(id);
    for (let link of node.links) {
        // may be loading this node before its dependencies,
        // so may need to initialize backlinks[link] too
        check(link);
        backlinks[link].push(id);
    }
}

// Adds a node into the graph and also persists it in storage
function saveNode(id, node) {
    setNode(id, node);
    localStorage.setItem(id, JSON.stringify(node));
}

for (let id in builtins) {
    setNode(id, builtins[id]);
}

// Load data from storage
for (let i = 0; i < localStorage.length; ++i) {
    let id = localStorage.key(i);
    let node = JSON.parse(localStorage.getItem(id));
    setNode(id, node);
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
        backlinks,
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
            saveNode(id, node);
        },
    },
});
