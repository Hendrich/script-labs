const request = require('supertest');

// Test stats endpoint
async function testStatsEndpoint() {
    const originalEnv = process.env.NODE_ENV;
    
    try {
        process.env.NODE_ENV = 'development';
        
        // Clear cache
        delete require.cache[require.resolve('./backend/config/config')];
        delete require.cache[require.resolve('./backend/server')];
        
        const app = require('./backend/server');
        
        const response = await request(app).get('/api/stats');
        
        console.log('Stats endpoint response:');
        console.log('Status:', response.status);
        console.log('Body:', response.body);
        
    } catch (error) {
        console.error('Stats test error:', error.message);
    } finally {
        process.env.NODE_ENV = originalEnv;
        delete require.cache[require.resolve('./backend/config/config')];
        delete require.cache[require.resolve('./backend/server')];
    }
}

// Test helmet headers
async function testHelmetHeaders() {
    try {
        process.env.NODE_ENV = 'test';
        const app = require('./backend/server');
        
        const response = await request(app).get('/health');
        
        console.log('\nHelmet headers test:');
        console.log('Status:', response.status);
        console.log('X-Content-Type-Options:', response.headers['x-content-type-options']);
        console.log('X-Frame-Options:', response.headers['x-frame-options']);
        
    } catch (error) {
        console.error('Helmet test error:', error.message);
    }
}

// Run tests
testStatsEndpoint().then(() => testHelmetHeaders());


