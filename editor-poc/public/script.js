"use strict";

function generateId() {
    return crypto.randomUUID();
}

const nodes = {};
const backlinks = {};

function getNode(id) {
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
    let resource = new Function('imports', '"use strict";\n' + node.code)(imports);
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

    // Filthy hack to force a Vue update on an empty DB, for initial load
    // This isn't needed when we're loading actual data, because the setNode
    // calls trigger these Vue updates anyway
    // My theory is that this is timing related... and I can't be arsed atm
    Vue.set(nodes['builtin://Any'], '_dummy', 0);

    // Read all existing node data into memory
    const store = idb.transaction('nodes').objectStore('nodes');
    store.openCursor().onsuccess = (event) => {
        let cursor = event.target.result;
        if (cursor) {
            setNode(cursor.key, cursor.value);
            cursor.continue();
        }
    };
};

// Adds a node into the graph and also persists it in storage
function saveNode(id, node) {
    setNode(id, node);

    let trans = idb.transaction(['nodes'], 'readwrite');
    trans.onerror = (event) => {
        console.error('IDB Transaction Error:', event);
    };
    let store = trans.objectStore('nodes');
    store.add(node);

    // Trigger a storage event to update other tabs
    localStorage.setItem(id, Date.now());
}

// Setup storage event listener to sync with edits in other tabs
// Need to use localStorage to track when a key was updated last,
// because IDB doesn't have a similar mechanism :facepalm:
window.addEventListener('storage', (event) => {
    idb.transaction('nodes').objectStore('nodes').get(event.key).onsuccess = (idbEvent) => {
        setNode(event.key, idbEvent.target.result);
    };
});

let urlParams = new URLSearchParams(window.location.search);
let applicationNode = nodes[urlParams.get('app')] || nodes['builtin://node-viewer'];
document.title = applicationNode.title;

let application = loadResource(applicationNode);

if (application.init) {
    application.init();
}

if (application.update) {
    function frame() {
        application.update();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
