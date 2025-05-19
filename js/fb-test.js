// Facebook Integration Test Script
const FB_TEST = {
    init: function() {
        console.log('Initializing Facebook test...');
        
        // Check HTTPS first
        if (window.location.protocol !== 'https:') {
            console.error('❌ HTTPS required for Facebook Login');
            console.log('Please use HTTPS URL: https://localhost:8080/bfpkonekt/fb-test.html');
            return;
        }

        this.testConfiguration();
        this.initFacebookSDK();
    },

    testConfiguration: function() {
        console.log('Testing configuration...');
        
        // Check if config exists
        if (!window.FB_SCRAPER_CONFIG) {
            console.error('❌ Configuration not found!');
            return;
        }

        // Validate App credentials
        console.log('✓ Configuration found');
        console.log('Testing App credentials...');
        if (FB_SCRAPER_CONFIG.appId && FB_SCRAPER_CONFIG.appSecret) {
            console.log('✓ App credentials present');
        }

        // Validate pages configuration
        if (FB_SCRAPER_CONFIG.pages && FB_SCRAPER_CONFIG.pages.length > 0) {
            console.log('✓ Pages configured:', FB_SCRAPER_CONFIG.pages);
        }

        // Check domain
        const currentDomain = window.location.hostname || 'localhost';
        console.log('Current domain:', currentDomain);
        if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
            console.log('✓ Running on allowed development domain');
        } else {
            console.error('❌ Domain not configured. Please add this domain to Facebook App settings');
        }
    },

    initFacebookSDK: function() {
        console.log('Initializing Facebook SDK...');
        
        window.fbAsyncInit = function() {
            FB.init({
                appId: FB_SCRAPER_CONFIG.appId,
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });

            FB_TEST.checkLoginState();
        };

        // Load Facebook SDK
        (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s);
            js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    },

    checkLoginState: function() {
        console.log('Checking login state...');
        try {
            FB.getLoginStatus(function(response) {
                console.log('Login status:', response.status);
                if (response.status === 'connected') {
                    console.log('✓ Already logged in to Facebook');
                    FB_TEST.testPageAccess();
                } else {
                    console.log('Not logged in. Showing login button...');
                    FB_TEST.showLoginButton();
                }
            });
        } catch (error) {
            console.error('Error checking login state:', error);
            FB_TEST.showLoginButton();
        }
    },

    testPageAccess: function() {
        const pageId = FB_SCRAPER_CONFIG.pages[0].id;
        console.log('Testing access to page:', pageId);
        
        FB.api(
            `/${pageId}`,
            'GET',
            {},
            function(response) {
                if (response && !response.error) {
                    console.log(`✓ Successfully accessed page: ${response.name}`);
                    FB_TEST.testPostFetching(pageId);
                } else {
                    console.error('❌ Error accessing page:', response.error);
                    if (response.error.code === 190) {
                        console.log('Token expired or invalid. Please login again.');
                        FB_TEST.showLoginButton();
                    }
                }
            }
        );
    },

    testPostFetching: function(pageId) {
        FB.api(
            `/${pageId}/posts`,
            'GET',
            {limit: 5},
            function(response) {
                if (response && response.data) {
                    console.log('✓ Successfully fetched recent posts');
                    console.log('Sample posts:', response.data.length);
                    FB_TEST.testKeywordDetection(response.data);
                } else {
                    console.error('❌ Error fetching posts:', response.error);
                }
            }
        );
    },

    testKeywordDetection: function(posts) {
        console.log('Testing keyword detection...');
        const keywords = FB_SCRAPER_CONFIG.keywords;
        
        posts.forEach((post, index) => {
            if (post.message) {
                const detectedKeywords = keywords.filter(keyword => 
                    post.message.toLowerCase().includes(keyword.toLowerCase())
                );
                
                if (detectedKeywords.length > 0) {
                    console.log(`✓ Post ${index + 1}: Found keywords:`, detectedKeywords);
                }
            }
        });
    },

    showLoginButton: function() {
        // Remove any existing login button
        const existingBtn = document.getElementById('fb-login-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        const loginBtn = document.createElement('button');
        loginBtn.id = 'fb-login-btn';
        loginBtn.innerHTML = 'Login with Facebook';
        loginBtn.onclick = function() {
            console.log('Initiating Facebook login...');
            FB.login(function(response) {
                console.log('Login response:', response);
                if (response.authResponse) {
                    console.log('✓ Successfully logged in');
                    console.log('Access Token:', response.authResponse.accessToken);
                    FB_TEST.testPageAccess();
                } else {
                    console.log('❌ Login cancelled or failed');
                }
            }, {
                scope: 'public_profile,pages_read_engagement',
                return_scopes: true
            });
        };
        document.body.insertBefore(loginBtn, document.getElementById('console'));
    }
};

// Start testing when document is ready
document.addEventListener('DOMContentLoaded', function() {
    FB_TEST.init();
});

// Facebook Scraper Test Script
let scraper = null;

// Override console.log to display in our custom console
const consoleDiv = document.getElementById('console');
const originalLog = console.log;
const originalError = console.error;

console.log = function() {
    const args = Array.from(arguments);
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    consoleDiv.innerHTML += `<div style="color: #4CAF50;">${message}</div>`;
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
    originalLog.apply(console, arguments);
};

console.error = function() {
    const args = Array.from(arguments);
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    consoleDiv.innerHTML += `<div style="color: #f44336;">${message}</div>`;
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
    originalError.apply(console, arguments);
};

async function startTest() {
    console.log('Starting Facebook Scraper Test...');
    
    try {
        // Initialize the scraper
        scraper = new FacebookScraper(FB_SCRAPER_CONFIG);
        
        // Add event listeners
        scraper.addEventListener('fireIncidentFound', (event) => {
            console.log('🔥 Fire Incident Detected:', event.detail);
            updateTestUI(event.detail);
        });

        scraper.addEventListener('error', (event) => {
            console.error('❌ Error:', event.detail);
            updateTestUI({ error: event.detail });
        });

        // Initialize the scraper
        await scraper.initialize();
        console.log('✅ Scraper initialized successfully');

        // Start monitoring
        scraper.startMonitoring();
        console.log('✅ Monitoring started');

        // Test with sample posts
        await testSamplePosts(scraper);
    } catch (error) {
        console.error('❌ Test failed:', error);
        updateTestUI({ error: error.message });
    }
}

async function testSamplePosts(scraper) {
    const samplePosts = [
        {
            message: "Fire incident in Barangay San Agustin #sunogdasma @Sunog Alert Dasmariñas",
            created_time: new Date().toISOString(),
            from: { id: "123", name: "Test User" },
            place: { name: "Barangay San Agustin", location: { latitude: 14.3294, longitude: 120.9367 } }
        },
        {
            message: "Emergency! Fire in Dasmariñas City #firealertdasma",
            created_time: new Date().toISOString(),
            from: { id: "456", name: "Test User 2" },
            place: { name: "Dasmariñas City", location: { latitude: 14.3294, longitude: 120.9367 } }
        },
        {
            message: "Just a regular post about fire safety",
            created_time: new Date().toISOString(),
            from: { id: "789", name: "Test User 3" }
        }
    ];

    console.log('Testing with sample posts...');
    for (const post of samplePosts) {
        await scraper.processPost(post, 'test');
    }
}

function updateTestUI(data) {
    const testResults = document.getElementById('test-results');
    
    if (data.error) {
        testResults.innerHTML += `
            <div class="test-result error">
                <h3>❌ Error</h3>
                <p>${data.error}</p>
            </div>
        `;
        return;
    }

    testResults.innerHTML += `
        <div class="test-result success">
            <h3>🔥 Incident Detected</h3>
            <p><strong>Message:</strong> ${data.message}</p>
            <p><strong>Location:</strong> ${data.location}</p>
            <p><strong>Severity:</strong> ${data.severity}</p>
            <p><strong>Confidence:</strong> ${data.confidence}%</p>
            <p><strong>Source:</strong> ${data.source.pageName} (${data.source.postType})</p>
            <p><strong>Hashtags:</strong> ${data.source.hashtags.join(', ')}</p>
            <p><strong>Page Mention:</strong> ${data.source.hasPageMention ? 'Yes' : 'No'}</p>
        </div>
    `;
}

function clearResults() {
    document.getElementById('test-results').innerHTML = '';
    document.getElementById('console').innerHTML = '';
    console.log('Test results cleared');
} 