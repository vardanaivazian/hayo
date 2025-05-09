const axios = require('axios');
const FormData = require('form-data');
const {yoToken, yoChannelId, channelId} = require('../config');
const {
    formatNftMessageYoAI, formatChangeMessage, formatRewardMessage, formatNewCollectionMessage,
    formatLastChanceMessage, formatFinishingSnowballsMessage
} = require('../util/messageFormatter');
const stream = require('stream');

class YoNotificationService {
    constructor() {
        this.client = axios.create({
            baseURL: "https://yoai.yophone.com/api/pub",
            headers: {
                "X-YoAI-API-Key": yoToken
            }
        });
        this.channelId = yoChannelId;
    }

    async sendYoPhotoMessage(text, imageUrl) {
        if (!this.channelId) {
            console.error('Channel ID is undefined.');
            return;
        }
        try {
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'Accept': 'image/jpeg,image/png,image/*',
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const bufferStream = new stream.PassThrough();
            bufferStream.end(Buffer.from(response.data));

            const formData = new FormData();
            formData.append("to", this.channelId);
            formData.append("text", text);
            formData.append("file", bufferStream, {
                filename: 'image.png',
                contentType: 'image/png'
            });

            await this.client.post("/sendMessage", formData);
        } catch (error) {
            console.error('Error sending YoAI photo message:', error);
            try {
                await this.sendYoMessage(text);
                console.log('Fallback message sent successfully.');
            } catch (fallbackError) {
                console.error('Error sending fallback message:', fallbackError);
            }
        }
    }


    async sendYoMessage(text) {
        if (!this.channelId) {
            console.error('Channel ID is undefined.');
            return;
        }
        try {
            await this.client.post("/sendMessage", {
                to: this.channelId,
                text
            });
        } catch (error) {
            console.error('Error sending YoAI message:', error.response?.data || error.message);
            console.error('Full error details:', error);
        }
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

        const message = formatNftMessageYoAI(nftDetails);

        await this.sendYoPhotoMessage(message, nft.fileThumb);
    }

    async sendPercentageChangeAlert(collection, oldPercentage, latestGGR, imageBuffer) {
        if (!this.channelId) {
            console.error('Channel ID is undefined.');
            return;
        }
        const {message, url} = formatChangeMessage(collection, oldPercentage, latestGGR);
        const messageWithUrl = message + `🔗 View: ${url}`;

        try {
            console.log(`Preparing to send percentage change alert for ${collection.name}`);
            console.log(`Message: ${messageWithUrl}`);

            const bufferStream = new stream.PassThrough();
            bufferStream.end(imageBuffer);

            const formData = new FormData();
            formData.append("to", this.channelId);
            formData.append("text", messageWithUrl);
            formData.append("file", bufferStream, {
                filename: 'chart.png',
                contentType: 'image/png'
            });

            await this.client.post("/sendMessage", formData, {
                headers: {
                    ...formData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            console.log(`Successfully sent percentage change alert for ${collection.name}`);
        } catch (error) {
            console.log('Failed to send percentage change alert with image. Sending fallback message...' + error);
            try {
                await this.sendYoMessage(messageWithUrl);
                console.log('Fallback message sent successfully.');
            } catch (fallbackError) {
                console.log('Error sending fallback message:', fallbackError);
            }
        }
    }

    async sendNewCollectionAlert(collection) {
        const {message, url} = formatNewCollectionMessage(collection);
        const messageWithUrl = message + `📊 View: ${url}`;
        try {
            await this.sendYoPhotoMessage(messageWithUrl, collection.bgImage);
            console.log(`Sent nYO ew collection alert for ${collection.name}`);
        } catch (error) {
            console.error('Error sending YO new collection alert:', error);
        }
    }

    async sendLastChanceAlert(collection) {
        let {message, url} = formatLastChanceMessage(collection);
        const messageWithUrl = message + `📊 View: ${url}`;
        try {
            await this.sendYoPhotoMessage(messageWithUrl, collection.bgImage);
            console.log(`Sent last chance alert for ${collection.name}`);
        } catch (error) {
            console.error('Error sending last chance alert:', error);
        }
    }

    async sendRewardAlert(collections, isSnowballs = false) {
        const message = formatRewardMessage(collections, isSnowballs, false);
        if (message) {
            try {
                await this.sendYoMessage(message);
            } catch (error) {
                console.error('Error sending reward alert:', error.message);
            }
        }
    }

    async sendFinishingSnowballsAlert(snowballsData) {
        const message = formatFinishingSnowballsMessage(snowballsData);
        if (message) {
            try {
                await this.sendYoMessage(message);
                console.log(`Sent finishing snowballs alert for ${collections.length} collections`);
            } catch (error) {
                console.error('Error finishing snowballs alert:', error.message);
            }
        }
    }
}

module.exports = YoNotificationService;