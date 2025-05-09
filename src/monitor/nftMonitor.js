const notificationService = require('../service/multyChannelNotificationService');
const collectionMonitor = require('./collectionMonitor');

class NftMonitor {
    constructor() {
        this.lowestPrices = new Map();
        this.isInitialized = false;
        this.lastNotifiedPrices = new Map();
        this.deniedNotificationsForCollection = new Map();
        this.deniedNotificationsForCollectionExpirationTime = 1800000; // 30 minutes for expire per collection
        this.expirationTime = 1800000; // 30 minutes for expire per collection the lowest price notify
        this.processingLocks = new Map(); // Add lock map for synchronization
    }

    initializeLowestPrices(data) {
        let initialized = 0;

        for (const nft of data) {
            if (nft.marketPrice <= 2) {
                continue;
            }

            this.lowestPrices.set(nft.collectionId, nft);
            initialized++;
        }

        this.isInitialized = true;
    }

    async handlePriceUpdates(updates) {
        const updatesByCollection = new Map();

        for (const update of updates) {
            const collectionId = update.data.collectionId;
            if (!updatesByCollection.has(collectionId)) {
                updatesByCollection.set(collectionId, []);
            }
            updatesByCollection.get(collectionId).push(update);
        }

        const processPromises = [];
        for (const [collectionId, collectionUpdates] of updatesByCollection) {
            processPromises.push(this.processCollectionUpdates(collectionId, collectionUpdates));
        }

        // Wait for all collections to be processed
        await Promise.all(processPromises);
    }

    async processCollectionUpdates(collectionId, updates) {
        let lock = this.processingLocks.get(collectionId);
        if (!lock) {
            lock = Promise.resolve();
        }

        let resolveLock;
        const newLock = new Promise(resolve => {
            resolveLock = resolve;
        });
        this.processingLocks.set(collectionId, newLock);

        try {
            await lock;
            for (const update of updates) {
                try {
                    if (update.type === 'add') {
                        await this.handlePriceAdd(update.data);
                    } else if (update.type === 'remove') {
                        this.lowestPrices.delete(update.data.id);
                    }
                } catch (error) {
                    console.error(`Error handling price update for collection ${collectionId}:`, error);
                }
            }
        } finally {
            resolveLock();
        }
    }

    async handlePriceAdd(nft) {
        if (nft.marketPrice <= 2) {
            return;
        }
        const lastPriceNotificationForGivenCollection = this.getLastNotificationBasedOnExpiration(nft);
        const allowedCollectionNotificationBasedOnExpiration = this.isAllowedCollectionNotificationBasedOnExpiration(nft.collectionId);
        const existingNft = this.lowestPrices.get(nft.collectionId);

        if (!existingNft) {
            this.lowestPrices.set(nft.collectionId, nft);
            console.log(`New collection lowest price for collection: ${nft.collectionId} at ${nft.price} FTN`);
            return;
        }
        const collection = collectionMonitor.getCollectionById(nft.collectionId);
        if (this.isPriceDropSignificant(nft, existingNft, collection) &&
            (!allowedCollectionNotificationBasedOnExpiration && !lastPriceNotificationForGivenCollection
                // || nft.price < lastPriceNotificationForGivenCollection.price  commented price check =>
                // if notified for collection in expiration time limit then skip
            )) {
            await this.updateLastNotificationForNft(nft);
            const dropPercentage = ((existingNft.price - nft.price) / existingNft.price * 100).toFixed(2);
            console.log(`Price drop for collection: ${collection.name}: ${existingNft.price} → ${nft.price} FTN (-${dropPercentage}%)`);
            await notificationService.sendNftAlert(nft, collection, existingNft);
        }
        this.lowestPrices.set(nft.collectionId, nft);
    }

    getLastNotificationBasedOnExpiration(nft) {
        const lastNotification = this.lastNotifiedPrices.get(nft.collectionId);
        if (lastNotification && Date.now() - lastNotification.timestamp > this.expirationTime) {
            this.lastNotifiedPrices.delete(nft.collectionId);
            return null;
        }
        return lastNotification;
    }

    isAllowedCollectionNotificationBasedOnExpiration(collectionId) {
        const notificationDeniedUntil = this.deniedNotificationsForCollection.get(collectionId);
        if (notificationDeniedUntil && Date.now() - notificationDeniedUntil.timestamp > this.deniedNotificationsForCollectionExpirationTime) {
            this.deniedNotificationsForCollection.delete(collectionId);
            return null;
        }
        return notificationDeniedUntil;
    }

    setDenyCollectionNotificationBasedOnExpiration(collectionId) {
        this.deniedNotificationsForCollection.set(collectionId, {
            timestamp: Date.now()
        });
    }

    updateLastNotificationForNft(nft) {
        this.lastNotifiedPrices.set(nft.collectionId, {
            price: nft.price,
            timestamp: Date.now()
        });
    }

    isPriceDropSignificant(nft, existingNft, collection) {
        if (!existingNft || !collection || collection.originalPrice <= 2) {
            return false;
        }

        if (nft.price < 10) {
            return nft.price < 0.93 * existingNft.price;  // 7% drop for prices <= 10
        }

        if (nft.price <= 20) {
            return nft.price < 0.94 * existingNft.price;  // 6% drop for prices <= 20
        }

        if (nft.price > 20 && nft.price < 50) {
            return nft.price < 0.945 * existingNft.price;  // 5.5% drop for prices 20-50
        }

        if (nft.price >= 50) {
            return nft.price < 0.95 * existingNft.price;  // 5% drop for prices >= 50
        }

        return false;
    }
}

module.exports = new NftMonitor();