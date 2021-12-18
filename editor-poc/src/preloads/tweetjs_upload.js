import { preloads } from './preloads_core';

// tweet.js Uploader - parses a tweet.json
preloads['preload://tweet-js-upload'] = {
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
