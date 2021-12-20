import { preloads } from './preloads_core';

// Tweet Sync - fetches data from the Twitter API (via the Uberproject server)
preloads['preload://tweet-sync'] = {
    type: 'builtin://Library',
    imports: {
        graph: 'builtin://Graph',
    },
    initFunc(imports) { return {
        // fetches the latest tweets for a user and adds new ones to the graph
        fetchTweetsForUser(username) {
            // Check already existing tweets; don't fetch more than we need to,
            // and don't store duplicate tweets
            let oldTweets = imports.graph.loadNodesOfType('preload://Tweet');
            let latestId = 0;
            let tweetsById = {};
            if (oldTweets.length > 0) {
                let latest = oldTweets[0];
                for (let tweet of oldTweets) {
                    if (tweet.time > latest.time) {
                        latest = tweet;
                    }
                    tweetsById[tweet.tweetId] = tweet;
                }
                latestId = latest.tweetId;
            }

            // Fetch the tweets and new ones to the graph
            let params = new URLSearchParams({
                username,
                latest_id: latestId,
            });
            let url = './tweets?' + params;
            fetch(url).then(async (resp) => {
                let data = await resp.json();
                let tweets = [];
                for (let raw of data.tweets) {
                    if (tweetsById[raw.id]) {
                        continue;
                    }
                    let tweet = {
                        type: 'preload://Tweet',
                        links: [],

                        tweetId: raw.id,
                        time: Date.parse(raw.created_at),
                        text: raw.text,
                        user: username,
                        replyId: '',
                    };
                    for (let ref of raw.referenced_tweets || []) {
                        if (ref.type === 'replied_to') {
                            tweet.replyId = ref.id;
                        }
                    }
                    tweets.push(tweet);
                }
                imports.graph.saveNodes(tweets);
            });
        },

        // listen sometimes we make mistakes ok
        deleteJunkTweets() {
            let tweets = imports.graph.loadNodesOfType('preload://Tweet');
            for (let tweet of tweets) {
                if (!tweet.tweetId) {
                    imports.graph.deleteNode(tweet);
                }
            }
        }
    }; },
};
