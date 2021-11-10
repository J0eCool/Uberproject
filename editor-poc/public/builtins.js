
// Initialize nodes with all the builtin types and applications
const builtins = {
    // Primitive types (no type imports)
    'builtin://Any': {
        type: 'builtin://Type',
        name: 'Any',
        params: [],
        fields: {},
        methods: {},
        types: {},
    },
    'builtin://String': {
        type: 'builtin://Type',
        name: 'String',
        params: [],
        fields: {},
        methods: {},
        types: {},
    },

    // Generic types
    'builtin://Array': {
        type: 'builtin://Type',
        name: 'Array',
        params: ['t'],
        fields: {},
        methods: {},
        types: {},
    },
    'builtin://Dict': {
        type: 'builtin://Type',
        name: 'Dictionary',
        params: ['key', 'val'],
        fields: {},
        methods: {},
        types: {},
    },

    // More complex builtin types
    'builtin://Type': {
        type: 'builtin://Type',
        name: 'Type',
        // type parameters for generic types, e.g. Array<String>
        params: [],
        // names + types of properties on a type
        // TODO: more than just POD structs
        fields: {
            fields: 'StringDict',
            name: 'String',
            methods: 'SigDict',
            params: 'StringArray',
            types: 'StringDict',
        },
        methods: {},
        // type imports; what specific URLs are we referencing
        types: {
            SigDict: ['import', 'builtin://Dict', 'String', 'Signature'],
            Signature: ['tuple', 'TypeArray', 'TypeArray'],
            String: ['import', 'builtin://String'],
            StringArray: ['import', 'builtin://Array', 'String'],
            StringDict: ['import', 'builtin://Dict', 'String', 'String'],
            Type: ['import', 'builtin://Type'],
            TypeArray: ['import', 'builtin://Array', 'Type'],
        },
    },
    'builtin://Application': {
        type: 'builtin://Type',
        name: 'Application',
        params: [],
        fields: {
            title: 'String',
            imports: 'ImportDict',
        },
        methods: {
            init: [[], ['ImportDict']],
            update: [[], []],
        },
        types: {
            Any: ['import', 'builtin://Any'],
            ImportDict: ['import', 'builtin://Dict', 'String', 'Any'],
            String: ['import', 'builtin://String'],
        },
    },
    'builtin://Library': {
        type: 'builtin://Type',
        name: 'Type',
        params: [],
        fields: {},
        methods: {},
        types: {},
    },

    // ---------------
    // Below this line, these are samples that aren't part of the syscall layer
    // Well the default NodeViewer probably needs to be built in to bootstrap lol

    // Types for sample apps
    'builtin://Teet': {
        type: 'builtin://Type',
        name: 'Teet',
        fields: {
            description: 'String',
            parent: 'Teet',
        },
        methods: {},
        types: {
            String: ['import', 'builtin://String'],
            Teet: ['self'],
        },
    },

    // Libraries
    'builtin://VueApp': {
        type: 'builtin://Library',
        code: `return {
            setAppHtml(html) {
                document.getElementById('app').innerHTML = html;
            },
            newApp(params) {
                return new Vue(params);
            },
            component(name, params) {
                return Vue.component(name, params);
            },
        };`,
    },
    'builtin://CanvasApp': {
        type: 'builtin://Library',
        imports: {
            'vue': 'builtin://VueApp',
        },
        code: `return {
            init(width, height) {
                imports.vue.setAppHtml(\`
                    <canvas id='canvas' width=\${width} height=\${height}
                        style="position:absolute;left:0px;top:0px;
                        width:100%;max-height:100%;
                        object-fit:contain;image-rendering:pixelated"
                    ></canvas>
                \`);
                let canvas = document.getElementById('canvas');
                this.width = width;
                this.height = height;
                this.ctx = canvas.getContext('2d');
                this.pixels = new Uint8Array(4 * width * height);
                this.image = this.ctx.createImageData(width, height);
            },
        };`,
    },
    
    // Applications
    'builtin://node-viewer': {
        type: 'builtin://Application',
        title: 'Node Viewer',
        imports: {
            vue: 'builtin://VueApp',
        },
        code: `return {
            init() {
                imports.vue.setAppHtml(\`
                    <div>
                        <h3>Search</h3>
                        Type: <input v-model="searchType">
                    </div>
                    <h3>Nodes</h3>
                    <ul>
                        <li v-for="node in nodes" v-if="searchMatches(node)" :id="node.id">
                            <a v-if="node.type === 'builtin://Application'"
                                :href='"./?app=" + node.id'>
                                <b>{{node.id}}</b>
                            </a>
                            <b v-else>{{node.id}}</b>
                            - {{node.type}}
                            <ul>
                            <li v-if="node.links.length > 0">
                                Links
                                <ul>
                                <li v-for="link in node.links">
                                    <a :href="'#' + link">{{link}}</a>
                                </li>
                                </ul>
                            </li>
                            <li v-if="backlinks[node.id].length > 0">
                                Backlinks
                                <ul>
                                <li v-for="link in backlinks[node.id]">
                                    <a :href="'#' + link">{{link}}</a>
                                </li>
                                </ul>
                            </li>
                            <li v-for="type, key in nodes[node.type].fields">
                                {{key}}: {{node[key]}}
                            </li>
                            </ul>
                        </li>
                    </ul>
                \`);

                // Because we reference app in the rendering template before newApp
                // can return, we can't just use 'let app = ...'
                // see: https://github.com/sveltejs/svelte/issues/3234
                let app;
                app = imports.vue.newApp({
                    el: '#app',
                    data: {
                        searchType: '',
                        backlinks: imports.backlinks,
                        nodes: imports.nodes,
                    },
                    methods: {
                        searchMatches(node) {
                            return app && node.type.toLowerCase().indexOf(app.searchType.toLowerCase()) >= 0;
                        },
                    },
                });
            },
        };`,
    },
    'builtin://teeter': {
        type: 'builtin://Application',
        title: 'Teeter App',
        imports: {
            vue: 'builtin://VueApp',
        },
        code: `return {
            init() {
                imports.vue.setAppHtml(\`
                    <h3>Teeter</h3>
                    <ul>
                    <teet v-for="node in nodes"
                        v-if="node.type === 'builtin://Teet' && node.parent === null"
                        :node="node"
                        :nodes="nodes"
                        :selected="selected"
                        :key="node.id"
                        @select="select($event)"
                        @publish="publish($event)"
                    ></teet>
                    <teet-writer v-if="selected === null"
                        @publish="publish($event)"
                    ></teet-writer>
                    </ul>
                \`);

                imports.vue.component('teet-writer', {
                    data() {
                        return {
                            message: '',
                        };
                    },
                    template:
                        \`<div>
                            <textarea v-model="message"></textarea>
                            <button @click="$emit('publish', message)">Publish</button>
                        </div>\`,
                });
                imports.vue.component('teet', {
                    props: ['node', 'nodes', 'selected'],
                    template:
                        \`<li>
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
                        </li>\`,
                });

                let app = imports.vue.newApp({
                    el: '#app',
                    data: {
                        backlinks: imports.backlinks,
                        nodes: imports.nodes,
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
            },
        };`,
    },
    'builtin://glowy-sun': {
        type: 'builtin://Application',
        title: 'A glowy sun',
        imports: {
            canvas: 'builtin://CanvasApp',
        },
        code: `return {
            init() {
                console.log('nodes!', nodes);
                imports.canvas.init(320, 240);
                let canvas = document.getElementById('canvas');
                this.width = canvas.width;
                this.height = canvas.height;
                let w = this.width;
                let h = this.height;
                this.ctx = canvas.getContext('2d');
                this.pixels = new Uint8Array(4 * w * h);
                this.image = this.ctx.createImageData(w, h);
                
                this.particles = [];
                for (let i = 0; i < 200000; ++i) {
                    let r = Math.random() + Math.random();
                    if (r >= 1) { r = 2 - r; }
                    let angle = Math.random() * 2*Math.PI;
                    let maxR = Math.min(w, h)/4;
                    let x = w/2 + maxR*r*Math.cos(angle);
                    let y = h/2 + maxR*r*Math.sin(angle);
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
                    this.particles.push({
                        x, y,
                        vx, vy,
                        r, g, b,
                    });
                }
            },
            update() {
                let dt = 1/60;

                let w = this.width;
                let h = this.height;
                let pixels = this.pixels;

                // clear canvas to black
                for (let i = 0; i < w*h; ++i) {
                    let pix = 4 * i;
                    pixels[pix+0] = 0;
                    pixels[pix+1] = 0;
                    pixels[pix+2] = 0;
                    pixels[pix+3] = 255;
                }

                let c = 20;
                let accel = 1.25;
                for (let p of this.particles) {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.vx += -p.vy * accel * dt;
                    p.vy += p.vx * accel * dt;

                    let pix = ((p.x|0) + (p.y|0)*w)<<2;
                    pixels[pix+0] += (c * p.r)*(256-pixels[pix+0])/256;
                    pixels[pix+1] += (c * p.g)*(256-pixels[pix+1])/256;
                    pixels[pix+2] += (c * p.b)*(256-pixels[pix+2])/256;
                }

                this.image.data.set(pixels);
                this.ctx.putImageData(this.image, 0, 0);
            },
        };`,
    },
};

// Initialize any un-set fields that all Nodes need
for (let id in builtins) {
    let node = builtins[id];
    node.id = id;
    node.links = [];

    // auto-populate links for type imports
    if (node.type === 'builtin://Type') {
        for (let ty of Object.keys(node.types)) {
            let loader = node.types[ty];
            if (loader[0] === 'import' && !node.links.includes(loader[1])) {
                node.links.push(loader[1]);
            }
        }
    }
}
