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

// Initialize builtin nodes
for (let id in builtins) {
    setNode(id, builtins[id]);
}

// Initialize IndexedDB
let idb;
let idbRequest = indexedDB.open('NodeDB', 1);
idbRequest.onerror = (event) => {
    console.error('IDB Initialization Error:', event);
    throw 'Failed to initialize IndexedDB';
};
idbRequest.onupgradeneeded = (event) => {
    idb = event.target.result;
    let nodeStore = idb.createObjectStore('nodes', { keyPath: 'id' });
    nodeStore.createIndex('type', 'type', { unique: false });
};
idbRequest.onsuccess = (event) => {
    idb = event.target.result;
    idb.onerror = (event) => {
        console.error('IDB Error:', event);
    };

    // Read all existing node data into memory
    let store = idb.transaction('nodes').objectStore('nodes');
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
let application = nodes[urlParams.get('app')] || nodes['builtin://node-viewer'];
document.title = application.title;

if (application.init) { application.init(); }
document.getElementById('app').innerHTML = application.template;

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
            saveNode(node.id, node);
        },
    },
});

if (application.id === 'builtin://glowy-sun') {
    let canvas = document.getElementById('canvas');
    let width = canvas.width;
    let height = canvas.height;
    let ctx = canvas.getContext('2d');
    let pixels = new Uint8Array(4 * width * height);
    let image = ctx.createImageData(width, height);

    let particles = [];
    for (let i = 0; i < 200000; ++i) {
        let r = Math.random() + Math.random();
        if (r >= 1) { r = 2 - r; }
        let angle = Math.random() * 2*Math.PI;
        let maxR = Math.min(width, height)/4;
        let x = width/2 + maxR*r*Math.cos(angle);
        let y = height/2 + maxR*r*Math.sin(angle);
        let speed = 5000.0;
        let c = r / maxR;
        angle += Math.PI/2;
        let randSpeed = 0.25;
        let vx = c * speed * Math.cos(angle) * (1 + randSpeed*(Math.random() - 0.5));
        let vy = c * speed * Math.sin(angle) * (1 + randSpeed*(Math.random() - 0.5));
         r = 0;
        let g = 0;
        let b = 0;
        let color = Math.random()*3;
        if (color < 1) { r = 1; }
        else if (color < 2) { g = 1; }
        else { b = 1; }
        particles.push({
            x, y,
            vx, vy,
            r, g, b,
        });
    }
    function frame() {
        let dt = 1/60;

        // clear canvas to black
        for (let i = 0; i < width*height; ++i) {
            let pix = 4 * i;
            pixels[pix+0] = 0;
            pixels[pix+1] = 0;
            pixels[pix+2] = 0;
            pixels[pix+3] = 255;
        }

        let c = 20;
        let accel = 1.25;
        for (let p of particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx += -p.vy * accel * dt;
            p.vy += p.vx * accel * dt;

            let pix = ((p.x|0) + (p.y|0)*width)<<2;
            pixels[pix+0] += (c * p.r)*(256-pixels[pix+0])/256;
            pixels[pix+1] += (c * p.g)*(256-pixels[pix+1])/256;
            pixels[pix+2] += (c * p.b)*(256-pixels[pix+2])/256;
        }

        image.data.set(pixels);
        ctx.putImageData(image, 0, 0);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
