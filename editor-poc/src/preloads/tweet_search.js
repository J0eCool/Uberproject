import { preloads } from './preloads_core';

// Tweet Search - simple tweet data viewer
preloads['preload://tweet-searcher'] = {
    type: 'builtin://Application',
    title: 'Tweet Search',
    imports: {
        graph: 'builtin://Graph',
        tweetSync: 'preload://tweet-sync',
        vue: 'builtin://VueApp',
    },
    initFunc(imports) { return {
        init() {
            imports.tweetSync.fetchTweetsForUser('CountJ0eCool');

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
