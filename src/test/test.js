const monitor = require('../monitor/collectionMonitor');
const SnowballSimulator = require('./mockData/snowballSimulator');

async function runTest() {
    await monitor.runMainMonitoring();


    setTimeout(async () => {
        // Initialize the collection monitor
        const simulator = new SnowballSimulator(monitor);

        // Start the monitor with a 30-second interval
        await monitor.start({
            mainInterval: 12000,
            newCollectionInterval: 60000
        });
        console.log('Starting snowball simulation test...');
        console.log('----------------------------------------');

        // Create initial snowball based on Gates of Olympus data with real URLs
        console.log('1. Creating new snowball collection...');
        const snowball = await simulator.simulateNewSnowball({
            name: "Snowball Gates of Olympus",
            percent: 100.00,
            liveDate: 0,
            customData: {
                id: 999,
                creatorId: 2,
                categoryId: 6,
                networkId: 0,
                brandId: 76,
                orderId: 0,
                type: 8,
                slug: "snowball-gates-of-olympus-03022025",
                serviceFee: 2.5,
                nftsCount: 9700,
                activeNfts: 6043,
                profPercent: 100,
                initialBudget: 339500,
                ftnRate: 4,
                averageBudget: 0,
                // Using real image URLs from your data
                logo: "https://res.ortak.me/collection/a684dd66178bc3d872a75b3bfcb5df4e1738597829.png",
                thumbnail: "https://res.ortak.me/collection/8dccb7cc36d7269f2b20595bd2891f611738597829.jpg",
                bgImage: "https://res.ortak.me/collection/718e8fcbb7d616b74e7ec1d58b5812a01738597829.jpg",
                status: 1,
                volume: 128380,
                originalPrice: 35,
                floorPrice: 35,
                highestSales: 35,
                lastSalePrice: 35,
                marketPrice: 35,
                rewardDate: 2585246,
                calcDate: "2025-02-04 00:00:00",
                expireDate: 2585246,
                symbol: "OSGOO",
                // Using real description from your data
                description: "<span style=\"font-size: 12pt; background-color: transparent; \n                font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-alternates: normal; \n                font-variant-position: normal; vertical-align: baseline; text-wrap: wrap;\">The Snowball NFT is designed to elevate your gameplay experience by providing a dedicated period of endless growth. As it evolves, your Snowball NFT heightens the thrill of the game, encouraging you to explore the mythical world of Mount Olympus with renewed excitement. When the NFT's active period concludes, it transitions into FTNs, giving you the choice to keep it as a cherished collectible or share it with others. Let the Snowball NFT enhance your journey through cascading reels, powerful multipliers, and the magnificent rewards Zeus bestows.</span>"
            }
        });

        console.log(`Created snowball with ID: ${snowball.id}`);
        console.log('Initial stats:', monitor.getCollectionStats());
        console.log('----------------------------------------');

        // Test percentage changes with real data values
        setTimeout(async () => {
            console.log('2. Simulating significant percentage change...');
            const result = await simulator.simulatePercentageChange(snowball.id, 187.23);
            console.log(`Updated percentage from ${result.oldPercentage}% to ${result.newPercentage}%`);
            console.log('----------------------------------------');
        }, 15000);

        // Final stats
        setTimeout(() => {
            console.log('3. Final collection stats:');
            console.log(monitor.getCollectionStats());
            console.log('----------------------------------------');
            console.log('Test completed. Press Ctrl+C to exit.');
        }, 20000);
    }, 15000);
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    process.exit(1);
});

runTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});