import {
    generateId,
    loadResource,
 } from "./kernel";

export function loadBuiltinData() {

// Initialize nodes with all the builtin types and applications
const builtins = {};

// Primitive types (no type imports)
function primitive(name, params=[]) {
    builtins['builtin://' + name] = {
        type: 'builtin://Type',
        name: name,
        params: params,
        fields: {},
        methods: {},
        types: {},
    };
}

primitive('Any');
primitive('Empty');
primitive('Float');
primitive('String');

// Generic types
primitive('Array', ['t']);
primitive('Dict', ['key', 'val']);

// More complex builtin types
builtins['builtin://Type'] = {
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
};

// construct function for both Application and Libraries
// there is a better way to factor those but for now this works
function constructRunnable(self, imports) {
    let dyn = self.initFunc(imports);
    for (let key of Object.keys(dyn)) {
        self[key] = dyn[key];
    }
}
builtins['builtin://Application'] = {
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
    construct: constructRunnable,
};
builtins['builtin://Library'] = {
    type: 'builtin://Type',
    name: 'Library',
    params: [],
    fields: {},
    methods: {},
    types: {},
    construct: constructRunnable,
};

// UI Nodes - responsible for drawing to screen
builtins['builtin://UI'] = {
    type: 'builtin://Type',
    name: 'UI',
    params: ['t'],
    fields: {
        target: 'String',
    },
    methods: {
        component: [[], ['Any']],
    },
    types: {
        Any: ['import', 'builtin://Any'],
        String: ['import', 'builtin://String'],
    },
    construct: constructRunnable,
};

// deprecated?
builtins['builtin://VueUI'] = {
    type: 'builtin://Type',
    name: 'UI',
    params: ['t'],
    fields: {},
    methods: {
        component: [[], ['String']],
    },
    types: {
        String: ['import', 'builtin://String'],
    },
    construct: constructRunnable,
};

// Commands - single-function nodes used to chain together command-line style
builtins['builtin://Command'] = {
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
};

// Command descriptions - used to call commands with values passed as parameters
builtins['builtin://CommandDesc'] = {
    type: 'builtin://Type',
    name: 'Command Description',
    params: ['args', 'results'],
    fields: {
        command: 'Command',
        params: 'ParamList',
    },
    methods: {
        // TODO: figure out how to actually parameterize Commands
        run: [['args'], ['results']],
    },
    types: {
        Command: ['import', 'builtin://Command'],
        CommandDesc: ['self'],
        Param: ['import', 'builtin://Any'],
        // Param: ['variant', 'Empty', 'String', 'Float', 'CommandDesc'],
        ParamList: ['import', 'builtin://Array', 'Param'],
        String: ['import', 'builtin://String'],
    },
    construct(self, links) {
        self.run = (...args) => {};
    },
};

// Libraries
builtins['builtin://Graph'] = {
    type: 'builtin://Library',
    initFunc(imports) { return {
        // Magic: this.nodes and this.backlinks gets set by the kernel

        // a raw reference to all the nodes
        // returns Dict<URL, Node>
        getNodes() {
            return this.nodes;
        },

        // a list of all nodes
        // returns Array<Node>
        loadAllNodes() {
            return Object.values(this.nodes).map(loadResource);
        },

        getNode(url) {
            return this.nodes[url];
        },

        // A list of all Nodes matching a specific type, loaded into Resources
        // URL -> Array<Resource>
        loadNodesOfType(ty) {
            let ret = [];
            for (let node of Object.values(this.nodes)) {
                // todo: subtyping :D
                if (node.type === ty) {
                    ret.push(loadResource(node));
                }
            }
            return ret;
        },

        // A dict of all type nodes, indexed by id
        getTypeNodes() {
            let typeNodes = this.loadNodesOfType('builtin://Type');
            let types = {};
            for (let node of typeNodes) {
                types[node.id] = node;
            }
            return types;
        },

        getBacklinks() {
            return this.backlinks;
        },
        getBacklinksFor(url) {
            return this.backlinks[url];
        },

        saveNodes(nodes) {
            for (let node of nodes) {
                let id = generateId();
                node.id = id;
            }
            saveNodes(nodes);
        },

        // todo: getnode/setnode should live here?
    }; },
};
builtins['builtin://VueApp'] = {
    type: 'builtin://Library',
    initFunc(imports) { return {
        // TODO: deprecated
        setAppHtml(html) {
            document.getElementById('app').innerHTML = html;
        },
        newApp(params) {
            return new Vue(params);
        },

        app(template, params) {
            document.getElementById('app').innerHTML = template;
            return new Vue({
                el: '#app',
                ...params,
            });
        },
        component(name, params) {
            return Vue.component(name, params);
        },
    }; },
};
builtins['builtin://CanvasApp'] = {
    type: 'builtin://Library',
    imports: {
        'vue': 'builtin://VueApp',
    },
    initFunc(imports) { return {
        init(width, height) {
            imports.vue.setAppHtml(`
                <canvas id='canvas' width=${width} height=${height}
                    style="position:absolute;left:0px;top:0px;
                    width:100%;max-height:100%;
                    object-fit:contain;image-rendering:pixelated"
                ></canvas>
            `);
            let canvas = document.getElementById('canvas');
            this.width = width;
            this.height = height;
            this.ctx = canvas.getContext('2d');
            this.pixels = new Uint8Array(4 * width * height);
            this.image = this.ctx.createImageData(width, height);
        },
    }; },
};
    
//-----------------------
// Applications

let preload = {};
// Launcher - Simple launcher for Applications
preload['preload://launcher'] = {
    type: 'builtin://Application',
    title: 'Launcher',
    imports: {
        graph: 'builtin://Graph',
        vue: 'builtin://VueApp',
    },
    initFunc(imports) { return {
        init() {
            imports.vue.setAppHtml(`
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
            `);

            let app = imports.vue.newApp({
                el: '#app',
                data: {
                    searchType: '',
                    nodes: imports.graph.getNodes(),
                },
            });
        },
    }; },
};

// Node viewer - inspect every node in the graph
preload['preload://node-viewer'] = {
    type: 'builtin://Application',
    title: 'Node Viewer',
    imports: {
        graph: 'builtin://Graph',
    },
    initFunc(imports) { return {
        init() {
            let types = imports.graph.getTypeNodes();

            // Shows generic nodes, used as a fallback
            class DefaultNodeView extends React.Component {
                render() {
                    let node = this.props.node;
                    let type = types[node.type];
                    let idElem = <b>{node.id}</b>;
                    if (node.type === 'builtin://Application') {
                        idElem = <a href={'./?app=' + node.id}>{idElem}</a>;
                    }

                    function Links(props) {
                        if (props.links.length === 0) {
                            return null;
                        }
                        return <li>{props.name}
                            <ul>{props.links.map((link) =>
                                <li key={link}><a href={'#' + link}>{link}</a></li>)}
                            </ul>
                        </li>;
                    }

                    let linkElem = <Links name="Links" links={node.links} />;
                    let backlinks = imports.graph.getBacklinksFor(node.id);
                    let backlinkElem = <Links name="Backlinks" links={backlinks} />;
                    return <div id={node.id}>
                        {idElem} - {type.name}
                        <ul>
                            {linkElem}
                            {backlinkElem}
                            {Object.keys(type.fields).map((key) =>
                                <li key={key}>{key}: {node[key].toString()}</li>
                            )}
                        </ul>
                    </div>;
                }
            }

            class TweetView extends React.Component {
                render() {
                    let tweet = this.props.node;
                    return <div>
                        <a href={tweet.url()}>{ this.formatTime(tweet) }</a>
                        <div>{this.htmlEncode(tweet.text)}</div>
                    </div>;
                }

                htmlEncode(str) {
                    let ret = [];
                    for (let elem of str.split('\n')) {
                        if (ret.length > 0) {
                            ret.push(<br key={ret.length}/>);
                        }
                        ret.push(elem);
                    }
                    return ret;
                }
                formatTime(tweet) {
                    let date = new Date(tweet.time);
                    return date.toLocaleString();
                }
            }

            let viewTable = {
                'preload://Tweet': TweetView,
            };
            class NodeViewer extends React.Component {
                render() {
                    let View = viewTable[this.props.node.type] || DefaultNodeView;
                    return <View node={this.props.node} />;
                }
            }

            class App extends React.Component {
                constructor(props) {
                    super(props);
                    this.state = {
                        searchType: '',
                    }

                    this.searchChanged = this.searchChanged.bind(this);
                }
                render() {
                    let contents = [];
                    for (let node of this.props.nodes) {
                        if (this.searchMatches(node)) {
                            contents.push(<li key={node.id}>
                                <NodeViewer node={node} />
                            </li>);
                        }
                        if (contents.length > 100) {
                            // todo: for real
                            break;
                        }
                    }
                    return <div>
                        <h3>Search</h3>
                        <input value={this.state.searchType} onChange={this.searchChanged} />
                        <h3>Nodes</h3>
                        <ul>{contents}</ul>
                    </div>;
                }

                searchMatches(node) {
                    return node.type.toLowerCase().indexOf(this.state.searchType.toLowerCase()) >= 0;
                }
                searchChanged(event) {
                    this.setState({searchType: event.target.value});
                }
            }

            let nodes = imports.graph.loadAllNodes();
            let app = <App nodes={nodes} />;
            ReactDOM.render(app, document.getElementById('app'));
        },
    }; }
};

// Tooter - threaded messages with replies, little else
preload['preload://Toot'] = {
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
};
preload['preload://tooter'] = {
    type: 'builtin://Application',
    title: 'Tooter App',
    imports: {
        graph: 'builtin://Graph',
        vue: 'builtin://VueApp',
    },
    initFunc(imports) { return {
        init() {
            imports.vue.setAppHtml(`
                <h3>Tooter</h3>
                <ul>
                <toot v-for="node in nodes"
                    v-if="node.type === 'preload://Toot' && node.parent === null"
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
            `);

            imports.vue.component('toot-writer', {
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
            imports.vue.component('toot', {
                props: ['node', 'nodes', 'selected'],
                template:
                    `<li>
                        {{node.description}}
                        <button @click="$emit('select', node)">Reply</button>
                        <ul>
                            <toot v-for="child in nodes"
                                v-if="child.type === 'preload://Toot' && child.parent === node.id"
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
                    </li>`,
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
                            type: 'preload://Toot',
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
    }; },
};

// Glowy Sun - Canvas demo to show graphical applications
preload['preload://glowy-sun'] = {
    type: 'builtin://Application',
    title: 'A glowy sun',
    imports: {
        canvas: 'builtin://CanvasApp',
    },
    initFunc(imports) { return {
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
    }; },
};

// FileMap - sets up bidirectional linking between files on the user's native
// filesystem, and nodes in the graph
preload['preload://file-mapping'] = {
    type: 'builtin://Application',
    title: 'FileMap',
    imports: {
        vue: 'builtin://VueApp',
    },
    initFunc(imports) { return {
        init() {
            imports.vue.setAppHtml(`
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
            `);

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
    }; },
};

// Tweet applications
preload['preload://Tweet'] = {
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
    construct(self, links) {
        self.url = () => {
            return `http://www.twitter.com/${self.user}/status/${self.tweetId}`;
        };
    },
};
// tweet.js Uploader - parses a tweet.json
preload['preload://tweet-js-upload'] = {
    type: 'builtin://Application',
    title: 'tweet.js Uploader',
    imports: {
        graph: 'builtin://Graph',
        vue: 'builtin://VueApp',
    },
    initFunc(imports) { return {
        init() {
            imports.vue.setAppHtml(`
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
            `);

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
                                    type: 'preload://Tweet',
                                    links: [],

                                    tweetId: raw['id'],
                                    time: Date.parse(raw['created_at']),
                                    text: raw['full_text'],
                                    user: app.username,
                                    replyId: raw['in_reply_to_status_id'] || '',
                                };
                                tweets.push(tweet);
                                
                                if ((i % 100) === 0) {
                                    app.status = `Loading ${i+1} / ${rawTweets.length}...`;
                                }
                            }
                            imports.graph.saveNodes(tweets);
                            app.status = `Loaded ${rawTweets.length} Tweets!`;
                        });
                    },
                },
            });
        },
    }; },
};
// Tweet Search - simple tweet data viewer
preload['preload://tweet-searcher'] = {
    type: 'builtin://Application',
    title: 'Tweet Search',
    imports: {
        graph: 'builtin://Graph',
        vue: 'builtin://VueApp',
    },
    initFunc(imports) { return {
        init() {
            imports.vue.setAppHtml(`
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
                        <a :href="tweet.url()">{{ formatTime(tweet) }}</a>
                        <div v-html="htmlEncode(tweet.text)"></div>
                    </li>
                </ul>
            `);

            let tweets = imports.graph.loadNodesOfType('preload://Tweet');
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
                            .replaceAll('\n', '<br>')
                            ;
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
    }; },
};

// Editor for CommandDescs
preload['preload://CommandEditor'] = {
    type: 'builtin://VueUI',
    imports: {
        graph: 'builtin://Graph',
    },
    initFunc(imports) { return {
        component() {
            let commands = imports.graph.loadNodesOfType('builtin://Command');
            let types = imports.graph.getTypeNodes();
            return {
                name: 'command-editor',
                props: ['run', 'expectedType', 'results'],
                data() {
                    return {
                        commands,
                        types,
                        search: '',
                    };
                },
                template: `<div>
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
                                :results="results"
                            ></command-editor>
                        </li>
                        </ul>
                        <button @click="execute(run)">Run</button>
                    </div>
                </div>`,
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

                        this.results.items = ret.slice(0, 100);
                        this.results.count = ret.length;
                    },
                },
            };
        },
    }; }
};

// "Command line"
preload['preload://command-runner'] = {
    type: 'builtin://Application',
    title: 'Command Runner',
    imports: {
        graph: 'builtin://Graph',
        vue: 'builtin://VueApp',
        commandEditor: 'preload://CommandEditor',
    },
    initFunc(imports) { return {
        init() {
            let types = imports.graph.getTypeNodes();

            imports.vue.app(`
                <h3>Command</h3>
                <command-editor
                    :run="run"
                    :expected-type="'builtin://Any'"
                    :results="results"
                ></command-editor>
                <h3>Results</h3>
                <div>{{results.count}} results</div>
                <ul>
                <li v-for="node in results.items">
                    <b>{{node.id}}</b> - {{types[node.type].name}}
                    <ul>
                    <li v-for="type, key in types[node.type].fields">
                        {{key}}: {{node[key]}}
                    </li>
                    </ul>
                </li>
                </ul>
            `, {
                data: {
                    run: {
                        command: null,
                        args: {},
                    },
                    types,
                    results: {
                        items: [],
                        count: 0,
                    },
                },
                components: {
                    'command-editor': imports.commandEditor.component(),
                },
            });
        },
    }; },
};

// Add some Commands in a simpler way
function addCommand(name, args, ret, code) {
    preload['preload://command-' + name] = {
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
    return graph.loadNodesOfType(type);
`);
addCommand('filter', [
    ['nodes', 'builtin://Array'],
    ['predicate', 'builtin://Command'],
], 'builtin://Array', `
    // this isn't going to work lol
    return nodes.filter((n) => predicate.evaluate(n));
`);

preload['preload://note-editor'] = {
    type: 'builtin://Application',
    title: 'Note Editor',
    imports: {
        graph: 'builtin://Graph',
    },
    initFunc(imports) { return {
        init() {
            class App extends React.Component {
                render() {
                    return <div>
                        <h3>Coming soon!</h3>
                    </div>;
                }
            }

            let app = <App />;
            ReactDOM.render(app, document.getElementById('app'));
        },
    }; },
};

// -----------------------------------------------------------------------------

// combine preload with builtins, because they're really just for organization
Object.assign(builtins, preload);

// Initialize any un-set fields that all Nodes need
for (let id in builtins) {
    let node = builtins[id];
    node.id = id;
    node.links = [];

    // auto-populate links for type imports
    if (node.type === 'builtin://Type') {
        if (node.params === undefined) {
            node.params = [];
        }
        for (let ty of Object.keys(node.types)) {
            let loader = node.types[ty];
            if (loader[0] === 'import' && !node.links.includes(loader[1])) {
                node.links.push(loader[1]);
            }
        }
    }
}

return builtins;
}
