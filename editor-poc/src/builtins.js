import {
    generateId,
    loadResource,
} from "./kernel";
import { preloads } from './preloads/preloads';

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
    
// -----------------------------------------------------------------------------

// combine preload with builtins, because they're really just for organization
Object.assign(builtins, preloads);

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
