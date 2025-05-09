const axios = require('axios');
const {headers, newCollectionInterval, mainInterval} = require('../config');
const notificationService = require('../service/multyChannelNotificationService');
const chartService = require('../service/chartService');
const {COLLECTION_TYPES} = require('../util/constants');
const {isSnowBall} = require('../util/common');
const NewCollectionMonitor = require('./newCollectionMonitor');

class CollectionMonitor {
    constructor() {
        this.sendToFarmer = true;
        this.farmersCollections = new Set([]);
        this.finishingSnowballAlerts = new Set();
        this.baseUrl = 'https://sss.ortak1.me';
        this.lastNotifiedPercentages = new Map();  // Track last notified percentages

        this.storedCollections = {
            regular: new Map(),
            partner: new Map(),
            regularSnowball: new Map()
        };
        this.previousPercentages = new Map();

        this.lastUpdate = null;

        this.newCollectionMonitor = new NewCollectionMonitor(this.baseUrl);

        this.newCollectionMonitor.setNewCollectionCallback(this.handleNewCollection.bind(this));

        this.mainMonitoringIntervalId = null;
        this.newCollectionMonitoringIntervalId = null;

        this.newCollectionMaxBackwardCheck = 25;
        this.newCollectionMaxForwardCheck = 15;
    }

    async handleNewCollection(collection) {
        try {
            console.log(`Handling new collection: ${collection.name} (ID: ${collection.id})`);
            await notificationService.sendNewCollectionAlert(collection);
        } catch (error) {
            console.error(`Error handling new collection ${collection.id}:`, error);
        }
    }

    getCollection(id, type = COLLECTION_TYPES.REGULAR) {
        return this.storedCollections[type].get(id);
    }

    getAllCollections() {
        const uniqueCollectionsMap = new Map();
        Object.values(this.storedCollections).forEach(store => {
            store.forEach(collection => {
                const uniqueKey = collection.slug || collection.id;
                if (!uniqueCollectionsMap.has(uniqueKey)) {
                    uniqueCollectionsMap.set(uniqueKey, collection);
                }
            });
        });
        return Array.from(uniqueCollectionsMap.values());
    }

    updateCollectionStore(collections, type = COLLECTION_TYPES.REGULAR) {
        console.log(`Update collection store for collections: ${collections.length}, type: ${type}`);
        const store = this.storedCollections[type];

        collections.forEach(collection => {
            store.set(collection.id, {
                ...collection,
                lastUpdated: new Date(),
                collectionType: type
            });
        });
        this.lastUpdate = new Date();
        console.log(`Done update collection store for collections: ${collections.length}, type: ${type}`);
    }

    async fetchCollections(type = COLLECTION_TYPES.REGULAR) {
        try {
            let allCollections = [];
            let currentPage = 1;
            let totalPages = 1;

            const requestData = {
                page: currentPage,
                perPage: 30,
                partnerId: 99
            };

            if (type === COLLECTION_TYPES.REGULAR) {
                headers.referer = `${this.baseUrl}/en/marketplace/collections/?excludeTypes=[8]`;
                requestData.excludeTypes = [8];

            } else if (type === COLLECTION_TYPES.REGULAR_SNOWBALL) {
                headers.referer = `${this.baseUrl}/en/marketplace/collections/?type=8`;
                requestData.type = ['8'];  // Note: this is an array in the CURL
            } else if (type === COLLECTION_TYPES.PARTNER) {
                headers.referer = `${this.baseUrl}/en/marketplace/partners-collections`;
                requestData.isPartnersPage = true;
            }

            do {
                requestData.page = currentPage;
                const response = await axios.post(
                    `${this.baseUrl}/panel/collections`,
                    requestData,
                    {headers}
                );

                const {items, meta} = response.data.data;
                allCollections = [...allCollections, ...items];

                if (currentPage === 1) {
                    totalPages = Math.ceil(meta.totalCount / meta.perPage);
                }

                currentPage++;
            } while (currentPage <= totalPages);

            this.updateCollectionStore(allCollections, type);
            return allCollections;

        } catch (error) {
            console.error(`Error fetching ${type} collections:`, error.message);
            return [];
        }
    }

    async checkPercentageChanges(collections) {
        for (const collection of collections) {
            await this.checkPercentageChange(collection);
        }
    }

    async checkPercentageChange(collection) {
        const collectionKey = `${collection.id}-${collection.collectionType}`;
        const previousPercentage = this.previousPercentages.get(collectionKey);
        const percentageChange = Math.abs(previousPercentage - collection.percent);
        const minimumDelta = 0.1;

        if (previousPercentage !== undefined && percentageChange >= minimumDelta) {
            const lastNotifiedPercentage = this.lastNotifiedPercentages.get(collectionKey);
            const signedPercentageChange = Math.round(collection.percent - previousPercentage);

            this.sendFarmerNotification(collection, previousPercentage, signedPercentageChange, percentageChange);

            if (isSnowBall(collection) && collection.percent < 100 && previousPercentage < 100) {
                // console.log(`Collection: ${collection.name} notification is skipped. (% < 100) : ${previousPercentage.toFixed(2)}% -> ${collection.percent.toFixed(2)}%`);
                return;
            }
            const delta = this.resolveDelta(collection);
            if (percentageChange >= delta) {
                if (!lastNotifiedPercentage || Math.abs(lastNotifiedPercentage - collection.percent) >= delta) {
                    const chartData = await chartService.fetchChartData(collection, isSnowBall(collection) ? "month" : "year");
                    let latestGGR = null;
                    if (isSnowBall(collection)) {
                        latestGGR = await chartService.getLatestGGR(collection, chartData);
                        const snowballGGRDelta = this.resolveSnowballGGRDelta(collection, latestGGR, delta);
                        if (percentageChange < snowballGGRDelta) {
                            return;
                        }
                    }

                    const imageBuffer = await chartService.generateRuntimeChart(collection, previousPercentage, chartData);

                    if (!imageBuffer) {
                        console.error("Failed to generate image buffer");
                        return;
                    }

                    notificationService.sendPercentageChangeAlert(
                        collection,
                        previousPercentage,
                        latestGGR,
                        imageBuffer
                    ).then(() => {
                        console.log(`Alert sent for ${collection.name}: ${previousPercentage.toFixed(2)}% -> ${collection.percent.toFixed(2)}%`);
                    }).catch(error => {
                        console.error(`Failed to send alert for ${collection.name}:`, error);
                    });
                    this.lastNotifiedPercentages.set(collectionKey, collection.percent);
                }
            }
        }

        this.previousPercentages.set(collectionKey, collection.percent);
    }

    async checkFinishingSnowballs(collections) {
        const notifyUntilRewardInMinutes = 5;
        console.log('\n=== STARTING FINISHING SNOWBALLS CHECK ===');
        console.log(`Total collections to check: ${collections.length}`);

        const finishingSnowballs = collections.filter(collection => {
            if (!isSnowBall(collection)) {
                return false;
            }

            try {
                // Get current time in seconds (Unix timestamp)
                const now = Math.floor(Date.now() / 1000);

                const secondsUntilReward = collection.rewardDate;
                const minutesUntilReward = secondsUntilReward / 60;

                const isFinishing = minutesUntilReward <= notifyUntilRewardInMinutes && minutesUntilReward > 0;

                if (isFinishing) {
                    console.log(`Found finishing snowball: ${collection.name}`);
                    console.log(`Minutes until reward: ${minutesUntilReward.toFixed(2)}`);
                }

                return isFinishing;
            } catch (error) {
                console.error(`Error processing snowball ${collection.name}:`, error);
                return false;
            }
        });

        console.log(`\nFinishing snowballs found: ${finishingSnowballs.length}`);

        if (finishingSnowballs.length > 0) {
            const snowballsData = [];
            for (const snowball of finishingSnowballs) {
                const collectionKey = `${snowball.id}-${snowball.collectionType}`;

                if (!this.finishingSnowballAlerts.has(collectionKey)) {
                    try {
                        console.log(`Getting GGR for ${snowball.name}`);
                        const monthlyData = await chartService.fetchChartData(snowball, "month");
                        const latestGGR = await chartService.getLatestGGR(snowball, monthlyData);

                        snowballsData.push({
                            collection: snowball,
                            latestGGR
                        });
                        this.finishingSnowballAlerts.add(collectionKey);
                        console.log(`Added ${snowball.name} to alerts`);
                    } catch (error) {
                        console.error(`Error getting GGR for ${snowball.name}:`, error);
                    }
                }
            }

            if (snowballsData.length > 0) {
                try {
                    console.log(`Sending alerts for ${snowballsData.length} snowballs`);
                    await notificationService.sendFinishingSnowballsAlert(snowballsData);
                    console.log('Alerts sent successfully');
                } catch (error) {
                    console.error('Error sending alerts:', error);
                }
            }
        }

        console.log('=== CHECK COMPLETED ===');
    }

    getCollectionBySlug(slug) {
        const allCollections = this.getAllCollections();
        return allCollections.find(c => c.slug === slug);
    }

    getCollectionById(id) {
        const allCollections = this.getAllCollections();
        return allCollections.find(c => c.id === id);
    }

    getCollectionStats() {
        const newCollectionStats = this.newCollectionMonitor.getStatus();

        return {
            regularCount: this.storedCollections.regular.size,
            partnerCount: this.storedCollections.partner.size,
            regularSnowballCount: this.storedCollections.regularSnowball.size,
            lastUpdate: this.lastUpdate,
            totalCollections: Object.values(this.storedCollections)
                .reduce((total, store) => total + store.size, 0),
            lastKnownCollectionId: newCollectionStats.lastKnownCollectionId,
            notifiedNewCollectionsCount: newCollectionStats.notifiedCollectionsCount
        };
    }

    async start() {
        console.log('Starting collection monitoring with separate timings...');
        console.log(`Main monitoring: Every ${mainInterval / 1000} seconds`);
        console.log(`New collection monitoring: Every ${newCollectionInterval / 1000} seconds`);

        await this.runMainMonitoring();

        //do not run immediately for first time, because in runMainMonitoring we have
        // just now initialized collections
        this.mainMonitoringIntervalId = setTimeout(() => {
            this.runNewCollectionMonitoring();
        }, newCollectionInterval);

        return {
            message: "Collections monitoring started with separate intervals",
            mainInterval,
            newCollectionInterval
        };
    }

    stop() {
        if (this.mainMonitoringIntervalId) {
            clearInterval(this.mainMonitoringIntervalId);
            this.mainMonitoringIntervalId = null;
        }

        if (this.newCollectionMonitoringIntervalId) {
            clearInterval(this.newCollectionMonitoringIntervalId);
            this.newCollectionMonitoringIntervalId = null;
        }

        console.log('All collection monitoring stopped');
    }

    async runMainMonitoring() {
        try {
            console.log('\n=== RUNNING MAIN MONITORING TASKS ===');
            const regularCollections = await this.fetchCollections(COLLECTION_TYPES.REGULAR);
            const partnerCollections = await this.fetchCollections(COLLECTION_TYPES.PARTNER);
            const regularSnowballCollections = await this.fetchCollections(COLLECTION_TYPES.REGULAR_SNOWBALL);

            const allCollections = [
                ...regularCollections,
                ...partnerCollections,
                ...regularSnowballCollections
            ];

            if (!this.newCollectionMonitor.isInitialized) {
                await this.newCollectionMonitor.initialize(allCollections, this.newCollectionMaxBackwardCheck, this.newCollectionMaxForwardCheck);
            }
            await Promise.all([
                this.checkPercentageChanges(allCollections)
            ]);

            await this.checkFinishingSnowballs([
                ...partnerCollections,
                ...regularSnowballCollections
            ]);
            console.log('=== MAIN MONITORING TASKS COMPLETED ===\n');
        } catch (error) {
            console.error('Error in main monitoring:', error);
        } finally {
            this.mainMonitoringIntervalId = setTimeout(() => {
                this.runMainMonitoring();
            }, mainInterval);
        }
    }

    async runNewCollectionMonitoring() {
        try {
            console.log('\n=== RUNNING NEW COLLECTION MONITORING ===');
            await this.newCollectionMonitor.checkForNewCollections(this.newCollectionMaxBackwardCheck, this.newCollectionMaxForwardCheck);
            console.log('=== NEW COLLECTION MONITORING COMPLETED ===\n');
        } catch (error) {
            console.error('Error in new collection monitoring:', error);
        } finally {
            this.mainMonitoringIntervalId = setTimeout(() => {
                this.runNewCollectionMonitoring();
            }, newCollectionInterval);
        }
    }

    resolveDelta(collection) {
        if (isSnowBall(collection)) { //for snowballs
            const daysUntilReward = collection.rewardDate / (24 * 60 * 60);
            if (daysUntilReward > 27) return 35;
            if (daysUntilReward > 25) return 25;
            if (daysUntilReward > 22) return 18;
            if (daysUntilReward > 20) return 13;
            if (daysUntilReward > 15) return 6;
            if (daysUntilReward > 10) return 5;
            if (daysUntilReward > 5) return 3;
            return 1;
        } else { //for collections
            return 0.01;
        }
    }

    resolveFarmerDelta(collection) {
        const daysUntilReward = collection.rewardDate / (24 * 60 * 60);
        if (daysUntilReward > 27) return 20;
        if (daysUntilReward > 25) return 15;
        if (daysUntilReward > 22) return 12;
        if (daysUntilReward > 20) return 9;
        if (daysUntilReward > 10) return 5;
        return 1;
    }

    resolveSnowballGGRDelta(collection, latestGgr, delta) {
        const dailyMinPredictedGgr = 50;
        const dailyMinActualGgr = 100;
        const dailyGoodPredictedGgr = 400;
        const dailyGoodActualGgr = 600;
        if (!latestGgr || !latestGgr.predictedGgr || !latestGgr.ggr || !collection.calcDate) {
            return 0; // If we don't have the necessary data, return 0
        }

        // Parse the calcDate
        const calcDate = new Date(collection.calcDate);
        const today = new Date();

        // Calculate days elapsed
        const diffInMs = today - calcDate;
        const daysElapsed = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (daysElapsed < 0) {
            return 0; // If calcDate is in the future, return 0
        } else if (daysElapsed === 0) {
            return 1; //If calcDate is today, return 1
        }

        // Calculate daily predicted GGR
        const dailyPredictedGGR = latestGgr.predictedGgr / daysElapsed;
        const dailyGGR = latestGgr.ggr / daysElapsed;
        console.log(`Collection ${collection.name} - Daily Predicted GGR: ${dailyPredictedGGR.toFixed(2)}, Daily GGR: ${dailyGGR.toFixed(2)}, Original predictedGgr: ${latestGgr.predictedGgr} , ggr: ${latestGgr.ggr}`);

        // If daily predicted GGR is less than 100, return a higher delta to skip notification
        if (dailyPredictedGGR < dailyMinPredictedGgr && dailyGGR < dailyMinActualGgr) {
            console.log(`Providing 5 times higher delta: ${delta * 5} to skip or show with high percentage change notification for ${collection.name} due to low daily GGR prediction (${dailyPredictedGGR.toFixed(2)}), and daily GGR (${dailyGGR.toFixed(2)})`);
            return delta * 5; // Return a 5 * delta to effectively skip the notification
        } else if (dailyPredictedGGR < 2 * dailyMinPredictedGgr && dailyGGR < 2 * dailyMinActualGgr) {
            console.log(`Providing 3 times higher delta: ${delta * 3} to skip or show with high percentage change notification for ${collection.name} due to low daily GGR prediction (${dailyPredictedGGR.toFixed(2)}), and daily GGR (${dailyGGR.toFixed(2)})`);
            return delta * 3; // Return a 3 * delta to effectively skip the notification
        } else if (dailyPredictedGGR < 3 * dailyMinPredictedGgr && dailyGGR < 3 * dailyMinActualGgr) {
            console.log(`Providing 2 times higher delta: ${delta * 2} to skip or show with high percentage change notification for ${collection.name} due to low daily GGR prediction (${dailyPredictedGGR.toFixed(2)}), and daily GGR (${dailyGGR.toFixed(2)})`);
            return delta * 2; // Return a 2 * delta to effectively skip the notification
        }
        console.log(`Providing original delta: ${delta}`);
        return delta; // Return original delta for normal cases
    }

    sendFarmerNotification(collection, previousPercentage, signedPercentageChange, percentageChange) {
        const collectionKey = collection.id;
        const lastNotifiedPercentage = this.lastNotifiedPercentages.get(collectionKey);
        const farmerDelta = this.resolveFarmerDelta(collection);

        if (this.sendToFarmer &&
            (signedPercentageChange >= 100 && collection.percent >= 200)
            || (this.farmersCollections.has(collection.id) && percentageChange >= farmerDelta)) {
            console.log("*** Farmer Collection *** " + collection.name + ", change: " + percentageChange);
            if (isSnowBall(collection) && (!lastNotifiedPercentage || Math.abs(lastNotifiedPercentage - collection.percent) >= 0.1)
                && (collection.percent >= 100 || previousPercentage >= 100)) {
                console.log("*** Farmer Collection *** " + collection.name + ", change: " + percentageChange);
                return this.processFarmerNotification(collection, previousPercentage, collectionKey);
            }
        }
        return Promise.resolve();
    }

    async processFarmerNotification(collection, previousPercentage, collectionKey) {
        const chartData = await chartService.fetchChartData(collection, isSnowBall(collection) ? "month" : "year");
        const latestGGR = await chartService.getLatestGGR(collection, chartData);
        const imageBuffer = await chartService.generateRuntimeChart(collection, previousPercentage, chartData);

        await notificationService.sendFarmerPercentageChangeAlert(
            collection,
            previousPercentage,
            latestGGR,
            imageBuffer
        );

        this.lastNotifiedPercentages.set(collectionKey, collection.percent);
        return true;
    }
}

module.exports = new CollectionMonitor();