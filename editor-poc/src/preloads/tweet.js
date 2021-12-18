import { preloads } from './preloads_core';

// Tweet applications
preloads['preload://Tweet'] = {
    type: 'builtin://Type',
    name: 'Tweet',
    fields: {
        tweetId: 'String',
        time: 'Time',
        text: 'String',
        user: 'String',
        replyId: 'String',
    },
    methods: {},
    types: {
        String: ['import', 'builtin://String'],
        Time: ['import', 'builtin://Float'],
        Tweet: ['self'],
    },
    construct(self, links) {
        self.url = () => {
            return `http://www.twitter.com/${self.user}/status/${self.tweetId}`;
        };
    },
};
