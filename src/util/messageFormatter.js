const {removeTrailingZeros, isSnowBall} = require('./common');
const {
    formatTimeUntilReward,
    calculateYearlyStats,
    formatTimeLeft,
    calculateLaunchTime,
    formatExpirationDays
} = require('./calculators');

const calculateNftStats = (nftDetails) => {
    const monthlyRevenue = nftDetails.remuneration.averageBudget * nftDetails.remuneration.rewardInterval;
    const yearlyRevenue = monthlyRevenue * 12;
    const yearlyPercentage = (yearlyRevenue / nftDetails.nft.price) * 100;
    const dropPercentage = ((nftDetails.nft.previousLowest - nftDetails.nft.price) / nftDetails.nft.previousLowest * 100).toFixed(2);
    const rewardIn = formatTimeUntilReward(nftDetails.rewardDate);

    return {monthlyRevenue, yearlyPercentage, dropPercentage, rewardIn};
};

const formatCollectionHashtag = (slug) => {
    // Convert slug to hashtag format by splitting on hyphens and capitalizing each word
    return '#' + slug.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
};

const formatNftMessage = (nftDetails) => {
    const {monthlyRevenue, yearlyPercentage, dropPercentage, rewardIn} = calculateNftStats(nftDetails);
    console.log(`Price drop: ${nftDetails.nft.previousLowest} → ${nftDetails.nft.price} FTN (-${dropPercentage}%)`);

    return `🎭 ${nftDetails.nft.name}\n` +
        `💹 ${removeTrailingZeros(yearlyPercentage.toFixed(2))}%\n` +
        `💵 Price: ${removeTrailingZeros(nftDetails.nft.price.toFixed(3))} FTN\n` +
        `📉 Old Price: ${removeTrailingZeros(nftDetails.nft.previousLowest.toFixed(3))} FTN\n` +
        `🚀 Original Price: ${nftDetails.originalPrice} FTN\n` +
        `⏳ Reward in: ${rewardIn}\n` +
        `🪙 Monthly: ${removeTrailingZeros(monthlyRevenue.toFixed(5))} FTN`;
};

const formatNftMessageYoAI = (nftDetails) => {
    const baseMessage = formatNftMessage(nftDetails);

    return `${baseMessage}\n` +
        `🔍 View NFT: https://sss.ortak.me/en/nfts/${nftDetails.nft.slug}\n` +
        `📊 View Collection: https://sss.ortak.me/en/collections/${nftDetails.nft.slug}/nfts`;
};

const formatChangeMessage = (collection, oldPercentage, latestGGR, isTg = false) => {
    const percentageChange = (collection.percent - oldPercentage).toFixed(2);
    const direction = collection.percent > oldPercentage ? '🟢⬆️' : '🔴⬇️';
    const changePrefix = percentageChange > 0 ? '+' : '';
    const rewardIn = formatTimeUntilReward(collection.rewardDate);
    const collectionUrl = `https://sss.ortak.me/collections/${collection.slug}/nfts`;

    const collectionName = isTg ? `[${collection.name}](${collectionUrl})` : collection.name;

    let message =
        `${direction} Change: ${changePrefix}${percentageChange}% ${collectionName}\n` +
        `🔹 New: ${collection.percent.toFixed(2)}%\n` +
        `🔹 Old: ${oldPercentage.toFixed(2)}%\n`;

    if (latestGGR) {
        const ggrDiff = Math.round(latestGGR.ggr - latestGGR.prevGgr);
        const ggrDiffText = changePrefix + ggrDiff + " FTN";
        message += `📈 GGR: ${Math.round(latestGGR.ggr)} FTN (${ggrDiffText})\n`;
        message += `🎯 Predicted GGR: ${Math.round(latestGGR.predictedGgr)} FTN\n`;
    }
    if (isSnowBall(collection)) {
        message += `⏳ Reward in: ${rewardIn}\n`;
    }
    const buttonViewText = isSnowBall(collection) ? '🔗 View Snowball' : '🔗 View Collection';
    return {message: message, url: collectionUrl, buttonViewText: buttonViewText};
};

const formatFarmerChangeMessage = (collection, oldPercentage, latestGGR) => {
    const isIncreased = collection.percent > oldPercentage;
    const diffPercent = collection.percent - oldPercentage;
    const percentageChange = diffPercent.toFixed(2);
    const direction = isIncreased ? '🟢⬆️' : '🔴⬇️';
    const changePrefix = percentageChange > 0 ? '+' : '';
    const rewardIn = formatTimeUntilReward(collection.rewardDate);
    const hashtag = formatCollectionHashtag(collection.slug);

    let message =
        `${direction} Change: ${changePrefix}${percentageChange}% ${collection.name}\n` +
        `🔹 New: ${collection.percent.toFixed(2)}%\n` +
        `🔹 Old: ${oldPercentage.toFixed(2)}%\n`;

    if (latestGGR) {
        const ggrDiff = Math.round(latestGGR.ggr - latestGGR.prevGgr);
        const ggrDiffText = changePrefix + ggrDiff + " FTN";
        message += `📈 GGR: ${Math.round(latestGGR.ggr)} FTN (${ggrDiffText})\n`;
        message += `🎯 Predicted GGR: ${Math.round(latestGGR.predictedGgr)} FTN\n`;
    }
    if (isSnowBall(collection)) {
        message += `⏳ Reward in: ${rewardIn}\n`;
    }
    message += `\n${hashtag}`;
    return {message: message, url: `https://sss.ortak.me/collections/${collection.slug}/nfts`, fastUrl: `https://fast.ortak.me/collections/${collection.slug}/nfts`};
};

const formatRewardMessage = (collections, isSnowballs=false, isTg = false) => {
    const messageLines = collections.map(collection => {
        const collectionUrl = `https://sss.ortak.me/collections/${collection.slug}/nfts`;
        const timeUntil = formatTimeUntilReward(collection.rewardDate);

        if (isSnowballs) {
            const statusIcon = collection.percent < 100 ? '🔴' : '🟢';
            return `🎮 ${isTg ? `[${collection.name}](${collectionUrl})` : collection.name}\n` +
                `⏰ Reward in: ${timeUntil}\n` +
                `🔸 Percent: ${collection.percent.toFixed(2)}% ${statusIcon}\n` +
                `${isTg ? '' : `🔗 ${collectionUrl}\n`}`;
        } else {
            const {monthlyRevenue} = calculateYearlyStats(collection, collection.originalPrice);
            return `🎮 ${isTg ? `[${collection.name}](${collectionUrl})` : collection.name}\n` +
                `⏰ Reward in: ${timeUntil}\n` +
                `💰 Reward amount: ${monthlyRevenue.toFixed(4)} FTN\n` +
                `${isTg ? '' : `🔗 ${collectionUrl}\n`}`;
        }
    });

    const headerText = isSnowballs
        ? '❄️ Upcoming Snowball Rewards (Next 2 Days)'
        : '⚡️ Upcoming Rewards (Next 2 Days)';

    return messageLines.length ? `${headerText}\n\n${messageLines.join('\n\n')}` : '';
};

const formatNewCollectionMessage = (collection, isTg = false, hayo = false) => {
    const hasLiveDate = !!collection.liveDate;
    const timeLeft = hasLiveDate ? formatTimeLeft(collection.liveDate) : '';
    const launchTime = hasLiveDate ? calculateLaunchTime(collection.liveDate) : '';
    const snowball = isSnowBall(collection);
    const daysUntilSnowballExpire = snowball ? formatExpirationDays(collection.rewardDate) : '';
    const collectionUrl = hayo ?
        `https://hayo.ortak.me/collections/${collection.slug}/nfts` :
        `https://sss.ortak.me/collections/${collection.slug}/nfts`;

    return {
        message: (snowball ? `❄️ 🆕 *NEW SNOWBALL* 🆕 ❄️\n` : `🔥 🆕 *NEW COLLECTION* 🆕 🔥\n`) +
            `${isTg ? `[${collection.name}](${collectionUrl})` : collection.name}\n\n` +
            `👥 Supply: ${collection.nftsCount} pcs.\n` +
            `💰 Price: ${collection.originalPrice} FTN\n` +
            `📊 Percent: ${collection.percent}%\n` +
            (hasLiveDate
                    ? `⏰ Launch Time: ${launchTime}\n` +
                    `⏳ Time Left: ${timeLeft}\n`
                    : ''
            ) +
            (snowball
                    ? `⏳ Expires in: ${daysUntilSnowballExpire} days\n`
                    : ''
            ),
        url: collectionUrl,
        buttonViewText: snowball ? '🔗 View Snowball' : '🔗 View Collection'
    };
};

const formatLastChanceMessage = (collection, isTg = false, hayo = false) => {
    const timeLeft = formatTimeLeft(collection.liveDate);
    const collectionUrl = hayo ?
        `https://hayo.ortak.me/collections/${collection.slug}/nfts` :
        `https://sss.ortak.me/collections/${collection.slug}/nfts`;

    return {
        message: `⚡️ 🚨 *LAST CHANCE* 🚨 ⚡️\n` +
            `${isTg ? `[${collection.name}](${collectionUrl})` : `*${collection.name}*`}\n\n` +
            `👥 Supply: ${collection.nftsCount} pcs.\n` +
            `💰 Price: ${collection.originalPrice} FTN\n` +
            `📊 Percent: ${collection.percent}%\n` +
            `⚠️ LAUNCHING IN ${timeLeft} ⚠️`,
        url: collectionUrl,
        buttonViewText: isSnowBall(collection) ? ' View Snowball' : ' View Collection'
    };
};

const formatFinishingSnowballsMessage = (snowballs, isTg = false) => {
    let message = `❄️ SNOWBALLS ENDING IN 5 MINUTES ❄️\n\n`;

    const snowballMessages = snowballs.map(({collection, latestGGR}) => {
        const collectionUrl = `https://sss.ortak.me/collections/${collection.slug}/nfts`;
        const statusIcon = collection.percent < 100 ? '🔴' : '🟢';
        let snowballMessage =
            `${isTg ? `[${collection.name}](${collectionUrl})` : collection.name}\n` +
            `🔸 Percent: ${collection.percent.toFixed(2)}% ${statusIcon}\n`;

        if (latestGGR) {
            snowballMessage +=
                `📈 GGR: ${Math.round(latestGGR.ggr)} FTN\n` +
                `🎯 Predicted GGR: ${Math.round(latestGGR.predictedGgr)} FTN\n`;
        }

        if (!isTg) {
            snowballMessage +=
                `🔗 ${collectionUrl}\n`;
        }

        return snowballMessage;
    });

    message += snowballMessages.join('\n');
    return message;
};

module.exports = {
    formatNftMessage,
    formatNftMessageYoAI,
    formatRewardMessage,
    formatChangeMessage,
    formatFarmerChangeMessage,
    formatNewCollectionMessage,
    formatLastChanceMessage,
    formatFinishingSnowballsMessage,
    formatCollectionHashtag
};