// Facebook Data Access Configuration
class FacebookDataAccess {
    constructor(auth) {
        this.auth = auth;
        this.pageId = '100069248977961'; // BFP Dasmariñas City Fire Station
    }

    async getPagePosts(since = null) {
        return new Promise((resolve, reject) => {
            const params = {
                fields: 'id,message,created_time,place,coordinates,comments{message,created_time}',
                limit: 100
            };

            if (since) {
                params.since = since;
            }

            FB.api(
                `/${this.pageId}/posts`,
                'GET',
                params,
                (response) => {
                    if (!response || response.error) {
                        reject(new Error(response?.error?.message || 'Failed to get page posts'));
                    } else {
                        resolve(response.data || []);
                    }
                }
            );
        });
    }

    async searchPosts(keywords, since = null) {
        const posts = await this.getPagePosts(since);
        return posts.filter(post => {
            if (!post.message) return false;
            const message = post.message.toLowerCase();
            return keywords.some(keyword => message.includes(keyword.toLowerCase()));
        });
    }

    async getPostDetails(postId) {
        return new Promise((resolve, reject) => {
            FB.api(
                `/${postId}`,
                'GET',
                {
                    fields: 'id,message,created_time,place,coordinates,comments{message,created_time,from},reactions.summary(true)'
                },
                (response) => {
                    if (!response || response.error) {
                        reject(new Error(response?.error?.message || 'Failed to get post details'));
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }

    async monitorRealtimeUpdates(callback) {
        // Subscribe to page updates
        const subscription = {
            object: 'page',
            callback_url: `${window.location.origin}/webhook`,
            fields: ['feed', 'comments'],
            include_values: true
        };

        return new Promise((resolve, reject) => {
            FB.api(
                `/${this.pageId}/subscribed_apps`,
                'POST',
                subscription,
                (response) => {
                    if (!response || response.error) {
                        reject(new Error('Failed to subscribe to updates'));
                    } else {
                        // Set up WebSocket connection for real-time updates
                        this.setupWebSocket(callback);
                        resolve(response);
                    }
                }
            );
        });
    }

    setupWebSocket(callback) {
        const ws = new WebSocket('wss://streaming-graph.facebook.com/');
        
        ws.onopen = () => {
            console.log('WebSocket connection established');
        };

        ws.onmessage = (event) => {
            const update = JSON.parse(event.data);
            if (update && update.entry) {
                update.entry.forEach(entry => {
                    if (entry.changes) {
                        entry.changes.forEach(change => {
                            callback(change);
                        });
                    }
                });
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.setupWebSocket(callback), 5000);
        };

        this.websocket = ws;
    }

    async getLocationInfo(post) {
        if (post.place) {
            return {
                name: post.place.name,
                city: post.place.location?.city || 'Dasmariñas City',
                province: post.place.location?.state || 'Cavite',
                coordinates: post.coordinates || post.place.location ? {
                    lat: post.place.location.latitude,
                    lng: post.place.location.longitude
                } : null
            };
        }

        // Try to extract location from message
        const locationKeywords = [
            'sa', 'at', 'in', 'near',
            'barangay', 'brgy',
            'street', 'st',
            'avenue', 'ave'
        ];

        const message = post.message.toLowerCase();
        for (const keyword of locationKeywords) {
            const index = message.indexOf(keyword + ' ');
            if (index !== -1) {
                const locationStart = index + keyword.length + 1;
                const locationEnd = message.indexOf('.', locationStart);
                if (locationEnd !== -1) {
                    return {
                        name: post.message.substring(locationStart, locationEnd).trim(),
                        city: 'Dasmariñas City',
                        province: 'Cavite',
                        coordinates: null
                    };
                }
            }
        }

        return null;
    }

    stop() {
        if (this.websocket) {
            this.websocket.close();
        }
    }
}

// Export the class
window.FacebookDataAccess = FacebookDataAccess; 