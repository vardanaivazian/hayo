const axios = require('axios');
const {headers} = require('../config');
const notificationService = require('../service/multyChannelNotificationService');

class NewCollectionMonitor {
    constructor(baseUrl = 'https://sss.ortak.me') {
        this.baseUrl = baseUrl;
        this.lastKnownCollectionId = 0;
        this.notifiedCollections = new Set();
        this.initializedCollections = new Set();
        this.isInitialized = false;

        this.onNewCollectionCallback = null;
        this.scheduledCollections = new Map();
        this.missedIds = new Set([663, 662, 635]);
        this.missedScheduledIds = new Set([663, 662, 635]);
    }

    setNewCollectionCallback(callback) {
        if (typeof callback === 'function') {
            this.onNewCollectionCallback = callback;
        }
    }

    async initialize(allCollections, maxLowCheck, maxHighCheck) {
        try {
            console.log('Initializing NewCollectionMonitor...');

            if (allCollections && allCollections.length > 0) {
                this.lastKnownCollectionId = Math.max(...allCollections.map(c => c.id));

                allCollections.forEach(collection => {
                    this.initializedCollections.add(`${collection.id}`);
                });
            }

            console.log(`Initialization complete. Highest collection ID found: ${this.lastKnownCollectionId}`);
            console.log(`Will check forward up to ID: ${this.lastKnownCollectionId + maxHighCheck}`);
            console.log(`Will check backward down to ID: ${this.lastKnownCollectionId - maxLowCheck}`);

            await this.performForwardScanInitialization(maxHighCheck);

            await this.performBackwardScanInitialization(maxLowCheck);

            this.isInitialized = true;
            return this.lastKnownCollectionId;
        } catch (error) {
            console.error('Error initializing NewCollectionMonitor:', error);
            this.isInitialized = true;
            return 0;
        }
    }

    async performForwardScanInitialization(maxChecks) {
        try {
            const startId = this.lastKnownCollectionId;
            const maxId = this.lastKnownCollectionId + maxChecks;

            console.log(`Performing forward scan ***INITIALIZATION*** for ${maxChecks} collections after ID ${this.lastKnownCollectionId}...`);

            let currentId = startId;

            while (currentId <= maxId) {
                const collectionData = await this.checkCollectionExists(currentId);

                if (collectionData) {
                    if (this.missedIds.has(currentId)) {
                        console.log(`Found existing **MISSED** collection during forward scan: ID ${currentId}`);
                        await this.processNewCollection(collectionData);
                        this.missedIds.delete(currentId);
                    } else if (this.missedScheduledIds.has(currentId)) {
                        await this.handleCollectionSchedulingBySlug(collectionData.collectionSlug);
                        this.missedScheduledIds.delete(currentId);
                    }
                    console.log(`Found existing collection during forward scan: ID ${collectionData.collectionId}`);
                    this.lastKnownCollectionId = Math.max(this.lastKnownCollectionId, collectionData.collectionId);

                    this.initializedCollections.add(`${currentId}`);
                }
                currentId++;
            }

            console.log(`Initial forward scan complete. Last known ID: ${this.lastKnownCollectionId}`);
        } catch (error) {
            console.error('Error during initial scan:', error);
        }
    }

    async performBackwardScanInitialization(maxChecks) {
        try {
            const startId = this.lastKnownCollectionId - 1;
            const minId = this.lastKnownCollectionId - maxChecks;
            const unreleasedBackwardCollections = new Set();

            console.log(`Performing backward scan ***INITIALIZATION*** for unreleased collections from ID ${startId} down to ${minId}...`);

            let currentId = startId;

            while (currentId >= minId) {
                if (this.initializedCollections.has(`${currentId}`)) {
                    currentId--;
                    continue;
                }

                const collectionData = await this.checkCollectionExists(currentId);

                if (collectionData) {
                    console.log(`Found existing collection during backward scan: ID ${currentId}`);
                    if (this.missedIds.has(currentId)) {
                        console.log(`Found existing **MISSED** collection during backward scan: ID ${currentId}`);
                        await this.processNewCollection(collectionData);
                        this.missedIds.delete(currentId);
                    } else if (this.missedScheduledIds.has(currentId)) {
                        await this.handleCollectionSchedulingBySlug(collectionData.collectionSlug);
                        this.missedScheduledIds.delete(currentId);
                    }
                    this.initializedCollections.add(`${currentId}`);
                } else {
                    console.log(`Collection ID ${currentId} does not exist yet, adding to unreleased tracking`);
                    unreleasedBackwardCollections.add(currentId);
                }
                currentId--;
            }

            console.log(`Backward scan complete. Found ${unreleasedBackwardCollections.size} unreleased collections to monitor.`);
        } catch (error) {
            console.error('Error during backward scan:', error);
        }
    }

    async checkForNewCollections(maxLowCheck, maxHighCheck) {
        if (!this.isInitialized) {
            console.log('Monitor not yet initialized, skipping check');
            return [];
        }

        try {
            console.log(`\n=== CHECKING FOR NEW COLLECTIONS ===`);

            const newCollections = [];

            const forwardCollections = await this.checkForwardCollections(maxHighCheck);
            newCollections.push(...forwardCollections);

            const backwardCollections = await this.checkBackwardCollections(maxLowCheck);
            newCollections.push(...backwardCollections);

            console.log(`=== NEW COLLECTIONS CHECK COMPLETED, FOUND ${newCollections.length} NEW COLLECTIONS ===\n`);
            return newCollections;
        } catch (error) {
            console.error('Error checking for new collections:', error);
            return [];
        }
    }

    async checkForwardCollections(maxChecks = 10) {
        console.log(`Checking for new collections after ID ${this.lastKnownCollectionId}...`);

        const startId = this.lastKnownCollectionId + 1;
        const maxId = this.lastKnownCollectionId + maxChecks;

        console.log(`Performing forward scan for ${maxChecks} collections after ID ${this.lastKnownCollectionId}...`);

        let currentId = startId;
        let newCollectionFound = false;
        const newCollections = [];

        while (currentId <= maxId) {
            const collectionData = await this.checkCollectionExists(currentId);

            if (collectionData) {
                newCollectionFound = true;
                const collectionKey = `${collectionData.collectionId}`;

                if (!this.notifiedCollections.has(collectionKey) &&
                    !this.initializedCollections.has(collectionKey)) {

                    console.log(`****** NEW collection ${collectionData.collectionId} is found!!! ******`);

                    const newCollection = await this.processNewCollection(collectionData);
                    if (newCollection) {
                        newCollections.push(newCollection);
                        this.lastKnownCollectionId = Math.max(this.lastKnownCollectionId, collectionData.collectionId);
                    }

                    this.notifiedCollections.add(collectionKey);
                } else {
                    console.log(`Collection ID ${collectionData.collectionId} already known or notified.`);
                }

                this.initializedCollections.add(`${currentId}`);
                this.lastKnownCollectionId = Math.max(this.lastKnownCollectionId, collectionData.collectionId);
            }
            currentId++;
        }

        if (!newCollectionFound) {
            console.log(`No new collections found after ID ${this.lastKnownCollectionId}.`);
        }

        return newCollections;
    }

    async checkBackwardCollections(maxChecks = 20) {
        const newCollections = [];
        const unreleasedBackwardCollections = new Set()
        try {
            const startId = this.lastKnownCollectionId - 1;
            const minId = this.lastKnownCollectionId - maxChecks;

            console.log(`Performing backward scan for unreleased collections from ID ${startId} down to ${minId}...`);

            let currentId = startId;

            while (currentId >= minId) {
                if (this.initializedCollections.has(`${currentId}`)) {
                    console.log(`Collection ID ${currentId} skipped: already initialized.`);
                    currentId--;
                    continue;
                }
                const collectionData = await this.checkCollectionExists(currentId);

                if (collectionData) {
                    console.log(`****** PREVIOUSLY UNRELEASED collection ${currentId} is now available!!! ******`);

                    if (!this.notifiedCollections.has(currentId)) {
                        const newCollection = await this.processNewCollection(collectionData);
                        if (newCollection) {
                            newCollections.push(newCollection);
                        }

                        this.notifiedCollections.add(currentId);
                    } else {
                        console.log(`Collection ID ${currentId} already notified.`);
                    }

                    this.initializedCollections.add(`${currentId}`);
                } else {
                    unreleasedBackwardCollections.add(currentId);
                    // console.log(`Collection ID ${currentId} does not exist yet`);
                }
                currentId--;
            }

            console.log(`Backward scan complete. Found ${unreleasedBackwardCollections.size} unreleased collections to monitor.`);
        } catch (error) {
            console.error('Error during backward scan:', error);
        }
        return newCollections;
    }

    async checkCollectionExists(collectionId) {
        try {
            // console.log(`Checking if collection ID ${collectionId} exists...`);

            const response = await axios.post(
                `${this.baseUrl}/panel/collections/nfts`,
                {
                    page: 1,
                    collectionId: collectionId,
                    partnerId: 99
                },
                {headers}
            );

            const exists = response.data &&
                response.data.data &&
                response.data.data.items &&
                response.data.data.items.length > 0;

            if (exists) {
                const firstItem = response.data.data.items[0];

                let collectionSlug = '';
                if (firstItem.slug) {
                    const lastDashIndex = firstItem.slug.lastIndexOf('-');
                    if (lastDashIndex !== -1) {
                        collectionSlug = firstItem.slug.substring(0, lastDashIndex);
                    } else {
                        collectionSlug = firstItem.slug;
                    }
                }

                const collectionUrl = `${this.baseUrl}/collections/${collectionSlug}/nfts`;

                const collectionData = {
                    collectionId: collectionId,
                    item: firstItem,
                    totalItems: response.data.data.meta?.totalCount || response.data.data.items.length,
                    collectionSlug: collectionSlug,
                    collectionUrl: collectionUrl
                };

                console.log(`Collection ID ${collectionId} exists with ${collectionData.totalItems} items`);
                console.log(`Collection URL: ${collectionUrl}`);
                return collectionData;
            } else {
                console.log(`Collection ID ${collectionId} does not exist or is not released yet`);
                return null;
            }
        } catch (error) {
            console.error(`Error checking collection ${collectionId}:`, error.message);
            return null;
        }
    }

    async fetchCollectionInfo(slug) {
        try {
            console.log(`Fetching detailed info for collection slug: ${slug}`);

            const response = await axios.post(
                `${this.baseUrl}/panel/collections/info`,
                {
                    slug: slug,
                    partnerId: 99
                },
                {headers}
            );

            if (response.data && response.data.code === 0 && response.data.data) {
                const collectionInfo = response.data.data;
                console.log(`Successfully fetched detailed info for collection: ${collectionInfo.name} (ID: ${collectionInfo.id})`);

                collectionInfo.collectionUrl = `${this.baseUrl}/collections/${slug}/nfts`;

                return collectionInfo;
            } else {
                console.error(`Failed to fetch collection info for slug ${slug}: Invalid response`, response.data);
                return null;
            }
        } catch (error) {
            console.error(`Error fetching collection info for slug ${slug}:`, error.message);
            return null;
        }
    }

    async processNewCollection(collectionData) {
        try {
            if (collectionData.collectionSlug) {
                const detailedCollection = await this.fetchCollectionInfo(collectionData.collectionSlug);
                if (detailedCollection) {
                    console.log(`Using detailed collection data for ID ${collectionData.collectionId}`);

                    if (this.onNewCollectionCallback) {
                        await this.onNewCollectionCallback(detailedCollection);
                    }

                    if (detailedCollection.liveDate) {
                        await this.handleCollectionScheduling(detailedCollection);
                    }

                    return detailedCollection;
                } else {
                    console.log(`collectionData.collectionSlug does not exist for ID ${collectionData.collectionId}`);
                }
            } else {
                console.log(`detailed collection does not exist for ID ${collectionData.collectionId}`);
            }
            return null;
        } catch (error) {
            console.error(`Error processing new collection ${collectionData.collectionId}:`, error);
            return null;
        }
    }

    async handleCollectionSchedulingBySlug(slug) {
        console.log(`handle Collection Scheduling by Slug: ${slug}`);
        const detailedCollection = await this.fetchCollectionInfo(slug);
        if (detailedCollection && detailedCollection.liveDate) {
            await this.handleCollectionScheduling(detailedCollection);
        }
    }

    async handleCollectionScheduling(detailedCollection) {
        try {
            if (detailedCollection.liveDate > 600 && detailedCollection.liveDate <= 86400) {
                console.log(`Collection ${detailedCollection.name} will go live in ${detailedCollection.liveDate} seconds, scheduling alert`);

                if (!this.scheduledCollections.has(`${detailedCollection.id}`)) {
                    const alertDelay = Math.max(0, detailedCollection.liveDate - 120) * 1000;

                    console.log(`Scheduling last chance alert for collection ${detailedCollection.name} in ${alertDelay / 1000} seconds (2 minutes before release)`);

                    const timeoutId = setTimeout(() => {
                        console.log(`Sending last chance alert for collection ${detailedCollection.name} (ID: ${detailedCollection.id})`);
                        detailedCollection.liveDate = 120;
                        notificationService.sendLastChanceAlert(detailedCollection);
                        this.scheduledCollections.delete(`${detailedCollection.id}`);
                    }, alertDelay);

                    this.scheduledCollections.set(`${detailedCollection.id}`, {
                        collection: detailedCollection,
                        timeoutId: timeoutId,
                        scheduledFor: new Date(Date.now() + alertDelay).toISOString()
                    });

                    console.log(`Alert scheduled. Currently tracking ${this.scheduledCollections.size} scheduled alerts.`);
                } else {
                    console.log(`Collection ${detailedCollection.name} already has a scheduled alert.`);
                }
            } else if (detailedCollection.liveDate > 10 && detailedCollection.liveDate <= 600) {
                console.log(`Collection ${detailedCollection.name} will go live in less than 10 minutes (${detailedCollection.liveDate} seconds). Sending alert immediately.`);
                await notificationService.sendLastChanceAlert(detailedCollection);
            } else {
                console.log(`Collection ${detailedCollection.name} will go live in more than 24 hours (${detailedCollection.liveDate} seconds). Not scheduling an alert yet.`);
            }
        } catch (error) {
            console.error(`Error scheduling collection ${detailedCollection.id}:`, error);
        }
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            lastKnownCollectionId: this.lastKnownCollectionId,
            notifiedCollectionsCount: this.notifiedCollections.size,
            initializedCollectionsCount: this.initializedCollections.size
        };
    }
}

module.exports = NewCollectionMonitor;