require('dotenv').config();
const wsHandler = require('./src/websocketHandler');
const collectionMonitor = require('./src/monitor/collectionMonitor');
const rewardMonitor = require('./src/monitor/rewardMonitor');
const cron = require('node-cron');
const chartScheduler = require('./src/scheduler/chartScheduler');

console.log('Starting NFT bot...');

wsHandler.connect();

collectionMonitor.start()
    .then(result => {
        console.log(`${result.message}`);
        console.log(`Main monitoring interval: ${result.mainInterval / 1000} seconds`);
        console.log(`New collection monitoring interval: ${result.newCollectionInterval / 1000} seconds`);
    })
    .catch(error => {
        console.error("Error starting collection monitoring:", error);
    });

// chartScheduler.init();

cron.schedule('0 18 * * *', async () => {
    console.log('Running rewardMonitor task at 18:00 PM Yerevan:', new Date().toISOString());
    try {
        await rewardMonitor.start(collectionMonitor.getAllCollections());
    } catch (error) {
        console.error('Error in rewardMonitor scheduled task:', error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Yerevan"
});

['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
        console.log(`Received ${signal}, shutting down gracefully...`);
        collectionMonitor.stop();
        console.log('Monitoring stopped. Exiting process.');
        process.exit(0);
    });
});
