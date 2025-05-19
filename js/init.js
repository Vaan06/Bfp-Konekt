// Initialize Facebook SDK and alert system
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize Facebook SDK
        await FB.init({
            appId: FB_SCRAPER_CONFIG.appId,
            cookie: true,
            xfbml: true,
            version: 'v12.0'
        });

        // Initialize Facebook Scraper
        const fbScraper = new FacebookScraper(FB_SCRAPER_CONFIG);
        await fbScraper.initialize();

        // Initialize alert system
        await AlertSystem.init();

        // Setup event listeners
        fbScraper.addEventListener('fireIncidentFound', (event) => {
            const incident = event.detail;
            
            // Update incident log
            updateIncidentLog(incident);
            
            // Update map markers
            updateMapMarkers(incident);
            
            // Update statistics
            updateStatistics(incident);
            
            // Show notification
            showIncidentNotification(incident);
            
            // Update dashboard panels
            updateDashboardPanels(incident);
            
            // Trigger alert system
            AlertSystem.triggerAlert(incident);
        });

        fbScraper.addEventListener('error', (event) => {
            console.error('Facebook Scraper Error:', event.detail);
            AlertSystem.handleError(event.detail);
        });

        // Start monitoring
        fbScraper.startMonitoring();

        // Update connection status
        updateConnectionStatus('connected');
    } catch (error) {
        console.error('Initialization error:', error);
        updateConnectionStatus('error');
    }
});

// Update incident log
function updateIncidentLog(incident) {
    const incidentLog = document.getElementById('incident-log');
    if (!incidentLog) return;

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
            <div class="incident-details">
                <span class="confidence">Confidence: ${incident.confidence}%</span>
                <span class="source">Source: ${incident.source.pageName}</span>
            </div>
        </div>
    `;

    // Add click handler to focus on map
    logEntry.addEventListener('click', () => {
        focusOnMapLocation(incident.location);
    });

    incidentLog.insertBefore(logEntry, incidentLog.firstChild);
}

// Update map markers
function updateMapMarkers(incident) {
    if (!window.map) return;

    const marker = new google.maps.Marker({
        position: getCoordinates(incident.location),
        map: window.map,
        title: incident.location,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: getSeverityColor(incident.severity),
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff'
        }
    });

    // Add info window
    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div class="map-info-window">
                <h3>${incident.location}</h3>
                <p>${incident.message}</p>
                <div class="incident-details">
                    <span class="severity">Severity: ${incident.severity}</span>
                    <span class="time">${incident.timestamp.toLocaleTimeString()}</span>
                </div>
            </div>
        `
    });

    marker.addListener('click', () => {
        infoWindow.open(window.map, marker);
    });
}

// Update statistics
function updateStatistics(incident) {
    // Update total incidents
    const totalIncidents = document.getElementById('total-incidents');
    if (totalIncidents) {
        totalIncidents.textContent = parseInt(totalIncidents.textContent) + 1;
    }

    // Update severity counts
    const severityCount = document.getElementById(`${incident.severity}-incidents`);
    if (severityCount) {
        severityCount.textContent = parseInt(severityCount.textContent) + 1;
    }

    // Update location stats
    updateLocationStats(incident.location);
}

// Show incident notification
function showIncidentNotification(incident) {
    if (!('Notification' in window)) return;

    const notification = new Notification('New Fire Incident Alert', {
        body: `${incident.location} - ${incident.message.substring(0, 100)}...`,
        icon: 'images/fire-marker.svg',
        tag: incident.id,
        requireInteraction: true
    });

    notification.onclick = () => {
        focusOnMapLocation(incident.location);
    };
}

// Update dashboard panels
function updateDashboardPanels(incident) {
    // Update recent incidents panel
    updateRecentIncidentsPanel(incident);

    // Update severity distribution chart
    updateSeverityChart(incident.severity);

    // Update location heatmap
    updateLocationHeatmap(incident.location);
}

// Helper functions
function getCoordinates(location) {
    // TODO: Implement geocoding service
    return { lat: 0, lng: 0 };
}

function getSeverityColor(severity) {
    const colors = {
        high: '#ff0000',
        medium: '#ffa500',
        low: '#ffff00'
    };
    return colors[severity] || '#ffa500';
}

function focusOnMapLocation(location) {
    if (!window.map) return;
    const coordinates = getCoordinates(location);
    window.map.setCenter(coordinates);
    window.map.setZoom(15);
}

// Update connection status in UI
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `status-${status}`;
    }
}

// Export for testing
window.AlertSystem = AlertSystem; 