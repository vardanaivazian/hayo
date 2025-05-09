const calculateYearlyStats = (collection, currentPrice) => {
    // Calculate yearly revenue based on original price and collection percentage
    const yearlyRevenueAtOriginal = (collection.originalPrice * collection.percent) / 100;

    // Calculate new percentage for current price
    const newYearlyPercentage = (yearlyRevenueAtOriginal / currentPrice) * 100;

    // Calculate monthly revenue
    const monthlyRevenue = yearlyRevenueAtOriginal / 12;

    // console.log("collection.originalPrice " + collection.originalPrice);
    // console.log("collection.percent " + collection.percent);
    // console.log("currentPrice " + currentPrice);

    return {
        yearlyPercentage: newYearlyPercentage,
        yearlyRevenue: yearlyRevenueAtOriginal,
        monthlyRevenue: monthlyRevenue
    };
};

const formatTimeUntilReward = (rewardSeconds) => {
    const days = Math.floor(rewardSeconds / (24 * 60 * 60));
    const hours = Math.floor((rewardSeconds % (24 * 60 * 60)) / (60 * 60));

    if (days > 0) {
        return `${days} days${hours > 0 ? `, ${hours} hours` : ''}`;
    }
    return `${hours} hours`;
};

const calculateLaunchTime = (secondsLeft) => {
    const now = new Date();
    const launchTime = new Date(now.getTime() + (secondsLeft * 1000));
    return launchTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Yerevan'
    });
}

const formatTimeLeft = (seconds) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes === 0 ? `${hours} hours` : `${hours} hours ${minutes} minutes`;
};

const formatExpirationDays = (rewardSeconds) => {
    return Math.round(rewardSeconds / (24 * 60 * 60));
};

module.exports = {calculateYearlyStats, formatTimeUntilReward, formatTimeLeft, calculateLaunchTime, formatExpirationDays};
