const TelegramBot = require('node-telegram-bot-api');

// Replace with your bot token
// const token = '7641728929:AAHtU2yB1G1MjenFDaOHPwPUzXpXIIMcjgk'; //dev token
const token = '7687647144:AAH8-fDqqR6_CIqoXXmRRifefsO0o_2sfhU'; //prod token
// Replace with your development channel username
// const channelUsername = '@OrtakAlertsDev'; //dev username
const channelUsername = '@nftfarmer1'; //prod username

const bot = new TelegramBot(token, { polling: false });

const getChannelId = async () => {
    try {
        // Send a test message to get channel info
        const message = 'Test message to get channel ID. You can delete this.';
        const response = await bot.sendMessage(channelUsername, message);

        console.log('Channel Details:');
        console.log('Channel ID:', response.chat.id);
        console.log('Channel Type:', response.chat.type);
        console.log('Channel Title:', response.chat.title);

        // Optional: Delete the test message
        await bot.deleteMessage(response.chat.id, response.message_id);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response && error.response.body) {
            console.error('Response body:', error.response.body);
        }
        console.log('\nCommon issues:');
        console.log('1. Make sure the bot is an admin in the channel');
        console.log('2. Check if the channel username is correct');
        console.log('3. Verify that the bot token is valid');
    }
    process.exit();
};

getChannelId();