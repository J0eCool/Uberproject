"use strict";

function generateId() {
    return crypto.randomUUID();
}

const builtins = loadBuiltinData();
const nodes = {};
const backlinks = {};

function getNode(id) {
    if (!nodes[id]) {
        throw 'Unknown node:' + id;
    }
    return nodes[id];
}

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

// Loads a Node into the runtime structure, Resource
function loadResource(node) {
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

// Initialize builtin nodes
for (let id in builtins) {
    setNode(id, builtins[id]);
}

// Initialize IndexedDB
let idb;
const idbRequest = indexedDB.open('NodeDB', 1);
idbRequest.onerror = (event) => {
    console.error('IDB Initialization Error:', event);
    throw 'Failed to initialize IndexedDB';
};
idbRequest.onupgradeneeded = (event) => {
    idb = event.target.result;
    const nodeStore = idb.createObjectStore('nodes', { keyPath: 'id' });
    nodeStore.createIndex('type', 'type', { unique: false });
};
idbRequest.onsuccess = (event) => {
    idb = event.target.result;
    idb.onerror = (event) => {
        console.error('IDB Error:', event);
    };

    // Read all existing node data into memory
    const store = idb.transaction('nodes').objectStore('nodes');
    store.openCursor().onsuccess = (event) => {
        let cursor = event.target.result;
        if (cursor) {
            setNode(cursor.key, cursor.value);
            cursor.continue();
        } else {
            startApplication();

            // Filthy hack to force a Vue update on an empty DB, for initial load
            // This seems to only matter for the Node Viewer app... idk what it's deal is
            // My theory is that this is timing related... and I can't be arsed atm
            setTimeout(() => {
                Vue.set(nodes['builtin://Any'], '_dummy', 0);
            }, 10);
        }
    };
};

// Adds a node into the graph and also persists it in storage
function saveNodes(nodes) {
    for (let node of nodes) {
        setNode(node.id, node);
    }

    let trans = idb.transaction(['nodes'], 'readwrite');
    trans.onerror = (event) => {
        console.error('IDB Transaction Error:', event);
    };
    let store = trans.objectStore('nodes');
    for (let node of nodes) {
        store.add(node);

        // Trigger a storage event to update other tabs
        localStorage.setItem(node.id, Date.now());
    }
}
function saveNode(id, node) {
    if (node.id !== id) { throw 'no stahp'; }
    node.id = id;
    saveNodes([node]);
}

// Setup storage event listener to sync with edits in other tabs
// Need to use localStorage to track when a key was updated last,
// because IDB doesn't have a similar mechanism :facepalm:
window.addEventListener('storage', (event) => {
    idb.transaction('nodes').objectStore('nodes').get(event.key).onsuccess = (idbEvent) => {
        setNode(event.key, idbEvent.target.result);
    };
});

function startApplication() {
    let urlParams = new URLSearchParams(window.location.search);
    let applicationNode = nodes[urlParams.get('app')] || getNode('preload://launcher');
    let application = loadResource(applicationNode);

    document.title = application.title;
    
    if (application.init) {
        application.init();
    }

    if (application.update) {
        let t0 = Date.now();
        function frame() {
            let t = Date.now();
            let dt = (t - t0) / 1000;
            t0 = t;
            application.update(dt);
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }
}
