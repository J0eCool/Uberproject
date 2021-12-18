import { preloads } from './preloads_core';

// FileMap - sets up bidirectional linking between files on the user's native
// filesystem, and nodes in the graph
preloads['preload://file-map'] = {
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
