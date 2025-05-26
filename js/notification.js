// Facebook API Configuration
const FB_CONFIG = {
    appId: 'YOUR_APP_ID',
    version: 'v18.0',
    // Array of pages and groups to monitor
    sources: [
        {
            id: 'DASMA_SPOTTED_PAGE_ID',
            name: 'Dasma Spotted',
            type: 'page'
        },
        {
            id: 'DASMA_COMMUNITY_GROUP_ID',
            name: 'Dasmariñas Community',
            type: 'group'
        },
        {
            id: 'DASMA_EMERGENCY_PAGE_ID',
            name: 'Dasmariñas Emergency Updates',
            type: 'page'
        }
    ],
    // Keywords related to fire incidents
    keywords: {
        primary: ['sunog', 'fire', 'SUNOG', 'FIRE'],
        secondary: ['apoy', 'APOY', '🔥', 'emergency', 'EMERGENCY'],
        locations: [
            'dasma',
            'dasmarinas',
            'dasmariñas',
            'paliparan',
            'salitran',
            'sampaloc',
            'burol',
            'langkaan',
            'san agustin',
            'zone'
        ]
    },
    // Monitoring interval in milliseconds (30 seconds)
    monitoringInterval: 30000
};

// Initialize Facebook SDK
window.fbAsyncInit = function() {
    FB.init({
        appId: FB_CONFIG.appId,
        cookie: true,
        xfbml: true,
        version: FB_CONFIG.version
    });
};

// Load the SDK asynchronously
(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

// Facebook API Helper Class
class FacebookAPI {
    constructor() {
        this.accessToken = null;
        this.monitoringInterval = null;
        this.lastCheckedTimes = new Map();
    }

    // Login to Facebook
    async login() {
        return new Promise((resolve, reject) => {
            FB.login((response) => {
                if (response.authResponse) {
                    this.accessToken = response.authResponse.accessToken;
                    resolve(response);
                } else {
                    reject('User cancelled login or did not fully authorize.');
                }
            }, {
                scope: 'pages_read_engagement,pages_show_list,public_profile'
            });
        });
    }

    // Get posts from all configured sources
    async getAllPosts() {
        if (!this.accessToken) {
            throw new Error('Not logged in. Call login() first.');
        }

        const allPosts = [];
        for (const source of FB_CONFIG.sources) {
            try {
                const posts = await this.getSourcePosts(source);
                allPosts.push(...posts);
            } catch (error) {
                console.error(`Error fetching posts from ${source.name}:`, error);
            }
        }

        // Sort posts by date, newest first
        return allPosts.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
    }

    // Get posts from a specific source
    async getSourcePosts(source) {
        const lastChecked = this.lastCheckedTimes.get(source.id) || new Date(0);

        return new Promise((resolve, reject) => {
            FB.api(
                `/${source.id}/feed`,
                'GET',
                {
                    access_token: this.accessToken,
                    fields: 'message,created_time,from,shares,comments.summary(true),reactions.summary(true),place',
                    since: Math.floor(lastChecked.getTime() / 1000)
                },
                (response) => {
                    if (response.error) {
                        reject(response.error);
                    } else {
                        this.lastCheckedTimes.set(source.id, new Date());
                        const firePosts = this.filterFireRelatedPosts(response.data, source);
                        resolve(firePosts);
                    }
                }
            );
        });
    }

    // Enhanced filter for fire-related posts
    filterFireRelatedPosts(posts, source) {
        return posts.filter(post => {
            if (!post.message) return false;
            
            const message = post.message.toLowerCase();
            const hasFireKeyword = FB_CONFIG.keywords.primary.some(keyword => 
                message.includes(keyword.toLowerCase())
            );
            
            const hasSecondaryKeyword = FB_CONFIG.keywords.secondary.some(keyword => 
                message.includes(keyword.toLowerCase())
            );
            
            const hasLocation = FB_CONFIG.keywords.locations.some(location => 
                message.includes(location.toLowerCase())
            );

            // Post must have either:
            // 1. A primary keyword (fire-related) AND a location reference
            // 2. A secondary keyword AND a location reference
            return (hasFireKeyword || (hasSecondaryKeyword && hasLocation));

        }).map(post => ({
            username: post.from.name,
            content: post.message,
            date: new Date(post.created_time).toLocaleDateString(),
            time: new Date(post.created_time).toLocaleTimeString(),
            comments: post.comments?.summary?.total_count || 0,
            shares: post.shares?.count || 0,
            link: `https://facebook.com/${post.id}`,
            reactions: post.reactions?.summary?.total_count || 0,
            source: source.name,
            location: this.extractLocation(post.message),
            urgency: this.calculateUrgency(post)
        }));
    }

    // Extract location from post content
    extractLocation(message) {
        const locations = [];
        FB_CONFIG.keywords.locations.forEach(location => {
            const regex = new RegExp(location, 'gi');
            if (regex.test(message)) {
                locations.push(location);
            }
        });
        return locations.join(', ');
    }

    // Calculate post urgency based on various factors
    calculateUrgency(post) {
        let score = 0;
        
        // Recent posts get higher priority
        const minutesAgo = (new Date() - new Date(post.created_time)) / 60000;
        if (minutesAgo < 30) score += 3;
        else if (minutesAgo < 60) score += 2;
        else if (minutesAgo < 120) score += 1;

        // High engagement indicates importance
        if (post.shares?.count > 10) score += 2;
        if (post.comments?.summary?.total_count > 20) score += 2;
        if (post.reactions?.summary?.total_count > 50) score += 2;

        // Urgent keywords increase priority
        const urgentKeywords = ['HELP', 'URGENT', 'EMERGENCY', 'NOW', 'MALAKI'];
        urgentKeywords.forEach(keyword => {
            if (post.message.toUpperCase().includes(keyword)) score += 1;
        });

        return score;
    }

    // Start monitoring for new posts
    async startMonitoring(callback, interval = FB_CONFIG.monitoringInterval) {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        const checkPosts = async () => {
            try {
                const posts = await this.getAllPosts();
                if (posts.length > 0) {
                    callback(posts);
                }
            } catch (error) {
                console.error('Error during post monitoring:', error);
                // Attempt to relogin if token is invalid
                if (error.code === 190) { // Invalid access token
                    try {
                        await this.login();
                    } catch (loginError) {
                        console.error('Failed to relogin:', loginError);
                    }
                }
            }
        };

        // Initial check
        await checkPosts();

        // Set up periodic checking
        this.monitoringInterval = setInterval(checkPosts, interval);
        return this.monitoringInterval;
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
}

// Initialize Facebook integration when page loads
document.addEventListener('DOMContentLoaded', async function() {
    const fbApi = new FacebookAPI();
    
    // Add login button
    const loginBtn = document.createElement('button');
    loginBtn.className = 'btn btn-save';
    loginBtn.style.marginBottom = '15px';
    loginBtn.textContent = 'Connect to Facebook';
    document.querySelector('.notification-left').insertBefore(loginBtn, document.querySelector('.fb-form'));

    // Handle login and post monitoring
    loginBtn.addEventListener('click', async () => {
        try {
            await fbApi.login();
            loginBtn.textContent = 'Connected to Facebook';
            loginBtn.disabled = true;

            // Start monitoring posts
            fbApi.startMonitoring((posts) => {
                if (posts.length > 0) {
                    updatePostData(posts[0]);
                    
                    // Store other posts for later
                    window.pendingPosts = posts.slice(1);
                    
                    // Flash notification if there are more posts
                    if (window.pendingPosts.length > 0) {
                        const notificationBar = document.querySelector('.notification-bar');
                        notificationBar.style.backgroundColor = '#ff3b30';
                        setTimeout(() => {
                            notificationBar.style.backgroundColor = '#102372';
                        }, 500);
                    }
                }
            });
        } catch (error) {
            console.error('Facebook login failed:', error);
            alert('Failed to connect to Facebook. Please try again.');
        }
    });

    // Update post data in the UI with enhanced information
    function updatePostData(post) {
        document.getElementById('fb-name').value = post.username;
        document.getElementById('post-description').value = post.content;
        document.getElementById('fb-post-link').value = post.link;
        
        // Update preview with enhanced information
        document.querySelector('.post-name').innerHTML = `${post.username} <span class="source">(${post.source})</span>`;
        document.querySelector('.post-meta').innerHTML = 
            `${post.date} ${post.time} • ${post.location ? '📍 ' + post.location : '🌎'}`;
        document.querySelector('.post-content').innerHTML = formatPostContent(post.content);
        document.querySelector('.post-stats').innerHTML = 
            `<div>${post.comments} comments</div><div>${post.shares} shares</div>`;
        
        // Add urgency indicator if high urgency
        if (post.urgency >= 5) {
            document.querySelector('.post-preview').classList.add('high-urgency');
        } else {
            document.querySelector('.post-preview').classList.remove('high-urgency');
        }
    }

    // Format post content to highlight keywords
    function formatPostContent(content) {
        const keywords = ['sunog', 'fire', 'SUNOG', 'FIRE', 'apoy', 'APOY', 'emergency', 'EMERGENCY'];
        let formattedContent = content;
        keywords.forEach(keyword => {
            const regex = new RegExp(keyword, 'g');
            formattedContent = formattedContent.replace(regex, `<span>${keyword}</span>`);
        });
        return formattedContent;
    }
    
    // Handle save button click
    document.querySelector('.btn-save').addEventListener('click', function() {
        // Here you would typically save to your backend
        alert('Post saved to incident reports!');
        
        // Redirect to incident logs
        window.location.href = 'logs.html';
    });
    
    // Handle cancel button click
    document.querySelector('.btn-cancel').addEventListener('click', function() {
        // Move to next post if available
        if (window.pendingPosts && window.pendingPosts.length > 0) {
            updatePostData(window.pendingPosts.shift());
        }
    });
}); 