function initGoogleDigitalTwin() {
    const mapContainer = document.getElementById('google-city-map');
    if (!mapContainer || typeof L === 'undefined') return;

    // 1. Initialize Leaflet Map
    let map = L.map('google-city-map', {
        zoomControl: false // Add it later to bottom right if needed
    }).setView([19.0760, 72.8777], 12);
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Dark Mode Map Styles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
    
    // Listen to Global City Change
    window.addEventListener('cityChanged', (e) => {
        const data = e.detail;
        if (data.bounds) {
            // Leaflet expects [ [south, west], [north, east] ] or similar
            // Assuming data.bounds has { south, west, north, east }
            try {
                if (data.bounds.south && data.bounds.north) {
                    map.fitBounds([
                        [data.bounds.south, data.bounds.west],
                        [data.bounds.north, data.bounds.east]
                    ]);
                } else if (Array.isArray(data.bounds)) {
                    map.fitBounds(data.bounds);
                }
            } catch(e) {
                map.setView([data.lat, data.lng], 13);
            }
        } else {
            map.setView([data.lat, data.lng], 13);
        }
        
        // Regenerate after panning
        setTimeout(() => {
            generateCityData(map.getCenter());
        }, 500);
    });

    // Listen for Map Clicks to set new location
    map.on('click', (e) => {
        if (!e.latlng) return;
        
        // Free Nominatim Reverse Geocoder
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
            .then(res => res.json())
            .then(data => {
                let cityName = "Selected Location";
                if (data && data.address) {
                    cityName = data.address.city || data.address.town || data.address.village || data.address.suburb || data.display_name.split(',')[0];
                }

                const newState = {
                    city: cityName,
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                    metrics: null
                };

                const event = new CustomEvent('cityChanged', { detail: newState });
                window.dispatchEvent(event);
            })
            .catch(err => {
                console.error("Reverse geocoding failed", err);
                const newState = {
                    city: "Unknown Location",
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                    metrics: null
                };
                window.dispatchEvent(new CustomEvent('cityChanged', { detail: newState }));
            });
    });

    // 3. Search Box Integration
    const searchInput = document.getElementById('city-search-input');
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value;
            if(!query) return;
            
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.length > 0) {
                        const place = data[0];
                        const lat = parseFloat(place.lat);
                        const lon = parseFloat(place.lon);
                        
                        const newState = {
                            city: place.display_name.split(',')[0],
                            lat: lat,
                            lng: lon,
                            bounds: [
                                [parseFloat(place.boundingbox[0]), parseFloat(place.boundingbox[2])], // south, west
                                [parseFloat(place.boundingbox[1]), parseFloat(place.boundingbox[3])]  // north, east
                            ],
                            metrics: null
                        };
                        window.dispatchEvent(new CustomEvent('cityChanged', { detail: newState }));
                    }
                });
        }
    });

    let currentHeatmap = null;
    let currentLayerGroup = L.layerGroup().addTo(map);

    // 4. Generate Synthetic Data (AQI Heatmap & AI Recommendations)
    function generateCityData(center) {
        // Clear previous
        if (currentHeatmap) {
            map.removeLayer(currentHeatmap);
        }
        currentLayerGroup.clearLayers();

        const lat = center.lat;
        const lng = center.lng;

        // --- AQI Heatmap Layer ---
        const heatmapPoints = [];
        for (let i = 0; i < 50; i++) {
            // Random points within a radius
            const randLat = lat + (Math.random() - 0.5) * 0.1;
            const randLng = lng + (Math.random() - 0.5) * 0.1;
            const weight = Math.random(); // intensity 0-1
            heatmapPoints.push([randLat, randLng, weight]);
        }

        if (typeof L.heatLayer !== 'undefined') {
            currentHeatmap = L.heatLayer(heatmapPoints, {
                radius: 25,
                blur: 15,
                maxZoom: 15,
                gradient: {
                    0.2: 'lime',
                    0.5: 'yellow',
                    0.8: 'orange',
                    1.0: 'red'
                }
            }).addTo(map);
        }

        // --- AI Recommendation Markers ---
        // Generate 3 congested zones with AI recommendations
        const actions = ["Increase Metro Frequency", "Reroute Freight Traffic", "Optimize Signal Timing"];
        
        for (let i = 0; i < 3; i++) {
            const markerLat = lat + (Math.random() - 0.5) * 0.08;
            const markerLng = lng + (Math.random() - 0.5) * 0.08;

            const trafficVal = Math.floor(Math.random() * 10) + 90; // 90-99%
            const aqiVal = Math.floor(Math.random() * 50) + 120; // 120-170

            const contentString = `
                <div style="font-family: 'Inter', sans-serif; color: #1e293b; padding: 5px; min-width: 260px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 1.1rem; color: #ef4444;">🔴 Critical Zone Detected</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px; font-size: 0.85rem;">
                        <div>🚗 <strong>Traffic:</strong> ${trafficVal}%</div>
                        <div>💨 <strong>AQI:</strong> ${aqiVal}</div>
                        <div>⚡ <strong>Energy:</strong> ${Math.floor(Math.random() * 20 + 80)}%</div>
                        <div>💧 <strong>Water:</strong> ${Math.floor(Math.random() * 30 + 70)}%</div>
                        <div>🗑️ <strong>Waste:</strong> ${Math.floor(Math.random() * 40 + 60)}%</div>
                        <div>🏥 <strong>ER Load:</strong> ${Math.floor(Math.random() * 25 + 75)}%</div>
                        <div>🛡️ <strong>Crime Idx:</strong> ${Math.floor(Math.random() * 15 + 20)}</div>
                        <div>🌿 <strong>CO2:</strong> ${Math.floor(Math.random() * 100 + 400)}ppm</div>
                    </div>
                    <div style="margin-bottom: 10px; padding-top: 10px; border-top: 1px solid #cbd5e1;">
                        <strong style="color: #64748b;">Predicted Traffic:</strong> ${trafficVal + 5}%
                    </div>
                    <div style="background: #f0fdf4; padding: 10px; border-radius: 4px; border-left: 3px solid #10b981;">
                        <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 3px;">Recommended Action:</div>
                        <strong style="color: #10b981;">${actions[i]}</strong>
                    </div>
                    <div style="text-align: right; margin-top: 8px; font-size: 0.85rem;">
                        <strong>Confidence:</strong> <span style="color: #0d8eef;">${Math.floor(Math.random()*15)+80}%</span>
                    </div>
                </div>
            `;

            // Custom pulsing marker style using divIcon
            const pulsingIcon = L.divIcon({
                className: 'custom-pulsing-marker',
                html: '<div style="width:16px;height:16px;background:#ef4444;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px #ef4444;"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            L.marker([markerLat, markerLng], { icon: pulsingIcon })
                .bindPopup(contentString)
                .addTo(currentLayerGroup);
        }
    }

    // Initial data generation for default center
    generateCityData(map.getCenter());
}

// Ensure the function runs when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGoogleDigitalTwin);
} else {
    setTimeout(initGoogleDigitalTwin, 100);
}
