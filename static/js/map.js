class CityMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.zones = {};
        this.initMap();
    }

    initMap() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Init map centered roughly around NY
        this.map = L.map(this.containerId).setView([40.7128, -74.0060], 12);

        // Dark theme tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        this.fetchAndDrawZones();
    }

    fetchAndDrawZones() {
        fetch('/api/zones')
            .then(res => res.json())
            .then(data => {
                data.forEach(zone => {
                    this.drawZone(zone);
                });
                // Simulate live updates for zones
                setInterval(() => this.updateZoneColors(), 5000);
                this.updateZoneColors(); // Initial color update
            })
            .catch(err => console.error("Error loading zones:", err));
    }

    drawZone(zone) {
        if (!zone.center || !zone.center.lat || !zone.center.lng) return;

        const circle = L.circle([zone.center.lat, zone.center.lng], {
            color: zone.color || '#0d8eef',
            fillColor: zone.color || '#0d8eef',
            fillOpacity: 0.3,
            radius: 1200 // slightly larger
        }).addTo(this.map);

        circle.bindPopup(`
            <div style="font-family: Inter, sans-serif;">
                <h4 style="margin:0 0 5px 0;">${zone.name}</h4>
                <p style="margin:0; font-size: 12px; color: #888;">Type: ${zone.type}</p>
                <p style="margin:5px 0 0 0; font-size: 12px;" id="popup-status-${zone.id}">Status: Normal</p>
            </div>
        `);

        this.zones[zone.id] = { circle, data: zone };
    }

    updateZoneColors() {
        // Randomly simulate traffic congestion state for zones
        Object.keys(this.zones).forEach(zoneId => {
            const z = this.zones[zoneId];
            const rand = Math.random();
            let color = '#10b981'; // Green = Normal
            let status = 'Normal';
            
            if (rand > 0.85) {
                color = '#ef4444'; // Red = Congested
                status = 'Congested';
            } else if (rand > 0.6) {
                color = '#f59e0b'; // Yellow = Moderate
                status = 'Moderate';
            }
            
            z.circle.setStyle({ color: color, fillColor: color });
            
            // Update popup if open
            const popupEl = document.getElementById(`popup-status-${zoneId}`);
            if (popupEl) {
                popupEl.textContent = `Status: ${status}`;
                popupEl.style.color = color;
            }
        });
    }
}

window.CityMap = CityMap;

// Auto-init on elements
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('city-map')) new CityMap('city-map');
    if (document.getElementById('live-city-map')) new CityMap('live-city-map');
});
