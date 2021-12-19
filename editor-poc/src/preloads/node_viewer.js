import { preloads } from './preloads_core';

// Node viewer - inspect every node in the graph
preloads['preload://node-viewer'] = {
    type: 'builtin://Application',
    title: 'Node Viewer',
    imports: {
        graph: 'builtin://Graph',
    },
    initFunc(imports) { return {
        init() {
            let types = imports.graph.getTypeNodes();

            // Shows generic nodes, used as a fallback
            function DefaultNodeView(props) {
                let node = props.node;
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

            function TweetView(props) {
                let tweet = props.node;
                return <div>
                    <a href={tweet.url()}>{ formatTime(tweet) }</a>
                    <div>{htmlEncode(tweet.text)}</div>
                </div>;

                function htmlEncode(str) {
                    let ret = [];
                    for (let elem of str.split('\n')) {
                        if (ret.length > 0) {
                            ret.push(<br key={ret.length}/>);
                        }
                        ret.push(elem);
                    }
                    return ret;
                }
                function formatTime(tweet) {
                    let date = new Date(tweet.time);
                    return date.toLocaleString();
                }
            }

            let viewTable = {
                'preload://Tweet': TweetView,
            };
            function NodeViewer(props) {
                let View = viewTable[props.node.type] || DefaultNodeView;
                return <View node={props.node} />;
            }

            function App(props) {
                let [searchType, setSearchType] = useState('');

                function searchMatches(node) {
                    return node.type.toLowerCase().indexOf(searchType.toLowerCase()) >= 0;
                }
                function searchChanged(event) {
                    setSearchType(event.target.value);
                }

                let contents = [];
                for (let node of props.nodes) {
                    if (searchMatches(node)) {
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
                    Type <input value={searchType} onChange={searchChanged} />
                    <h3>Nodes</h3>
                    <ul>{contents}</ul>
                </div>;
            }

            let nodes = imports.graph.loadAllNodes();
            let app = <App nodes={nodes} />;
            ReactDOM.render(app, document.getElementById('app'));
        },
    }; }
};
