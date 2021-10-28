function generateId() {
    return crypto.randomUUID();
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
