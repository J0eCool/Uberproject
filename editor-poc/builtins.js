// Initialize nodes with all the builtin types and applications
let builtins = {
    // Primitive types (no type imports)
    'builtin://String': {
        type: 'builtin://Type',
        name: "String",
        params: [],
        fields: {},
        types: {},
    },

    // Generic types
    'builtin://Array': {
        type: 'builtin://Type',
        name: "Array",
        params: ['t'],
        fields: {},
        types: {},
    },
    'builtin://Dict': {
        type: 'builtin://Type',
        name: "Dictionary",
        params: ['key', 'val'],
        fields: {},
        types: {},
    },

    // More complex builtin types
    'builtin://Application': {
        type: 'builtin://Type',
        name: "Application",
        params: [],
        fields: {
            title: 'String',
        },
        types: {
            String: ['import', 'builtin://String'],
        },
    },
    'builtin://Type': {
        type: 'builtin://Type',
        name: 'Type',
        // type parameters for generic types, e.g. Array<String>
        params: [],
        // names + types of properties on a type
        // TODO: more than just POD structs
        fields: {
            fields: ['Dict', 'String', 'SExpr'],
            name: 'String',
            params: ['Array', 'TypeName'],
            types: ['Dict', 'TypeName', ['Array', 'String']],
        },
        // type imports; what specific URLs are we referencing
        types: {
            Array: ['import', 'builtin://Array'],
            Dict: ['import', 'builtin://Dict'],
            SExpr: ['variant', 'String', 'SExpr'],
            String: ['import', 'builtin://String'],
            Type: ['import', 'builtin://Type'],
            TypeExpr: ['import', 'builtin://Type'],
            TypeName: ['import', 'builtin://String'],
            Url: ['import', 'builtin://String'],
        },
    },

    // Types for sample apps
    'builtin://Teet': {
        type: 'builtin://Type',
        name: 'Teet',
        fields: {
            description: 'String',
            parent: 'Teet',
        },
        types: {
            String: ['import', 'builtin://String'],
            Teet: ['self'],
        },
    },

    // Applications
    'builtin://NodeViewer': {
        type: 'builtin://Application',
        title: 'Node Viewer',
    },
    'builtin://Teeter': {
        type: 'builtin://Application',
        title: 'Teeter App',
    },
    'builtin://GlowySun': {
        type: 'builtin://Application',
        title: 'A glowy sun',
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
