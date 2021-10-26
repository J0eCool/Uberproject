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

let app = new Vue({
    el: '#app',
    data: {
        nodes,
        note: "",
        selected: null,
    },
    methods: {
        select(item) {
            app.selected = item;
        },
        publish(text) {
            let node = {
                id: generateId(),
                type: "builtin://Note",
                description: text,
                parent: app.selected && app.selected.id,
            };
            app.note = "";
            app.selected = node;
            Vue.set(nodes, node.id, node);
            localStorage.setItem(node.id, JSON.stringify(node));
        },
    },
});
