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
