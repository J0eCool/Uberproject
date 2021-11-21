
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

    // Libraries
    'builtin://Graph': {
        type: 'builtin://Library',
        code: `return {
            // Magic: this.nodes and this.backlinks gets set by the kernel

            // A list of all the nodes
            getNodes() {
                // todo: figure out whether we want to return Dict<URL, Node>
                return this.nodes;

                // todo: or just Array<Node>
                // let ret = [];
                // for (let node of Object.values(this.nodes)) {
                //     ret.push(node);
                // }
                // return ret;
            },

            // A list of all nodes matching a specific type
            // URL -> Array<Node>
            getNodesOfType(ty) {
                throw 'unimplemented';
            },

            getBacklinks() {
                return this.backlinks;
            },

            // todo: getnode/setnode should live here?
        };`,
    },
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
    
    //-----------------------
    // Applications

    // Launcher - Simple launcher for Applications
    'builtin://launcher': {
        type: 'builtin://Application',
        title: 'Launcher',
        imports: {
            graph: 'builtin://Graph',
            vue: 'builtin://VueApp',
        },
        code: `return {
            init() {
                imports.vue.setAppHtml(\`
                    <h3>Application List</h3>
                    <ul>
                        <li v-for="node in nodes"
                            v-if="node.type === 'builtin://Application'"
                            :id="node.id">
                            <a :href='"./?app=" + node.id'>
                                <b>{{node.title}}</b>
                            </a>
                        </li>
                    </ul>
                \`);

                let app = imports.vue.newApp({
                    el: '#app',
                    data: {
                        searchType: '',
                        nodes: imports.graph.getNodes(),
                    },
                });
            },
        };`,
    },

    // Node viewer - inspect every node in the graph
    'builtin://node-viewer': {
        type: 'builtin://Application',
        title: 'Node Viewer',
        imports: {
            graph: 'builtin://Graph',
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
                        backlinks: imports.graph.getBacklinks(),
                        nodes: imports.graph.getNodes(),
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

    // Tooter - threaded messages with replies, little else
    'builtin://Toot': {
        type: 'builtin://Type',
        name: 'Toot',
        fields: {
            description: 'String',
            parent: 'Toot',
        },
        methods: {},
        types: {
            String: ['import', 'builtin://String'],
            Toot: ['self'],
        },
    },
    'builtin://tooter': {
        type: 'builtin://Application',
        title: 'Tooter App',
        imports: {
            graph: 'builtin://Graph',
            vue: 'builtin://VueApp',
        },
        code: `return {
            init() {
                imports.vue.setAppHtml(\`
                    <h3>Tooter</h3>
                    <ul>
                    <toot v-for="node in nodes"
                        v-if="node.type === 'builtin://Toot' && node.parent === null"
                        :node="node"
                        :nodes="nodes"
                        :selected="selected"
                        :key="node.id"
                        @select="select($event)"
                        @publish="publish($event)"
                    ></toot>
                    <toot-writer v-if="selected === null"
                        @publish="publish($event)"
                    ></toot-writer>
                    </ul>
                \`);

                imports.vue.component('toot-writer', {
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
                imports.vue.component('toot', {
                    props: ['node', 'nodes', 'selected'],
                    template:
                        \`<li>
                            {{node.description}}
                            <button @click="$emit('select', node)">Reply</button>
                            <ul>
                                <toot v-for="child in nodes"
                                    v-if="child.type === 'builtin://Toot' && child.parent === node.id"
                                    :node="child"
                                    :nodes="nodes"
                                    :selected="selected"
                                    :key="child.id"
                                    @select="$emit('select', $event)"
                                    @publish="$emit('publish', $event)"
                                ></toot>
                                <toot-writer v-if="selected === node"
                                    @publish="$emit('publish', $event)"
                                ></toot-writer>
                            </ul>
                        </li>\`,
                });

                let app = imports.vue.newApp({
                    el: '#app',
                    data: {
                        backlinks: imports.graph.getBacklinks(),
                        nodes: imports.graph.getNodes(),
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
                                type: 'builtin://Toot',
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

    // Glowy Sun - Canvas demo to show graphical applications
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

    // FileMap - sets up bidirectional linking between files on the user's native
    // filesystem, and nodes in the graph
    'builtin://file-mapping': {
        type: 'builtin://Application',
        title: 'FileMap',
        imports: {
            vue: 'builtin://VueApp',
        },
        code: `return {
            init() {
                imports.vue.setAppHtml(\`
                    <h3>Watching Directory: {{dirName}}</h3>
                    <div>
                        <button @click="selectDir()">Select folder</button>
                    </div>
                    <ul>
                        <li v-for="file in files" :id="file.path">
                            <div v-if="file !== selectedFile" @click="expand(file)">
                                {{ file.path }}
                            </div>
                            <div v-else>
                                <div><b>{{ file.path }}</b></div>
                                <div>{{selectedText}}</div>
                            </div>
                        </li>
                    </ul>
                \`);

                // Iterates over every file in a directory and 
                async function walkDir(dir, f) {
                    for await (let file of dir.values()) {
                        if (file.kind === 'directory') {
                            await walkDir(file, f);
                        } else {
                            await f(file);
                        }
                    }
                }

                let app = imports.vue.newApp({
                    el: '#app',
                    data: {
                        dirHandle: null,
                        dirName: "(null)",
                        files: {},
                        selectedFile: null,
                        selectedText: "",
                    },
                    methods: {
                        selectDir() {
                            let numFiles = 0;
                            window.showDirectoryPicker().then(async (dir) => {
                                app.dirHandle = dir;
                                app.dirName = dir.name;
                                let t0 = performance.now();
                                await walkDir(dir, async (file) => {
                                    numFiles++;
                                    let path = (await app.dirHandle.resolve(file)).join('/');
                                    Vue.set(app.files, path, {
                                        handle: file,
                                        name: file.name,
                                        path,
                                    });
                                });
                                console.log('time to sync', numFiles, 'files:',
                                    (performance.now() - t0)/1000);
                            });
                        },
                        expand(file) {
                            app.selectedFile = file;
                            file.handle.getFile().then(async (f) => {
                                let text = await f.text();
                                app.selectedText = text;
                            });
                        },
                    },
                });
            },
        };`,
    },

    // tweet.js Uploader - parses a tweet.json
    'builtin://tweet-js-upload': {
        type: 'builtin://Application',
        title: 'tweet.js Uploader',
        imports: {
            vue: 'builtin://VueApp',
        },
        code: `return {
            init() {
                imports.vue.setAppHtml(\`
                    <h3>Upload your tweet.js</h3>
                    <button @click="openTweetJS()">Select tweet.js</button>
                \`);

                let app = imports.vue.newApp({
                    el: '#app',
                    data: {},
                    methods: {
                        openTweetJS() {
                            showOpenFilePicker({
                                types: [{accept: {'text/javascript': ['.js']}}]
                            }).then(async ([file]) => {
                                let f = await file.getFile();
                                let text = await f.text();
                                console.log('tweet.js length=', text.length);
                            });
                        },
                    },
                });
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
