const cron = require('node-cron');
const chartService = require('../service/chartService');
const collectionMonitor = require('../monitor/collectionMonitor');

class ChartScheduler {
    static init() {
        // todo for dev
        // ChartScheduler.updateAllCollections();
        // setTimeout(() => {
        //     ChartScheduler.updateAllCollections();
        // }, 120000);
        // cron.schedule('1 0 * * *', async () => {
        //     console.log('Running daily chart update task:', {
        //         time: new Date().toISOString(),
        //         timezone: 'Asia/Yerevan'
        //     });
        //     await ChartScheduler.updateAllCollections();
        // }, {
        //     scheduled: true,
        //     timezone: "Asia/Yerevan"
        // });
    }

    static sleep(minMs, maxMs) {
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    static async updateAllCollections() {
        const collections = collectionMonitor.getAllCollections();
        console.log(`Starting update for ${collections.length} collections`);

        for (const collection of collections) {
            try {
                await ChartScheduler.sleep(700, 1800);
                console.log(`Updating data for ${collection.slug}`);

                await chartService.updateDailyData(collection);
                console.log(`Successfully updated daily data for: ${collection.slug}`);
            } catch (error) {
                console.error(`Failed to update collection ${collection.slug}:`, error);
            }
        }

        console.log('Daily chart update completed');
    }
}

module.exports = ChartScheduler;