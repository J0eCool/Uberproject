function generateId() {
    return crypto.randomUUID();
}

let nodes = {};
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
            <button @click="$emit('select', node)">reply</button>
            <ul>
                <teet v-for="child in nodes"
                    v-if="child.type === 'builtin://Note' && child.parent === node.id"
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

let app = new Vue({
    el: '#app',
    data: {
        nodes,
        message: '',
        selected: null,
    },
    methods: {
        select(item) {
            app.selected = item;
        },
        publish(text) {
            let node = {
                id: generateId(),
                type: 'builtin://Note',
                description: text,
                parent: app.selected && app.selected.id,
            };
            app.message = '';
            app.selected = null;
            Vue.set(nodes, node.id, node);
            localStorage.setItem(node.id, JSON.stringify(node));
        },
    },
});
