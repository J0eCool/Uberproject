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

if (application.id === 'builtin://GlowySun') {
    let canvas = document.getElementById('glowy-sun-canvas');
    let width = canvas.width;
    let height = canvas.height;
    let ctx = canvas.getContext('2d');
    let pixels = new Uint8Array(4 * width * height);
    let image = ctx.createImageData(width, height);

    let particles = [];
    for (let i = 0; i < 200000; ++i) {
        let x = width*(Math.random()/2 + 1/4);
        let y = height*(Math.random()/2 + 1/4);
        let speed = 100.0;
        let angle = Math.PI/4 + Math.atan2(x - width/2, y - height/2);
        let vx = speed * Math.cos(angle) + 4*Math.random()-0.5;
        let vy = speed * Math.sin(angle) + 4*Math.random()-0.5;
        let r = 0;
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

        let c = 8;
        for (let p of particles) {
            let accel = 1;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx += -p.vy * accel * dt;
            p.vy += p.vx * accel * dt;

            let pix = ((p.x|0) + (p.y|0)*width)<<2;
            pixels[pix+0] += c * p.r;
            pixels[pix+1] += c * p.g;
            pixels[pix+2] += c * p.b;
        }

        image.data.set(pixels);
        ctx.putImageData(image, 0, 0);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
