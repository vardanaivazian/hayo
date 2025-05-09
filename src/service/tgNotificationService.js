const TelegramBot = require('node-telegram-bot-api');
const {
    formatNftMessage,
    formatChangeMessage,
    formatFarmerChangeMessage,
    formatRewardMessage,
    formatNewCollectionMessage,
    formatLastChanceMessage,
    formatFinishingSnowballsMessage,
    formatCollectionHashtag
} = require('../util/messageFormatter');
const {token, channelId, farmerToken, farmerChannelId} = require('../config');
const {isSnowBall} = require('../util/common');

class TgNotificationService {
    constructor() {
        if (!token || !farmerToken) {
            throw new Error('Telegram Bot Tokens not provided in config!');
        }
        this.bot = new TelegramBot(token, {polling: false});
        this.farmerBot = new TelegramBot(farmerToken, {polling: false});
        this.pendingOperations = new Map();
    }

    async executeWithRateLimit(fn, key = 'default') {
        // If we don't have a queue for this key yet, create one
        if (!this.pendingOperations.has(key)) {
            this.pendingOperations.set(key, []);
        }

        const queue = this.pendingOperations.get(key);

        // Create a promise that will be resolved when it's this function's turn
        return new Promise((resolve, reject) => {
            const task = async () => {
                try {
                    // Add delay if there's been a recent operation
                    const lastOp = queue[0]?.lastExecution || 0;
                    const now = Date.now();
                    const elapsed = now - lastOp;

                    if (elapsed < 3000 && queue.length > 0) {
                        const delay = 3000 - elapsed;
                        await new Promise(r => setTimeout(r, delay));
                    }

                    // Execute the function
                    try {
                        const result = await fn();
                        resolve(result);
                    } catch (error) {
                        // Handle rate limit errors
                        if (error.message && error.message.includes('Too Many Requests')) {
                            // Extract retry after time
                            const retryMatch = error.message.match(/retry after (\d+)/);
                            const retryAfter = retryMatch ? parseInt(retryMatch[1]) : 16;

                            console.log(`Rate limited. Waiting ${retryAfter} seconds before retry.`);

                            // Wait for the specified time
                            await new Promise(r => setTimeout(r, retryAfter * 1000));

                            // Try again
                            try {
                                const retryResult = await fn();
                                resolve(retryResult);
                            } catch (retryError) {
                                reject(retryError);
                            }
                        } else {
                            reject(error);
                        }
                    }
                } finally {
                    // Mark this execution time
                    queue[0].lastExecution = Date.now();

                    // Remove this task from the queue
                    queue.shift();

                    // Execute the next task if there is one
                    if (queue.length > 0) {
                        queue[0].execute();
                    }
                }
            };

            // Add this task to the queue
            queue.push({
                execute: task,
                lastExecution: 0
            });

            // If this is the only task, execute it immediately
            if (queue.length === 1) {
                task();
            }
        });
    }

    async sendNftAlert(nft, collection, previousLowestNft) {
        const nftDetails = {
            nft: {
                id: nft.id,
                name: nft.name,
                slug: nft.slug,
                price: nft.price,
                lastSoldPrice: nft.lastSoldPrice,
                fileThumb: nft.fileThumb,
                previousLowest: previousLowestNft.price
            },
            originalPrice: collection.originalPrice,
            marketPrice: nft.marketPrice,
            remuneration: nft.remuneration,
            rewardDate: collection.rewardDate
        };

        const message = formatNftMessage(nftDetails);

        const nftLink = `https://sss.ortak.me/en/nfts/${nft.slug}`;
        const collectionLink = `https://sss.ortak.me/en/collections/${collection.slug}/nfts`;

        const options = {
            caption: message,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: '🔍 NFT', url: nftLink},
                        {text: '📊 Collection', url: collectionLink}
                    ]
                ]
            }
        };
        const modifiedFileThumb = this.replaceOrtak1SubdomainFromImageURL(nft.fileThumb);
        try {
            await this.executeWithRateLimit(
                () => this.bot.sendPhoto(channelId, modifiedFileThumb, options),
                'main_bot'
            );
            console.log(`Sent alert for NFT ${nft.name}`);
        } catch (error) {
            console.error('Error sending Telegram message:', error.message);
            throw error;
        }
    }

    async sendPercentageChangeAlert(collection, oldPercentage, latestGGR, image) {

        let {message, url, buttonViewText} = formatChangeMessage(collection, oldPercentage, latestGGR, true);
        message += this.getPercentageChangeHash(collection);

        const options = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `${buttonViewText}`,
                        url: url
                    }]
                ]
            }
        };

        try {
            await this.executeWithRateLimit(
                () => this.bot.sendPhoto(
                    channelId,
                    image,
                    {
                        caption: message,
                        parse_mode: 'Markdown',
                        reply_markup: options.reply_markup,
                    }
                ),
                "main_bot"
            );

            console.log(`Sent percentage change alert for ${collection.name}`);
        } catch (error) {
            console.error('Error sending percentage change alert with thumbnail:', error.message);
        }
    }

    async sendFarmerPercentageChangeAlert(collection, oldPercentage, latestGGR, image) {

        const {message, url, fastUrl} = formatFarmerChangeMessage(collection, oldPercentage, latestGGR);

        const options = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'SSS',
                            url: url
                        },
                        {
                            text: 'Fast',
                            url: fastUrl
                        }
                    ]
                ]
            }
        };

        try {
            await this.executeWithRateLimit(
                () => this.farmerBot.sendPhoto(
                    farmerChannelId,
                    image,
                    {
                        caption: message,
                        parse_mode: 'Markdown',
                        reply_markup: options.reply_markup,
                    }
                ),
                "farmer_bot"
            );
            console.log(`Sent percentage change alert for ${collection.name}`);
        } catch (error) {
            console.error('Error sending percentage change alert with thumbnail:', error.message);
        }
    }

    async sendNewCollectionAlert(collection) {
        let {message, url, buttonViewText} = formatNewCollectionMessage(collection, true);
        message += this.getNewCollectionHash(collection);
        let hayoObj = formatNewCollectionMessage(collection, true, true);
        const options = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `${buttonViewText}`,
                        url: url
                    }]
                ]
            }
        };
        const hayoOptions = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `${hayoObj.buttonViewText}`,
                        url: hayoObj.url
                    }]
                ]
            }
        };
        const modifiedImageURL = this.replaceOrtak1SubdomainFromImageURL(collection.bgImage);
        try {
            await this.executeWithRateLimit(
                () => this.bot.sendPhoto(
                    channelId,
                    modifiedImageURL,
                    {
                        caption: message,
                        parse_mode: 'Markdown',
                        reply_markup: options.reply_markup,
                    }
                ),
                "main_bot"
            );
            await this.executeWithRateLimit(
                () => this.farmerBot.sendPhoto(
                    farmerChannelId,
                    modifiedImageURL,
                    {
                        caption: hayoObj.message,
                        parse_mode: 'Markdown',
                        reply_markup: hayoOptions.reply_markup,
                    }
                ),
                "hayo_bot"
            );
            console.log(`Sent new collection alert for ${collection.name}`);
        } catch (error) {
            console.error('Error sending new collection alert:', error);
        }
    }

    async sendLastChanceAlert(collection) {
        let {message, url, buttonViewText} = formatLastChanceMessage(collection, true);
        let hayoObj = formatLastChanceMessage(collection, true, true);
        message += this.getNewCollectionHash(collection);
        const options = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `🏃‍♂️ Quick ${buttonViewText}`,
                        url: url
                    }]
                ]
            }
        };
        const hayoOptions = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `🏃‍♂️ Quick ${hayoObj.buttonViewText}`,
                        url: hayoObj.url
                    }]
                ]
            }
        };
        const modifiedImageURL = this.replaceOrtak1SubdomainFromImageURL(collection.bgImage);
        try {
            await this.executeWithRateLimit(
                () => this.bot.sendPhoto(
                    channelId,
                    modifiedImageURL,
                    {
                        caption: message,
                        parse_mode: 'Markdown',
                        reply_markup: options.reply_markup,
                    }
                ),
                "main_bot"
            );
            await this.executeWithRateLimit(
                () => this.farmerBot.sendPhoto(
                    farmerChannelId,
                    modifiedImageURL,
                    {
                        caption: hayoObj.message,
                        parse_mode: 'Markdown',
                        reply_markup: hayoOptions.reply_markup,
                    }
                ),
                "hayo_bot"
            );
            console.log(`Sent last chance alert for ${collection.name}`);
        } catch (error) {
            console.error('Error sending last chance alert:', error);
        }
    }

    async sendRewardAlert(collections, isSnowballs = false) {
        let message = formatRewardMessage(collections, isSnowballs, true);
        message += this.getUpcomingRewardsHash(isSnowballs);
        if (message) {
            try {
                await this.executeWithRateLimit(
                    () => this.bot.sendMessage(
                        channelId,
                        message,
                        {
                            parse_mode: 'Markdown',
                            disable_web_page_preview: false // Enable link previews
                        }
                    ),
                    "main_bot"
                );
            } catch (error) {
                console.error('Error sending reward alert:', error.message);
            }
        }
    }

    async sendFinishingSnowballsAlert(snowballsData) {
        let message = formatFinishingSnowballsMessage(snowballsData, true);
        message += '\n#SnowballFinalStats #EndingSnowballs';
        try {
            await this.executeWithRateLimit(
                () => this.bot.sendMessage(
                    channelId,
                    message,
                    {
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true // Disable link previews to keep the message clean
                    }
                ),
                "main_bot"
            );

            console.log(`Sent finishing snowballs alert for ${snowballsData.length} snowballs`);
        } catch (error) {
            console.error('Error sending finishing snowballs alert:', error.message);
        }
    }

    getPercentageChangeHash(collection) {
        const hashtag = formatCollectionHashtag(collection.slug);
        if (isSnowBall(collection)) {
            return `\n#SnowballPercentageChange ${hashtag}`;
        } else {
            return `\n#CollectionPercentageChange ${hashtag}`;
        }
    }

    getUpcomingRewardsHash(isSnowballs) {
        return isSnowballs ? '\n#UpcomingSnowballRewards' : '\n#UpcomingRewards';
    }

    getNewCollectionHash(collection) {
        const hashtag = formatCollectionHashtag(collection.slug);
        return `\n#NewCollection ${hashtag}`;
    }

    replaceOrtak1SubdomainFromImageURL(imageURL) {
        return imageURL ? imageURL.replace('res.ortak1.me', 'res.ortak.me') : imageURL;
    }
}

module.exports = TgNotificationService;