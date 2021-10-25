function generateId() {
    return crypto.randomUUID();
}

let data = {
    // nodes: [
    //     { id: generateId(), description: 'abc' },
    //     { id: generateId(), description: '123' },
    //     { id: generateId(), description: 'fedasf' },
    // ],
    nodes: {},
    selected: null,
};
for (let elem of ['abc', '123', 'como se dice']) {
    let id = generateId();
    data.nodes[id] = { id, description: elem };
}

let app = new Vue({
    el: '#app',
    data,
    methods: {
        select(item) {
            data.selected = {...item};
        },
        update(item) {
            data.nodes[item.id] = {...item};
        },
        push(item) {
            console.log('pushing', item)
            let node = {...item};
            node.id = generateId();
            Vue.set(data.nodes, node.id, node);
            console.log('pushing', item)
        },
        remove(item) {
            delete data.nodes[item.id];
        },
    },
});
