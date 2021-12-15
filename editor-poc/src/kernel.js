export function generateId() {
    return crypto.randomUUID();
}

export const nodes = {};
export const backlinks = {};

export function getNode(id) {
    if (!nodes[id]) {
        throw 'Unknown node:' + id;
    }
    return nodes[id];
}

// Loads a node into the graph and add backlinks
export function setNode(id, node) {
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

// Loads a Node into the runtime structure, Resource
export function loadResource(node) {
    let imports = {};
    for (let name in node.imports) {
        let url = node.imports[name];
        let dep = getNode(url);
        let res = loadResource(dep);
        imports[name] = res;
    }
    let resource = {...node};
    let type = getNode(node.type);
    if (type.construct) {
        type.construct(resource, imports);
    }

    // magic for builtin nodes to have access to things
    if (node.id === 'builtin://Graph') {
        resource.nodes = nodes;
        resource.backlinks = backlinks;
    }
    return resource;
}
