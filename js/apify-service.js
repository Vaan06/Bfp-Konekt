// Apify Service for Facebook Scraping
export default class ApifyService {
    constructor() {
        this.APIFY_TOKEN = 'apify_api_bfKwGpgO03VZdl6OsCyIguoYNsmJpv4cB8Tw';
        this.USER_ID = 'Qx59oT6w2rG6DPHYK';
        this.TASK_ID = 'FNlYIQf8iNMa88QnE';
        this.ACTOR_ID = 'xSewLChDcAk1hNhga'; // Facebook Scraper Actor ID
        this.BASE_URL = 'https://api.apify.com/v2';
        this.RUNS_URL = `${this.BASE_URL}/actor-tasks/${this.TASK_ID}/runs?token=${this.APIFY_TOKEN}`;
        this.monitoringInterval = null;
        this.keywords = ['sunog', 'fire', 'nasusunog', 'fire alert'];
        this.connectionStatus = {
            isConnected: false,
            lastCheck: null,
            actorStatus: 'unknown'
        };
        
        // Facebook scraper configuration
        this.scraperConfig = {
            startUrls: [
                { url: "https://www.facebook.com/hashtag/sunog" },
                { url: "https://www.facebook.com/hashtag/fire" }
            ],
            maxPosts: 10,
            maxRetries: 5,
            proxy: {
                useApifyProxy: false
            },
            scrapePosts: true,
            recentPosts: true,
            searchType: "posts"
        };
    }

    async checkConnection() {
        try {
            // Check task status
            const taskResponse = await fetch(`${this.BASE_URL}/actor-tasks/${this.TASK_ID}?token=${this.APIFY_TOKEN}`);
            if (!taskResponse.ok) {
                throw new Error('Task not found or inaccessible');
            }
            const taskData = await taskResponse.json();

            // Check latest run
            const runsResponse = await fetch(this.RUNS_URL);
            if (!runsResponse.ok) {
                throw new Error('Unable to fetch runs');
            }
            const runsData = await runsResponse.json();
            const latestRun = runsData.data.items[0];

            this.connectionStatus = {
                isConnected: true,
                lastCheck: new Date(),
                actorStatus: latestRun ? latestRun.status : 'no_runs',
                taskName: taskData.name,
                lastRunId: latestRun ? latestRun.id : null,
                lastRunStatus: latestRun ? latestRun.status : null
            };

            // Dispatch status update event
            window.dispatchEvent(new CustomEvent('apifyStatusUpdate', {
                detail: this.connectionStatus
            }));

            return this.connectionStatus;
        } catch (error) {
            this.connectionStatus = {
                isConnected: false,
                lastCheck: new Date(),
                actorStatus: 'error',
                error: error.message
            };

            // Dispatch error event
            window.dispatchEvent(new CustomEvent('apifyStatusUpdate', {
                detail: this.connectionStatus
            }));

            throw error;
        }
    }

    async startMonitoring() {
        try {
            // Check connection first
            await this.checkConnection();
            
            // Verify credentials
            await this.verifyCredentials();
            
            // Start a new run with configuration
            await this.startNewRun();
            
            // Initial fetch
            await this.fetchAndProcessData();
            
            // Set up periodic monitoring
            this.monitoringInterval = setInterval(async () => {
                await this.checkConnection(); // Check connection status
                await this.fetchAndProcessData();
            }, 5 * 60 * 1000); // Every 5 minutes
            
            console.log('Apify monitoring started successfully');
            return true;
        } catch (error) {
            console.error('Failed to start Apify monitoring:', error);
            throw error;
        }
    }

    async startNewRun() {
        try {
            // First, try to run the actor directly
            const actorResponse = await fetch(`${this.BASE_URL}/acts/${this.ACTOR_ID}/runs?token=${this.APIFY_TOKEN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.scraperConfig)
            });

            if (!actorResponse.ok) {
                throw new Error(`Failed to start actor run: ${actorResponse.status}`);
            }

            const runData = await actorResponse.json();
            console.log('New Apify run started:', runData);
            return runData;
        } catch (error) {
            console.error('Failed to start new Apify run:', error);
            throw error;
        }
    }

    async verifyCredentials() {
        try {
            const response = await fetch(`${this.BASE_URL}/users/${this.USER_ID}?token=${this.APIFY_TOKEN}`);
            if (!response.ok) {
                throw new Error('Invalid Apify credentials');
            }
            console.log('Apify credentials verified successfully');
            return true;
        } catch (error) {
            console.error('Failed to verify Apify credentials:', error);
            throw error;
        }
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    updateKeywords(newKeywords) {
        this.keywords = newKeywords;
        // Update the scraper query with new keywords
        this.scraperConfig.query = newKeywords.map(keyword => `"${keyword}"`).join(' OR ');
        console.log('Keywords and scraper query updated:', this.keywords);
    }

    updateSearchQuery(searchQuery) {
        this.scraperConfig.query = searchQuery;
        // Restart monitoring with new query
        this.restartMonitoring();
    }

    async restartMonitoring() {
        try {
            // Stop current monitoring
            this.stopMonitoring();
            
            // Start a new run with updated configuration
            await this.startNewRun();
            
            // Resume monitoring
            this.monitoringInterval = setInterval(() => {
                this.fetchAndProcessData();
            }, 5 * 60 * 1000);
            
            console.log('Monitoring restarted with new search query:', this.scraperConfig.query);
        } catch (error) {
            console.error('Failed to restart monitoring:', error);
            throw error;
        }
    }

    async fetchAndProcessData() {
        try {
            // Fetch the latest run info
            const runsRes = await fetch(this.RUNS_URL);
            if (!runsRes.ok) {
                throw new Error(`Failed to fetch runs: ${runsRes.status}`);
            }
            
            const runsData = await runsRes.json();
            const latestRun = runsData.data.items[0];
            
            if (!latestRun) {
                throw new Error('No runs found');
            }

            const runStatus = latestRun.status;
            const datasetId = latestRun.defaultDatasetId;

            // Fetch the dataset items (posts)
            const postsRes = await fetch(`${this.BASE_URL}/datasets/${datasetId}/items?token=${this.APIFY_TOKEN}&clean=true&format=json`);
            if (!postsRes.ok) {
                throw new Error(`Failed to fetch posts: ${postsRes.status}`);
            }

            const posts = await postsRes.json();

            // Process posts with NLP
            const processedPosts = this.processPosts(posts);

            // Dispatch event with processed data
            window.dispatchEvent(new CustomEvent('apifyPostsFound', {
                detail: {
                    posts: processedPosts,
                    runStatus,
                    timestamp: new Date().toISOString()
                }
            }));

            return processedPosts;
        } catch (error) {
            console.error('Error in fetchAndProcessData:', error);
            window.dispatchEvent(new CustomEvent('apifyError', {
                detail: {
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            }));
            throw error;
        }
    }

    processPosts(posts) {
        return posts.map(post => {
            // Extract location using NLP
            const location = this.extractLocation(post.text);
            
            // Calculate confidence based on keyword matches and NLP
            const confidence = this.calculateConfidence(post.text);
            
            // Extract timestamp
            const timestamp = post.date || post.timestamp || new Date().toISOString();
            
            return {
                id: post.id || `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                text: post.text,
                date: timestamp,
                url: post.url,
                location: location,
                confidence: confidence,
                source: post.pageName || 'Facebook',
                hashtags: post.hashtags || [],
                likes: post.likes || 0,
                comments: post.comments || 0,
                shares: post.shares || 0
            };
        }).filter(post => post.confidence >= 70); // Only return high confidence posts
    }

    extractLocation(text) {
        if (!text) return 'Unknown Location';
        
        // Enhanced location extraction patterns
        const locationPatterns = [
            /in\s+([^,.]+)/i,
            /at\s+([^,.]+)/i,
            /near\s+([^,.]+)/i,
            /location:\s*([^,.]+)/i,
            /sa\s+([^,.]+)/i,  // Filipino pattern
            /sa\s+([^,.]+)\s+city/i,
            /sa\s+([^,.]+)\s+barangay/i,
            /sa\s+([^,.]+)\s+street/i
        ];

        for (const pattern of locationPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        return 'Unknown Location';
    }

    calculateConfidence(text) {
        if (!text) return 0;

        const lowerText = text.toLowerCase();
        let confidence = 0;

        // Check for keyword matches
        this.keywords.forEach(keyword => {
            if (lowerText.includes(keyword.toLowerCase())) {
                confidence += 25; // Each keyword match adds 25% confidence
            }
        });

        // Check for location indicators
        if (this.extractLocation(text) !== 'Unknown Location') {
            confidence += 20;
        }

        // Check for urgency indicators
        const urgencyWords = ['emergency', 'urgent', 'help', 'need', 'immediately', 'now', 'tulong', 'saklolo'];
        urgencyWords.forEach(word => {
            if (lowerText.includes(word)) {
                confidence += 10;
            }
        });

        // Check for hashtags
        const hashtags = text.match(/#\w+/g) || [];
        if (hashtags.length > 0) {
            confidence += 10;
        }

        return Math.min(confidence, 100); // Cap at 100%
    }
} 