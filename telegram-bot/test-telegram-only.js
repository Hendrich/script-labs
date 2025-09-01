const TelegramTestNotifier = require('./TelegramTestNotifier');

async function testTelegram() {
    console.log('Testing Telegram notification...');
    
    const testData = {
        numTotalTests: 334,
        numPassedTests: 334,
        numFailedTests: 0,
        numPendingTests: 0,
        testExecError: false
    };
    
    console.log('Test data:', testData);
    
    const notifier = new TelegramTestNotifier();
    console.log('Telegram enabled:', notifier.enabled);
    
    if (!notifier.enabled) {
        console.log('Telegram credentials not found');
        return;
    }
    
    try {
        await notifier.sendNotification(testData);
        console.log('âœ… Telegram notification sent successfully');
    } catch (error) {
        console.error('âŒ Error sending telegram:', error.message);
    }
}

testTelegram().catch(console.error);


