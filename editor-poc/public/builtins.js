
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
    'builtin://Float': {
        type: 'builtin://Type',
        name: 'Float',
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
        construct(self, links) {
            let dyn = new Function('imports', '"use strict";\n' + self.code)(links);
            for (let key of Object.keys(dyn)) {
                self[key] = dyn[key];
            }
        },
    },
    'builtin://Library': {
        type: 'builtin://Type',
        name: 'Library',
        params: [],
        fields: {},
        methods: {},
        types: {},
        // todo: this is redundant with Application
        construct(self, links) {
            let dyn = new Function('imports', '"use strict";\n' + self.code)(links);
            for (let key of Object.keys(dyn)) {
                self[key] = dyn[key];
            }
        },
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
                let ret = [];
                for (let node of Object.values(this.nodes)) {
                    // todo: subtyping :D
                    if (node.type === ty) {
                        ret.push(loadResource(node));
                    }
                }
                return ret;
            },

            getBacklinks() {
                return this.backlinks;
            },

            saveNodes(nodes) {
                for (let node of nodes) {
                    let id = generateId();
                    if (this.nodes[id]) {
                        console.warn('overwriting:', this.nodes[id], 'with', node, '!');
                    }
                    node.id = id;
                }
                saveNodes(nodes);
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
                    <div>
                        This application will someday bidirectionally sync graph
                        data with a folder in the native filesystem. The idea is
                        that there will be multiple FileSync plugins that parse
                        a raw File into user-specified types, and vice-versa to
                        support native file interop, allowing this system to be
                        used for real work without having to go all-in on it.
                        <br>
                        For now all it does is bulk-import all .md files in a
                        folder into WikiPage nodes, one-way.
                    </div>
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

    // Tweet applications
    'builtin://Tweet': {
        type: 'builtin://Type',
        name: 'Tweet',
        fields: {
            tweetId: 'String',
            time: 'Time',
            text: 'String',
            user: 'String',
            replyId: 'String',
        },
        methods: {},
        types: {
            String: ['import', 'builtin://String'],
            Time: ['import', 'builtin://Float'],
            Tweet: ['self'],
        },
    },
    // tweet.js Uploader - parses a tweet.json
    'builtin://tweet-js-upload': {
        type: 'builtin://Application',
        title: 'tweet.js Uploader',
        imports: {
            graph: 'builtin://Graph',
            vue: 'builtin://VueApp',
        },
        code: `return {
            init() {
                imports.vue.setAppHtml(\`
                    <h3>Upload your tweet.js</h3>
                    <div>{{ status }}</div>
                    <div>
                        Username: <input v-model="username">
                    </div>
                    <button @click="openTweetJS()">Select tweet.js</button>
                    <div>
                        This application is a bulk-upload of tweets from a Twitter
                        archive file, saved as tweet.js.
                        <br>
                        Currently you need to manually specify the username,
                        because that's not directly present in tweet.js.
                        <br>
                        In the future, this could use the entire archive to upload
                        images and other media. For now it just grabs the text of
                        your tweets. (This would also make it possible to automatically
                        fill in your username.)
                    </div>
                \`);

                let app = imports.vue.newApp({
                    el: '#app',
                    data: {
                        username: "",
                        status: "",
                    },
                    methods: {
                        openTweetJS() {
                            if (!app.username) {
                                app.status = 'Error: Need to manually set user name!';
                                return;
                            }
                            showOpenFilePicker({
                                types: [{accept: {'text/javascript': ['.js']}}]
                            }).then(async ([file]) => {
                                let f = await file.getFile();
                                let text = await f.text();
                                let [_, body] = text.split('window.YTD.tweet.part0 = ');
                                if (!body) {
                                    app.status = 'Error: unknown formatting in tweet.js';
                                    throw 'parse error';
                                }

                                let rawTweets = JSON.parse(body);
                                let tweets = [];
                                for (let i = 0; i < rawTweets.length; ++i) {
                                    let raw = rawTweets[i]['tweet'];
                                    let tweet = {
                                        type: 'builtin://Tweet',
                                        links: [],

                                        tweetId: raw['id'],
                                        time: Date.parse(raw['created_at']),
                                        text: raw['full_text'],
                                        user: app.username,
                                        replyId: raw['in_reply_to_status_id'] || '',
                                    };
                                    tweets.push(tweet);
                                    
                                    if ((i % 100) === 0) {
                                        app.status = \`Loading \${i+1} / \${rawTweets.length}...\`;
                                    }
                                }
                                imports.graph.saveNodes(tweets);
                                app.status = \`Loaded \${rawTweets.length} Tweets!\`;
                            });
                        },
                    },
                });
            },
        };`,
    },
    // Tweet Search - simple tweet data viewer
    'builtin://tweet-searcher': {
        type: 'builtin://Application',
        title: 'Tweet Search',
        imports: {
            graph: 'builtin://Graph',
            vue: 'builtin://VueApp',
        },
        code: `return {
            init() {
                imports.vue.setAppHtml(\`
                    <h3>Tweet Search</h3>
                    <div>
                        Search: <input v-model="searchText" @input="searchChanged()">
                    </div>
                    <div>Num Results: {{numResults}}</div>
                    <div>
                        <button @click="searchPage--">&lt;&lt;</button>
                        Page {{searchPage + 1}}
                        <button @click="searchPage++">&gt;&gt;</button>
                    </div>
                    <ul>
                        <li v-for="tweet in searchResults[searchPage]">
                            <a :href="url(tweet)">{{ formatTime(tweet) }}</a>
                            <div v-html="htmlEncode(tweet.text)"></span>
                        </li>
                    </ul>
                \`);

                let tweets = imports.graph.getNodesOfType('builtin://Tweet');
                let self = this;
                self.resultsPerPage = 25;
                self.app = imports.vue.newApp({
                    el: '#app',
                    data: {
                        tweets,
                        numResults: 0,
                        searchText: '',
                        searchResults: [[]],
                        searchPage: 0,
                    },
                    methods: {
                        searchChanged() {
                            self.app.searchPage = 0;
                            self.app.searchResults = [];
                            self.app.numResults = 0;

                            let page = [];
                            for (let tweet of self.app.tweets) {
                                if (matches(tweet, self.app.searchText)) {
                                    page.push(tweet);
                                    self.app.numResults++;
                                }
                                if (page.length >= self.resultsPerPage) {
                                    self.app.searchResults.push(page);
                                    page = [];
                                }
                            }
                            // Always add the last page (or an empty page if no results)
                            if (page || !self.app.searchResults) {
                                self.app.searchResults.push(page);
                            }
            
                            function matches(tweet, text) {
                                return tweet.text.toLowerCase()
                                    .indexOf(text.toLowerCase()) >= 0;
                            }
                        },

                        htmlEncode(str) {
                            return str
                                .replaceAll('&', '&amp;')
                                .replaceAll('<', '&lt;')
                                .replaceAll('>', '&gt;')
                                .replaceAll('"', '&quot;')
                                .replaceAll('\\n', '<br>')
                                ;
                        },
                        url(tweet) {
                            return \`http://www.twitter.com/\${tweet.user}/status/\${tweet.tweetId}\`;
                        },
                        formatTime(tweet) {
                            let date = new Date(tweet.time);
                            return date.toLocaleString();
                        },
                    },
                });
                // initialize search data
                self.app.searchChanged();
            },
        };`,
    },

    // "Command line"
    'builtin://Command': {
        type: 'builtin://Type',
        name: 'Command',
        params: ['args', 'results'],
        fields: {
            name: 'String',
            arguments: 'ArgList',
            returns: 'Type',
            code: 'String',
        },
        methods: {
            // TODO: figure out how to actually parameterize Commands
            run: [['args'], ['results']],
        },
        types: {
            Argument: ['tuple', 'String', 'Type'],
            ArgList: ['import', 'builtin://Array', 'Argument'],
            String: ['import', 'builtin://String'],
            Type: ['import', 'builtin://Type'],
        },
    },
    'builtin://command-runner': {
        type: 'builtin://Application',
        title: 'Command Runner',
        imports: {
            graph: 'builtin://Graph',
            vue: 'builtin://VueApp',
        },
        code: `return {
            init() {
                imports.vue.setAppHtml(\`
                    <h3>Command</h3>
                    <command-editor
                        :run="run"
                        :expected-type="'builtin://Any'"
                        :commands="commands"
                        :results="results"
                        :types="types"
                    ></command-editor>
                    <h3>Result</h3>
                    <ul>
                    <li v-for="node in results">
                        <b>{{node.id}}</b> - {{types[node.type].name}}
                        <ul>
                        <li v-for="type, key in types[node.type].fields">
                            {{key}}: {{node[key]}}
                        </li>
                        </ul>
                    </li>
                    </ul>
                \`);

                imports.vue.component('command-editor', {
                    props: ['run', 'expectedType', 'commands', 'results', 'types'],
                    data() {
                        return {
                            search: '',
                        };
                    },
                    template: \`<div>
                        <div v-if="run.command === null">
                            <button v-for="cmd in commands"
                                v-if="(expectedType === 'builtin://Any' || cmd.returns === expectedType) && cmd.name.indexOf(search) >= 0"
                                @click="setCommand(cmd)"
                            > {{ cmd.name }} </button>
                            <br>
                            <input v-model="search">
                        </div>
                        <div v-else>
                            {{run.command.name}} <button @click="setCommand(null)">x</button>
                            <ul>
                            <li v-for="arg in run.command.arguments">
                                <div>{{arg[0]}}: {{types[arg[1]].name}}</div>
                                <div v-if="isPrimitive(arg[1])">
                                    <input v-model="run.args[arg[0]].command">
                                </div>
                                <command-editor v-else
                                    :run="run.args[arg[0]]"
                                    :expected-type="arg[1]"
                                    :commands="commands"
                                    :results="results"
                                    :types="types"
                                ></command-editor>
                            </li>
                            </ul>
                            <button @click="execute(run)">Run</button>
                        </div>
                    </div>\`,
                    methods: {
                        setCommand(cmd) {
                            this.run.command = cmd;
                            this.run.args = {};
                            if (cmd) {
                                for (let arg of cmd.arguments) {
                                    this.run.args[arg[0]] = {
                                        command: null,
                                        args: {},
                                    };
                                }
                            }
                            this.$forceUpdate();
                        },
                        isPrimitive(ty) {
                            return [
                                'builtin://String',
                                'builtin://Float',
                            ].indexOf(ty) >= 0;
                        },
                        // evaluate runs a command directly, returning the result
                        evaluate(run) {
                            let argNames = run.command.arguments.map((arg) => arg[0]);
                            let fn = new Function(...argNames, run.command.code);
                            let args = run.command.arguments.map((arg) => {
                                if (this.isPrimitive(arg[1])) {
                                    return run.args[arg[0]].command;
                                } else {
                                    return this.evaluate(run.args[arg[0]]);
                                }
                            });
                            return fn(...args);
                        },
                        // execute runs a specific command and displays the result
                        execute(run) {
                            let ret = this.evaluate(run);
                            if (!Array.isArray(ret)) {
                                ret = [ret];
                            }
                            // Store results in-place
                            this.results.length = 0;
                            this.results.unshift(...ret);
                        },
                    },
                });

                let commands = imports.graph.getNodesOfType('builtin://Command');
                let typeNodes = imports.graph.getNodesOfType('builtin://Type');
                let types = {};
                for (let node of typeNodes) {
                    types[node.id] = node;
                }
                let app = imports.vue.newApp({
                    el: '#app',
                    data: {
                        run: {
                            command: null,
                            args: {},
                        },
                        commands,
                        types,
                        results: [],
                    },
                    methods: {
                    },
                });
            },
        };`,
    },
};

// Add some Commands in a simpler way
function addCommand(name, args, ret, code) {
    builtins['builtin://command-' + name] = {
        type: 'builtin://Command',
        name,
        arguments: args,
        returns: ret,
        code,
    };
}
addCommand('graph', [], 'builtin://Library', `
    return loadResource(builtins['builtin://Graph']);
`);
addCommand('nodes', [
    ['graph', 'builtin://Library'],
    ['type', 'builtin://String'],
], 'builtin://Array', `
    return graph.getNodesOfType(type);
`);
addCommand('filter', [
    ['nodes', 'builtin://Array'],
    ['predicate', 'builtin://Command'],
], 'builtin://Array', `
    // this isn't going to work lol
    return nodes.filter((n) => predicate.evaluate(n));
`);

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
