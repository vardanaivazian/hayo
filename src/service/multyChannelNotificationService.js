const TgNotificationService = require('./tgNotificationService');
const YoNotificationService = require('./yoNotificationService');

class MultiChannelNotificationService {
    constructor() {
        this.telegram = new TgNotificationService();
        this.yoai = new YoNotificationService();
    }

    async sendNftAlert(nft, collection, previousLowestNft) {
        await Promise.all([
            this.telegram.sendNftAlert(nft, collection, previousLowestNft),
            this.yoai.sendNftAlert(nft, collection, previousLowestNft)
        ]);
    }

    async sendPercentageChangeAlert(collection, oldPercentage, latestGGR, image) {
        await Promise.all([
            this.telegram.sendPercentageChangeAlert(collection, oldPercentage, latestGGR, image),
            this.yoai.sendPercentageChangeAlert(collection, oldPercentage, latestGGR, image)
        ]);
    }

    async sendFarmerPercentageChangeAlert(collection, oldPercentage, latestGGR, image) {
        this.telegram.sendFarmerPercentageChangeAlert(collection, oldPercentage, latestGGR, image);
    }

    async sendNewCollectionAlert(collection) {
        await Promise.all([
            this.telegram.sendNewCollectionAlert(collection),
            this.yoai.sendNewCollectionAlert(collection)
        ]);
    }

    async sendLastChanceAlert(collection) {
        await Promise.all([
            this.telegram.sendLastChanceAlert(collection),
            this.yoai.sendLastChanceAlert(collection)
        ]);
    }

    async sendRewardAlert(collections) {
        await Promise.all([
            this.telegram.sendRewardAlert(collections, false),
            this.yoai.sendRewardAlert(collections, false)
        ]).then(() => {
            console.log(`Sent reward alerts for ${collections.length} collections`);
        }).catch(error => {
            console.error('Error sending reward alert:', error.message);
        });
    }

    async sendSnowballRewardAlert(snowballs) {
        await Promise.all([
            this.telegram.sendRewardAlert(snowballs, true),
            this.yoai.sendRewardAlert(snowballs, true)
        ]);
    }

    async sendFinishingSnowballsAlert(snowballsData) {
        await Promise.all([
            this.telegram.sendFinishingSnowballsAlert(snowballsData),
            this.yoai.sendFinishingSnowballsAlert(snowballsData)
        ]);
    }
}

module.exports = new MultiChannelNotificationService();