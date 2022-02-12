const { time } = require('console');
const express = require('express');
const fs = require('fs');

const Twitter = require('twitter-api-v2');
const TwitterApi = Twitter.TwitterApi;

const PORT = process.env.PORT || 8101;

let app = express();
let secrets = JSON.parse(fs.readFileSync('secrets.json'));
let twitter = new TwitterApi(secrets.twitter.bearer);

app.get('/tweets', async (req, res) => {
    let username = req.query['username'];
    // The most recent tweet id on the client
    let latest = req.query['latest_id'];
    try {
        let user = await twitter.v2.userByUsername(username);
        let userid = user.data.id;

        let tweets = [];
        let nextToken = undefined;
        let done = false;
        while (!done) {
            let timeline = await twitter.v2.userTimeline(userid, {
                max_results: 10,
                pagination_token: nextToken,
                'tweet.fields': [
                    'created_at',
                    'referenced_tweets',
                ],
            });

            // if Twitter didn't return any tweets, we're done
            if (timeline.tweets.length === 0) {
                done = true;
            }
            for (let tweet of timeline.tweets) {
                tweets.push(tweet);
                if (tweet.id === latest) {
                    done = true;
                }
            }

            nextToken = timeline.meta.next_token;
        }
        res.json({
            userid,
            tweets,
        });
    } catch (e) {
        console.error('failed to fetch tweets for user ', username);
        console.error(e.stack);
        res.status(500).end();
    }
});

// Host static files out of the public dir
app.use(express.static('public'));

app.listen(PORT, () => {
    console.log('Server started on port:', PORT);
});
