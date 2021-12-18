import { preloads } from './preloads_core';

// Editor for CommandDescs
preloads['preload://CommandEditor'] = {
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
preloads['preload://command-runner'] = {
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
    preloads['preload://command-' + name] = {
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
