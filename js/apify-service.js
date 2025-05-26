// Updated ApifyService class for Facebook Hashtag Scraper
export default class ApifyService {
    constructor() {
        this.APIFY_TOKEN = 'apify_api_bfKwGpgO03VZdl6OsCyIguoYNsmJpv4cB8Tw';
        this.ACTOR_ID = 'JDZvfbdvlw8eWlPfp';
        this.BASE_URL = 'https://api.apify.com/v2';
        this.RUNS_URL = `${this.BASE_URL}/acts/JDZvfbdvlw8eWlPfp/runs?token=${this.APIFY_TOKEN}`;
        this.monitoringInterval = null;
        this.keywords = ['sunog', 'fire', 'nasusunog', 'fire alert'];
        this.connectionStatus = {
            isConnected: false,
            lastCheck: null,
            actorStatus: 'unknown'
        };
        
        // Updated Facebook Hashtag Scraper configuration
        this.scraperConfig = {
            hashtag: "sunogsadasma",
            iterations: 2
        };
        this.lastFetchedPostIds = [];
        this.lastProcessedPostKey = null; // Store the last processed post's unique key
    }

    async checkConnection() {
        try {
            // Check actor status
            const actorResponse = await fetch(`${this.BASE_URL}/acts/JDZvfbdvlw8eWlPfp?token=${this.APIFY_TOKEN}`);
            if (!actorResponse.ok) {
                throw new Error('Actor not found or inaccessible');
            }
            const actorData = await actorResponse.json();

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
                actorName: actorData.name,
                lastRunId: latestRun ? latestRun.id : null,
                lastRunStatus: latestRun ? latestRun.status : null
            };

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

            window.dispatchEvent(new CustomEvent('apifyStatusUpdate', {
                detail: this.connectionStatus
            }));

            throw error;
        }
    }

    async startMonitoring() {
        try {
            await this.checkConnection();
            await this.startNewRun();
            await this.fetchAndProcessData();
            // Update monitoring interval to 2 minutes
            this.monitoringInterval = setInterval(async () => {
                await this.checkConnection();
                await this.fetchAndProcessData();
            }, 2 * 60 * 1000); // Every 2 minutes
            console.log('Apify monitoring started successfully');
            return true;
        } catch (error) {
            console.error('Failed to start Apify monitoring:', error);
            throw error;
        }
    }

    async startNewRun() {
        try {
            const actorResponse = await fetch(`${this.BASE_URL}/acts/scraping_solutions~facebook-hashtag-scraper/runs?token=${this.APIFY_TOKEN}`, {
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

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    updateKeywords(newKeywords) {
        this.keywords = newKeywords;
        this.scraperConfig.hashtags = newKeywords;
        console.log('Keywords and hashtags updated:', this.keywords);
    }

    updateSearchQuery(searchQuery) {
        const hashtags = searchQuery.split(' OR ').map(tag => tag.replace(/"/g, '').trim());
        this.scraperConfig.hashtags = hashtags;
        this.restartMonitoring();
    }

    async restartMonitoring() {
        try {
            this.stopMonitoring();
            await this.startNewRun();
            this.monitoringInterval = setInterval(() => {
                this.fetchAndProcessData();
            }, 5 * 60 * 1000);
            
            console.log('Monitoring restarted with new hashtags:', this.scraperConfig.hashtags);
        } catch (error) {
            console.error('Failed to restart monitoring:', error);
            throw error;
        }
    }

    async fetchAndProcessData() {
        try {
            // Fetch all runs
            const runsRes = await fetch(this.RUNS_URL);
            if (!runsRes.ok) {
                throw new Error(`Failed to fetch runs: ${runsRes.status}`);
            }
            const runsData = await runsRes.json();
            const runs = runsData.data.items;
            if (!runs || runs.length === 0) {
                throw new Error('No runs found');
            }
            let allPosts = [];
            // Fetch posts from each run's dataset
            for (const run of runs) {
                const datasetId = run.defaultDatasetId;
                if (!datasetId) continue;
                const postsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${this.APIFY_TOKEN}&limit=99999`);
                if (!postsRes.ok) continue;
                const posts = await postsRes.json();
                allPosts = allPosts.concat(posts);
            }
            // Deduplicate by id/permalink/date
            const postIds = allPosts.map(post => post.id || post._id || JSON.stringify(post));
            const isNew = postIds.length !== this.lastFetchedPostIds.length || postIds.some((id, idx) => id !== this.lastFetchedPostIds[idx]);
            if (!isNew) {
                // No new data, skip processing
                return;
            }
            this.lastFetchedPostIds = postIds;
            const processedPosts = this.processPosts(allPosts);
            window.dispatchEvent(new CustomEvent('apifyPostsFound', {
                detail: {
                    posts: processedPosts,
                    runStatus: runs[0].status,
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
        if (!posts || posts.length === 0) return [];
        // Sort posts by date descending (newest first)
        const sortedPosts = posts.slice().sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp));
        // Deduplicate by permalink and date
        const seen = new Set();
        const uniquePosts = [];
        for (const post of sortedPosts) {
            const permalink = post.permalink || post.url || '';
            const dateKey = post.date || post.timestamp || '';
            // Deduplicate by permalink and date
            const key = `${permalink}::${dateKey}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniquePosts.push(post);
            }
        }
        // Include posts where 'sunogsadasma' appears in content, accountID, or brand
        const hashtag = 'sunogsadasma';
        return uniquePosts
            .filter(post => {
                const content = (post.content || post.text || '').toLowerCase();
                const accountId = (post.accountID || post.accountId || '').toLowerCase();
                const brand = (post.brand || '').toLowerCase();
                return (
                    content.includes(hashtag) ||
                    accountId.includes(hashtag) ||
                    brand.includes(hashtag)
                );
            })
            .map(post => {
                const location = this.extractLocation(post.content || post.text || '');
                const timestamp = post.date ? new Date(post.date) : new Date();
            return {
                    id: post.permalink || post.url || `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    text: post.content || post.text || '',
                    message: post.content || post.text || '',
                date: timestamp,
                    url: post.permalink || post.url || '',
                location: location,
                    confidence: 100,
                    source: 'Facebook',
                    hashtags: (post.content || '').match(/#\w+/g) || [],
                    likes: post.like_count || post.likes || 0,
                    comments: post.comment_count || post.comments || 0,
                    shares: post.share_count || post.shares || 0
            };
            });
    }

    extractLocation(text) {
        if (!text) return 'Unknown Location';
        
        // Dasmariñas specific location patterns
        const locationPatterns = [
            /in\s+([^,.]+)\s+(?:barangay|brgy\.?|bgy\.?)/i,
            /at\s+([^,.]+)\s+(?:barangay|brgy\.?|bgy\.?)/i,
            /near\s+([^,.]+)\s+(?:barangay|brgy\.?|bgy\.?)/i,
            /location:\s*([^,.]+)/i,
            /sa\s+([^,.]+)\s+(?:barangay|brgy\.?|bgy\.?)/i,
            /sa\s+([^,.]+)\s+city/i,
            /sa\s+([^,.]+)\s+street/i,
            /sa\s+([^,.]+)\s+avenue/i,
            /sa\s+([^,.]+)\s+highway/i,
            /sa\s+([^,.]+)\s+road/i,
            /sa\s+([^,.]+)\s+blvd/i,
            /sa\s+([^,.]+)\s+boulevard/i,
            /sa\s+([^,.]+)\s+subdivision/i,
            /sa\s+([^,.]+)\s+village/i,
            /sa\s+([^,.]+)\s+phase/i,
            /sa\s+([^,.]+)\s+block/i,
            /sa\s+([^,.]+)\s+lot/i,
            /sa\s+([^,.]+)\s+unit/i,
            /sa\s+([^,.]+)\s+floor/i,
            /sa\s+([^,.]+)\s+building/i
        ];

        // Known Dasmariñas locations for validation
        const knownLocations = [
            'salawag', 'paliparan', 'burol', 'langkaan', 'sampaguita',
            'saint peter', 'saint paul', 'saint john', 'saint luke',
            'saint mark', 'saint matthew', 'saint james', 'saint thomas',
            'saint andrew', 'saint philip', 'saint bartholomew', 'saint simon',
            'saint jude', 'saint matthias', 'saint stephen', 'saint barnabas',
            'saint timothy', 'saint titus', 'saint philemon', 'saint peter',
            'saint paul', 'saint john', 'saint luke', 'saint mark',
            'saint matthew', 'saint james', 'saint thomas', 'saint andrew',
            'saint philip', 'saint bartholomew', 'saint simon', 'saint jude',
            'saint matthias', 'saint stephen', 'saint barnabas', 'saint timothy',
            'saint titus', 'saint philemon', 'dasmariñas', 'dasma',
            'dasmariñas city', 'dasmariñas cavite', 'cavite'
        ];

        for (const pattern of locationPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const location = match[1].trim().toLowerCase();
                // Validate if the location is in Dasmariñas
                if (knownLocations.some(knownLoc => location.includes(knownLoc))) {
                return match[1].trim();
                }
            }
        }

        // Check if the text contains any known locations
        for (const location of knownLocations) {
            if (text.toLowerCase().includes(location)) {
                return location.charAt(0).toUpperCase() + location.slice(1);
            }
        }

        return 'Unknown Location';
    }

    calculateConfidence(text) {
        if (!text) return 0;

        const lowerText = text.toLowerCase();
        let confidence = 0;

        // Updated keywords for Dasmariñas specific content
        const keywords = [
            'sunog', 'fire', 'nasusunog', 'fire alert',
            'emergency', 'tulong', 'saklolo', 'help',
            'bfp', 'bureau of fire protection', 'fire station',
            'firefighter', 'rescue', 'evacuation', 'evacuate',
            'evacuated', 'nasusunog', 'nasusunog na', 'may sunog',
            'may nasusunog', 'sunog sa', 'fire in', 'fire at',
            'dasmariñas', 'dasma', 'dasmariñas city', 'dasmariñas cavite'
        ];

        keywords.forEach(keyword => {
            if (lowerText.includes(keyword.toLowerCase())) {
                confidence += 15;
            }
        });

        if (this.extractLocation(text) !== 'Unknown Location') {
            confidence += 30; // Increased location confidence for Dasmariñas
        }

        const urgencyWords = [
            'emergency', 'urgent', 'help', 'need', 'immediately', 'now',
            'tulong', 'saklolo', 'emergency', 'kagipitan', 'delikado',
            'dangerous', 'danger', 'evacuate', 'evacuation', 'evacuated',
            'evacuating', 'evacuation center', 'evacuation area',
            'dasmariñas', 'dasma', 'dasmariñas city', 'dasmariñas cavite'
        ];
        
        urgencyWords.forEach(word => {
            if (lowerText.includes(word)) {
                confidence += 10;
            }
        });

        const hashtags = text.match(/#\w+/g) || [];
        if (hashtags.length > 0) {
            confidence += 15;
        }

        // Additional confidence for Dasmariñas specific hashtags
        if (hashtags.some(tag => tag.toLowerCase().includes('dasmariñas') || tag.toLowerCase().includes('dasma'))) {
            confidence += 20;
        }

        return Math.min(confidence, 100);
    }
} 