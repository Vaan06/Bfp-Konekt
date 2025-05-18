const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();

// Configuration
const CONFIG = {
    VERIFY_TOKEN: "bfpkonekt_secret",
    APP_ID: "234886450548568",
    APP_SECRET: "5f966003c66def4eb1b316b4ce6026b6",
    PORT: process.env.PORT || 3000
};

// Middleware to verify Facebook signatures
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        const signature = req.headers["x-hub-signature"];
        if (!signature) {
            console.error("No signature header found");
            return;
        }
        try {
            const elements = signature.split('=');
            const signatureHash = elements[1];
            const expectedHash = crypto
                .createHmac('sha1', CONFIG.APP_SECRET)
                .update(buf)
                .digest('hex');
            
            if (signatureHash !== expectedHash) {
                console.error("Signature validation failed");
                throw new Error("Invalid signature");
            }
            console.log("Signature validated successfully");
        } catch (err) {
            console.error("Signature validation error:", err);
            throw new Error("Signature validation failed");
        }
    }
}));

// Facebook verification endpoint
app.get('/webhook', (req, res) => {
    console.log("Received verification request:", req.query);
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === CONFIG.VERIFY_TOKEN) {
            console.log("Webhook verified successfully!");
            res.status(200).send(challenge);
        } else {
            console.error("Verification failed. Invalid token or mode.");
            res.sendStatus(403);
        }
    } else {
        console.error("Missing mode or token in verification request");
        res.sendStatus(400);
    }
});

// Handle webhook events
app.post('/webhook', async (req, res) => {
    console.log("Received webhook event:", JSON.stringify(req.body, null, 2));

    try {
        if (req.body.object === 'page') {
            for (const entry of req.body.entry) {
                // Handle page feed updates
                if (entry.changes) {
                    for (const change of entry.changes) {
                        await handlePageChange(change);
                    }
                }
                
                // Handle mentions
                if (entry.mentions) {
                    for (const mention of entry.mentions) {
                        await handleMention(mention);
                    }
                }
            }
            res.status(200).send('EVENT_RECEIVED');
        } else {
            console.error("Unknown webhook object:", req.body.object);
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).send('EVENT_PROCESSING_ERROR');
    }
});

// Handle page feed changes
async function handlePageChange(change) {
    console.log("Processing page change:", change);

    switch (change.field) {
        case 'feed':
            await handleFeedUpdate(change.value);
            break;
        case 'mentions':
            await handleMention(change.value);
            break;
        default:
            console.log("Unhandled change field:", change.field);
    }
}

// Handle feed updates
async function handleFeedUpdate(update) {
    if (update.item === 'post') {
        const scraper = new FacebookScraper(FB_SCRAPER_CONFIG);
        await scraper.processPost(update, 'webhook');
    }
}

// Handle mentions
async function handleMention(mention) {
    console.log("Processing mention:", mention);
    // Add your mention handling logic here
}

// Start server
app.listen(CONFIG.PORT, () => {
    console.log(`
🔥 BFP Konekt Webhook Server
---------------------------
Status: Running
Port: ${CONFIG.PORT}
App ID: ${CONFIG.APP_ID}
Verify Token: ${CONFIG.VERIFY_TOKEN}
Webhook URL: http://localhost:${CONFIG.PORT}/webhook
    `);
}); 