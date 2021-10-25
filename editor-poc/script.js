function generateId() {
    return crypto.randomUUID();
}

let nodes = {};

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
        },
    },
});
