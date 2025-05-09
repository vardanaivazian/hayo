const { COLLECTION_TYPES } = require('../../util/constants');

class SnowballSimulator {
    constructor(collectionMonitor) {
        this.collectionMonitor = collectionMonitor;
    }

    createMockSnowball({
                           id = Math.floor(Math.random() * 1000) + 500,
                           name = "Simulated Snowball Collection",
                           percent = 100,
                           liveDate = 0,
                           customData = {}
                       } = {}) {
        const currentDate = new Date();
        const timestamp = Math.floor(currentDate.getTime() / 1000);
        const marketPrice = 35;

        return {
            id,
            creatorId: 2,
            categoryId: 6,
            networkId: 0,
            brandId: 76,
            orderId: 0,
            type: 8,
            name,
            slug: `simulated-snowball-${id}`,
            description: "<span>This is a simulated snowball collection for testing purposes.</span>",
            urls: null,
            serviceFee: 2.5,
            nftsCount: 5000,
            activeNfts: Math.floor(Math.random() * 5000),
            percent: Number(percent), // Ensure it's a number
            profPercent: 100,
            initialBudget: 50000,
            ftnRate: 4,
            averageBudget: 0,
            logo: "https://res.ortak.me/collection/placeholder.png",
            thumbnail: "https://res.ortak.me/collection/placeholder.png",
            bgImage: "https://res.ortak.me/collection/placeholder.png",
            status: 1,
            volume: Math.floor(Math.random() * 100000),
            originalPrice: marketPrice,
            floorPrice: marketPrice,
            highestSales: marketPrice,
            lastSalePrice: marketPrice,
            marketPrice: marketPrice,
            liveDate,
            rewardDate: 2592775, // 30 days in seconds
            calcDate: new Date(timestamp * 1000).toISOString().split('.')[0],
            expireDate: 2592775,
            atDate: new Date(timestamp * 1000).toISOString().split('.')[0],
            contract: null,
            calcStatus: 0,
            payoutScheme: null,
            results: null,
            blockHash: null,
            blockNumber: null,
            symbol: `SIM${id}`,
            ...customData
        };
    }

    async simulateNewSnowball(options = {}) {
        const mockSnowball = this.createMockSnowball(options);

        // Store initial percentage in the monitor's previousPercentages map
        const collectionKey = `${mockSnowball.id}-${COLLECTION_TYPES.REGULAR_SNOWBALL}`;
        this.collectionMonitor.previousPercentages.set(collectionKey, mockSnowball.percent);

        // Add to collection monitor
        await this.collectionMonitor.updateCollectionStore(
            [mockSnowball],
            COLLECTION_TYPES.REGULAR_SNOWBALL
        );

        return mockSnowball;
    }

    async simulatePercentageChange(snowballId, newPercent) {
        const collection = this.collectionMonitor.getCollection(
            snowballId,
            COLLECTION_TYPES.REGULAR_SNOWBALL
        );

        if (!collection) {
            throw new Error(`Snowball collection with ID ${snowballId} not found`);
        }

        // Get the old percentage before updating
        const collectionKey = `${snowballId}-${COLLECTION_TYPES.REGULAR_SNOWBALL}`;
        const oldPercentage = this.collectionMonitor.previousPercentages.get(collectionKey);

        // Create updated collection
        const updatedCollection = {
            ...collection,
            percent: Number(newPercent) // Ensure it's a number
        };

        // Update collection in the monitor
        await this.collectionMonitor.updateCollectionStore(
            [updatedCollection],
            COLLECTION_TYPES.REGULAR_SNOWBALL
        );

        // For testing purposes, return both old and new percentages
        return {
            collection: updatedCollection,
            oldPercentage,
            newPercentage: newPercent
        };
    }

    generateMockGGR() {
        return {
            ggr: Math.random() * 1000,
            predictedGgr: Math.random() * 2000
        };
    }

    async simulateCountdown(snowballId, secondsUntilLive) {
        const collection = this.collectionMonitor.getCollection(
            snowballId,
            COLLECTION_TYPES.REGULAR_SNOWBALL
        );

        if (!collection) {
            throw new Error(`Snowball collection with ID ${snowballId} not found`);
        }

        const updatedCollection = {
            ...collection,
            liveDate: secondsUntilLive
        };

        await this.collectionMonitor.updateCollectionStore(
            [updatedCollection],
            COLLECTION_TYPES.REGULAR_SNOWBALL
        );

        return updatedCollection;
    }
}

module.exports = SnowballSimulator;