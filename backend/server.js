const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Apify API configuration
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE_URL = 'https://api.apify.com/v2';

// Helper function to make Apify API calls
async function callApifyAPI(endpoint, method = 'GET', data = null) {
    try {
        const response = await axios({
            method,
            url: `${APIFY_BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${APIFY_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            data
        });
        return response.data;
    } catch (error) {
        console.error('Apify API Error:', error.response?.data || error.message);
        throw error;
    }
}

// Routes
app.get('/api/apify/status', async (req, res) => {
    try {
        const userInfo = await callApifyAPI('/users/me');
        res.json({ connected: true, user: userInfo });
    } catch (error) {
        res.status(500).json({ connected: false, error: error.message });
    }
});

app.post('/api/apify/run-actor', async (req, res) => {
    try {
        const { actorId, input } = req.body;
        const run = await callApifyAPI(`/acts/${actorId}/runs`, 'POST', { input });
        res.json(run);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/apify/run-status/:runId', async (req, res) => {
    try {
        const status = await callApifyAPI(`/actor-runs/${req.params.runId}`);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/apify/dataset/:datasetId', async (req, res) => {
    try {
        const items = await callApifyAPI(`/datasets/${req.params.datasetId}/items`);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Backend proxy server running on port ${port}`);
}); 