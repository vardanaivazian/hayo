require('dotenv').config(); // Load environment variables

const environment = process.env.NODE_ENV || 'development';

const commonConfig = {
    baseUrl: 'https://sss.ortak1.me',
    headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9,ru;q=0.8',
        'content-type': 'text/plain;charset=UTF-8',
        'origin': 'https://sss.ortak1.me',
        'priority': 'u=1, i',
        'referer': 'https://sss.ortak1.me/en/marketplace/collections',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'x-session-token': 'undefined'
    },

    withCredentials: true  // This tells axios to send cookies with the request
};

const environments = {
    development: {
        ...commonConfig,
        farmerToken: process.env.FARMER_TELEGRAM_TOKEN,
        token: process.env.DEV_TELEGRAM_TOKEN, // Token from .env or environment variable
        yoToken: process.env.DEV_YO_TOKEN,
        yoChannelId: process.env.DEV_YO_CHANNEL_ID,
        channelId: process.env.DEV_CHANNEL_ID, // Channel ID from .env or environment variable
        farmerChannelId: process.env.FARMER_CHANNEL_ID, // Channel ID from .env or environment variable
        wsUrl: 'wss://sss.ortak1.me/feed',
        debug: true,
        mainInterval: 120000,
        newCollectionInterval: 900000
    },
    production: {
        ...commonConfig,
        token: process.env.PROD_TELEGRAM_TOKEN, // Token from .env or environment variable
        farmerToken: process.env.FARMER_TELEGRAM_TOKEN,
        yoToken: process.env.PROD_YO_TOKEN, // Token from .env or environment variable
        yoChannelId: process.env.PROD_YO_CHANNEL_ID,
        channelId: process.env.PROD_CHANNEL_ID, // Channel ID from .env or environment variable
        farmerChannelId: process.env.FARMER_CHANNEL_ID, // Channel ID from .env or environment variable
        wsUrl: 'wss://sss.ortak1.me/feed',
        debug: false,
        mainInterval: 120000, //2 minutes
        newCollectionInterval: 900000 //15 minutes
    }
};

const config = environments[environment];

console.log(`Running in ${environment} mode`);
if (config.debug) {
    console.log('Debug mode enabled');
}

module.exports = config;