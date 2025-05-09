const monitor = require('../monitor/collectionMonitor');
const SnowballSimulator = require('./mockData/snowballSimulator');
const { COLLECTION_TYPES } = require('../util/constants');
const TgNotificationService = require('../service/tgNotificationService');
const assert = require('assert');

/**
 * Test for snowball percentage update on Telegram dev channel
 * This test simulates:
 * 1. Creating a new snowball collection with initial percentage
 * 2. Significant percentage changes that trigger Telegram notifications
 * 3. Verifies message formatting for Telegram
 */
async function runTelegramSnowballTest() {
    // Initialize the monitor and simulator
    await monitor.runMainMonitoring();
    const simulator = new SnowballSimulator(monitor);
    
    // Track Telegram notifications
    let telegramMessages = [];
    let telegramChannels = [];
    let telegramImages = [];
    
    // Mock the TG notification service
    const tgNotificationService = new TgNotificationService();
    const originalSendMessage = tgNotificationService.sendMessage;
    const originalSendPhoto = tgNotificationService.sendPhoto;
    
    // Override sendMessage method to capture calls
    tgNotificationService.sendMessage = function(channelId, message, options = {}) {
        console.log(`[MOCK TG] Sending message to channel ${channelId}:`);
        console.log('----------------------------------------');
        console.log(message);
        console.log('----------------------------------------');
        
        telegramMessages.push(message);
        telegramChannels.push(channelId);
        
        return Promise.resolve({ message_id: Math.floor(Math.random() * 1000) });
    };
    
    // Override sendPhoto method to capture image notifications
    tgNotificationService.sendPhoto = function(channelId, imageBuffer, caption, options = {}) {
        console.log(`[MOCK TG] Sending image to channel ${channelId} with caption:`);
        console.log('----------------------------------------');
        console.log(caption);
        console.log('----------------------------------------');
        
        telegramMessages.push(caption);
        telegramChannels.push(channelId);
        telegramImages.push(!!imageBuffer); // Just track if image was provided
        
        return Promise.resolve({ message_id: Math.floor(Math.random() * 1000) });
    };
    
    // Replace notification service in monitor
    const originalNotificationService = monitor.notificationService;
    monitor.notificationService = tgNotificationService;
    
    console.log('Starting Telegram snowball percentage update test...');
    console.log('----------------------------------------');

    // 1. Create initial snowball with 50% completion
    console.log('1. Creating new snowball collection...');
    const snowball = await simulator.simulateNewSnowball({
        name: "Test Snowball Collection",
        percent: 50.00,
        slug: "test-snowball-collection",
        rewardDate: 86400, // 1 day in seconds
    });
    console.log(`Created snowball with ID: ${snowball.id} and initial percentage: ${snowball.percent}%`);
    
    // 2. Test significant percentage change to trigger notification
    console.log('\n2. Testing significant percentage change (above threshold)...');
    // First change - simulate a large increase
    await simulator.simulatePercentageChange(snowball.id, 85.00);
    console.log('Simulated change: 50.00% -> 85.00%');
    
    // Allow time for notification processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Test reaching 100% milestone (important for snowballs)
    console.log('\n3. Testing 100% completion threshold...');
    await simulator.simulatePercentageChange(snowball.id, 100.00);
    console.log('Simulated change: 85.00% -> 100.00%');
    
    // Allow time for notification processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. Test going over 100% (a common case for snowballs)
    console.log('\n4. Testing over-completion (>100%)...');
    await simulator.simulatePercentageChange(snowball.id, 115.75);
    console.log('Simulated change: 100.00% -> 115.75%');
    
    // Allow time for notification processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test results
    console.log('\nTest Results:');
    console.log('----------------------------------------');
    console.log(`Total Telegram messages: ${telegramMessages.length}`);
    console.log(`Channels messaged: ${[...new Set(telegramChannels)].join(', ')}`);
    console.log(`Messages with images: ${telegramImages.filter(Boolean).length}`);

    // Check for Telegram hashtags in messages
    const snowballHashtags = telegramMessages.filter(msg => 
        msg && msg.includes('#SnowballPercentageChange')
    ).length;
    
    console.log(`Messages with #SnowballPercentageChange tag: ${snowballHashtags}`);
    
    // Restore original services
    if (originalNotificationService) {
        monitor.notificationService = originalNotificationService;
    }
    if (originalSendMessage) {
        tgNotificationService.sendMessage = originalSendMessage;
    }
    if (originalSendPhoto) {
        tgNotificationService.sendPhoto = originalSendPhoto;
    }
    
    console.log('----------------------------------------');
    console.log('Telegram snowball percentage update test completed!');
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    process.exit(1);
});

// Run the test
runTelegramSnowballTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
}); 