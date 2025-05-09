const notificationService = require('../service/multyChannelNotificationService');
const {isSnowBall} = require('../util/common');

class RewardMonitor {
    constructor() {}

    async checkUpcomingRewards(collections) {
        const collectionsWithUpcomingRewards = collections
            .filter(collection => {
                const daysUntilReward = collection.rewardDate / (24 * 60 * 60);
                return daysUntilReward <= 2 && daysUntilReward > 0;
            });

        const snowballsWithUpcomingSnowballRewards = collectionsWithUpcomingRewards
            .filter(collection => isSnowBall(collection))
            .sort((a, b) => a.rewardDate - b.rewardDate);

        const upcomingNormalRewards = collectionsWithUpcomingRewards
            .filter(collection => !isSnowBall(collection))
            .sort((a, b) => a.rewardDate - b.rewardDate);

        if (upcomingNormalRewards.length > 0) {
            await notificationService.sendRewardAlert(upcomingNormalRewards);
        }

        if (snowballsWithUpcomingSnowballRewards.length > 0) {
            await notificationService.sendSnowballRewardAlert(snowballsWithUpcomingSnowballRewards);
        }
    }

    start(collections) {
        console.log('Starting reward monitoring...');
        this.checkUpcomingRewards(collections);
    }
}

module.exports = new RewardMonitor();