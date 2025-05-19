// Alert System Module
const AlertSystem = {
    // Configuration
    config: {
        checkInterval: 5 * 60 * 1000, // Check every 5 minutes
        keywords: {
            fire: ['sunog', 'apoy', 'nasusunog', 'may sunog', 'fire', 'emergency', 'incident'],
            location: ['Dasmariñas', 'Dasma', 'Salawag', 'Burol', 'Paliparan', 'Sampaloc', 'San Agustin'],
            severity: {
                high: ['emergency', 'urgent', 'critical', 'major'],
                medium: ['incident', 'fire', 'sunog'],
                low: ['smoke', 'alarm', 'report']
            }
        },
        alertLevels: {
            high: {
                sound: 'sounds/alert-high.mp3',
                color: '#ff0000',
                priority: 2
            },
            medium: {
                sound: 'sounds/alert-medium.mp3',
                color: '#ffa500',
                priority: 1
            },
            low: {
                sound: 'sounds/alert-low.mp3',
                color: '#ffff00',
                priority: 0
            }
        },
        historyLimit: 100, // Number of incidents to keep in history
        notificationTimeout: 10000 // 10 seconds
    },

    // State
    state: {
        incidents: [],
        lastCheck: null,
        isMonitoring: false
    },

    // Initialize the alert system
    init: async function() {
        console.log('Initializing Alert System...');
        await this.setupEventListeners();
        await this.loadHistory();
        this.startMonitoring();
    },

    // Setup event listeners
    setupEventListeners: async function() {
        // Sound alerts
        this.soundAlerts = {
            high: new Audio(this.config.alertLevels.high.sound),
            medium: new Audio(this.config.alertLevels.medium.sound),
            low: new Audio(this.config.alertLevels.low.sound)
        };

        // Notification permission
        if ('Notification' in window) {
            await Notification.requestPermission();
        }

        // Setup incident history container
        this.setupIncidentHistory();
    },

    // Start monitoring for incidents
    startMonitoring: function() {
        if (this.state.isMonitoring) return;
        
        this.state.isMonitoring = true;
        setInterval(() => {
            this.checkTaggedPosts();
        }, this.config.checkInterval);
    },

    // Check for tagged posts
    checkTaggedPosts: async function() {
        try {
            const response = await FBGraphAPI.getTaggedPosts();
            if (response && response.data) {
                this.processPosts(response.data);
            }
            this.state.lastCheck = new Date();
        } catch (error) {
            console.error('Error checking tagged posts:', error);
            this.handleError(error);
        }
    },

    // Process and filter posts
    processPosts: function(posts) {
        posts.forEach(post => {
            const incident = this.analyzePost(post);
            if (incident) {
                this.triggerAlert(incident);
                this.addToHistory(incident);
            }
        });
    },

    // Analyze post for incident details
    analyzePost: function(post) {
        if (!post.message) return null;

        const message = post.message.toLowerCase();
        const location = this.extractLocation(message);
        const severity = this.determineSeverity(message);
        
        if (!location || !severity) return null;

        return {
            id: post.id,
            message: post.message,
            location: location,
            severity: severity,
            timestamp: new Date(post.created_time),
            source: {
                type: 'facebook',
                pageId: post.from.id,
                pageName: post.from.name
            },
            status: 'new'
        };
    },

    // Extract location from message
    extractLocation: function(message) {
        return this.config.keywords.location.find(loc => 
            message.includes(loc.toLowerCase())
        );
    },

    // Determine incident severity
    determineSeverity: function(message) {
        if (this.config.keywords.severity.high.some(keyword => 
            message.includes(keyword.toLowerCase())
        )) return 'high';

        if (this.config.keywords.severity.medium.some(keyword => 
            message.includes(keyword.toLowerCase())
        )) return 'medium';

        if (this.config.keywords.severity.low.some(keyword => 
            message.includes(keyword.toLowerCase())
        )) return 'low';

        return null;
    },

    // Trigger alert for an incident
    triggerAlert: function(incident) {
        const alertLevel = this.config.alertLevels[incident.severity];
        
        // Play sound alert
        this.playSoundAlert(incident.severity);

        // Show desktop notification
        this.showDesktopNotification(incident, alertLevel);

        // Update dashboard
        this.updateDashboard(incident);

        // Dispatch event
        const event = new CustomEvent('newIncident', { detail: incident });
        window.dispatchEvent(event);
    },

    // Play sound alert
    playSoundAlert: function(severity) {
        const sound = this.soundAlerts[severity];
        if (sound) {
            sound.play().catch(error => {
                console.error('Error playing sound:', error);
            });
        }
    },

    // Show desktop notification
    showDesktopNotification: function(incident, alertLevel) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Fire Incident Alert', {
                body: `${incident.location} - ${incident.message.substring(0, 100)}...`,
                icon: 'images/fire-marker.svg',
                tag: incident.id,
                requireInteraction: true
            });

            notification.onclick = () => {
                this.focusIncident(incident.id);
            };

            setTimeout(() => notification.close(), this.config.notificationTimeout);
        }
    },

    // Update dashboard with new incident
    updateDashboard: function(incident) {
        // Add to incident log
        const incidentLog = document.getElementById('incident-log');
        if (incidentLog) {
            const logEntry = document.createElement('div');
            logEntry.className = `incident-log-entry new-incident severity-${incident.severity}`;
            logEntry.innerHTML = `
                <div class="incident-log-header">
                    <span class="incident-time">${incident.timestamp.toLocaleTimeString()}</span>
                    <span class="incident-location">${incident.location}</span>
                    <span class="incident-severity">${incident.severity}</span>
                </div>
                <div class="incident-log-content">
                    <h4>Fire Incident Report</h4>
                    <p>${incident.message}</p>
                </div>
            `;
            incidentLog.insertBefore(logEntry, incidentLog.firstChild);
        }

        // Update map if location is available
        if (incident.location) {
            FB_PUBLIC_SCRAPER.addIncidentToMap({
                postId: incident.id,
                message: incident.message,
                createdTime: incident.timestamp,
                location: incident.location,
                severity: incident.severity
            });
        }
    },

    // Add incident to history
    addToHistory: function(incident) {
        this.state.incidents.unshift(incident);
        if (this.state.incidents.length > this.config.historyLimit) {
            this.state.incidents.pop();
        }
        this.saveHistory();
    },

    // Save history to localStorage
    saveHistory: function() {
        localStorage.setItem('incidentHistory', JSON.stringify(this.state.incidents));
    },

    // Load history from localStorage
    loadHistory: function() {
        const history = localStorage.getItem('incidentHistory');
        if (history) {
            this.state.incidents = JSON.parse(history);
        }
    },

    // Setup incident history container
    setupIncidentHistory: function() {
        const container = document.createElement('div');
        container.id = 'incident-history';
        container.className = 'incident-history';
        document.querySelector('.main-content').appendChild(container);
    },

    // Handle errors
    handleError: function(error) {
        console.error('Alert System Error:', error);
        this.showErrorNotification(error.message);
    },

    // Show error notification
    showErrorNotification: function(message) {
        const notification = document.createElement('div');
        notification.className = 'notification notification-error';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
};

// Export for use in other files
window.AlertSystem = AlertSystem; 