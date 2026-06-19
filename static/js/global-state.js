/**
 * CityMind-AI — Global State & Search Management
 * Synchronizes the selected city/area across all components using a local dataset.
 */

'use strict';

const globalState = {
    city: localStorage.getItem('selectedCity') || 'Mumbai, India',
    lat: parseFloat(localStorage.getItem('selectedLat')) || 19.0760,
    lng: parseFloat(localStorage.getItem('selectedLng')) || 72.8777,
    metrics: JSON.parse(localStorage.getItem('selectedMetrics')) || null
};

let cityDataset = [];

async function initGlobalSearch() {
    const searchInput = document.getElementById('global-city-search');
    if (!searchInput) return;

    // Fetch the local dataset
    try {
        const response = await fetch('/static/data/cities.json');
        cityDataset = await response.json();
    } catch (e) {
        console.error('[GlobalState] Failed to load cities dataset', e);
        return;
    }

    // Create Dropdown Container
    const dropdown = document.createElement('div');
    dropdown.className = 'city-search-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.top = '100%';
    dropdown.style.left = '0';
    dropdown.style.width = '100%';
    dropdown.style.background = 'var(--bg-card)';
    dropdown.style.backdropFilter = 'blur(12px)';
    dropdown.style.border = '1px solid var(--glass-border)';
    dropdown.style.borderRadius = 'var(--radius-md)';
    dropdown.style.marginTop = '5px';
    dropdown.style.maxHeight = '300px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.display = 'none';
    dropdown.style.zIndex = '9999';
    dropdown.style.boxShadow = 'var(--shadow-lg)';
    
    searchInput.parentElement.style.position = 'relative';
    searchInput.parentElement.appendChild(dropdown);

    // Render Dropdown Items
    function renderDropdown(filterText = '') {
        dropdown.innerHTML = '';
        
        const filtered = cityDataset.filter(c => c.name.toLowerCase().includes(filterText.toLowerCase()));
        
        if (filtered.length === 0) {
            dropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.9rem; text-align: center;">No cities found in dataset</div>';
        } else {
            filtered.forEach(city => {
                const item = document.createElement('div');
                item.style.padding = '10px 15px';
                item.style.cursor = 'pointer';
                item.style.borderBottom = '1px solid var(--glass-border)';
                item.style.fontSize = '0.9rem';
                item.style.transition = 'background 0.2s';
                
                item.innerHTML = `
                    <div style="font-weight: 600; color: var(--text-primary);">${city.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Traffic: ${city.traffic.toLocaleString()} • AQI: ${city.aqi}</div>
                `;

                item.addEventListener('mouseenter', () => item.style.background = 'var(--glass-hover)');
                item.addEventListener('mouseleave', () => item.style.background = 'transparent');
                
                item.addEventListener('click', () => {
                    selectCity(city);
                    dropdown.style.display = 'none';
                    searchInput.value = '';
                });

                dropdown.appendChild(item);
            });
        }
        dropdown.style.display = 'block';
    }

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length > 0) {
            renderDropdown(val);
        } else {
            dropdown.style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length > 0) {
            renderDropdown(searchInput.value.trim());
        } else {
            renderDropdown('');
        }
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (!query) return;

            dropdown.style.display = 'none';
            searchInput.blur();
            searchInput.placeholder = `Searching: ${query}...`;
            searchInput.value = '';

            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.length > 0) {
                        const place = data[0];
                        const lat = parseFloat(place.lat);
                        const lon = parseFloat(place.lon);
                        const name = place.display_name.split(',')[0];
                        
                        fetch(`/api/dashboard?city=${encodeURIComponent(name)}`)
                            .then(r => r.json())
                            .then(metrics => {
                                const cityObj = {
                                    name: name,
                                    lat: lat,
                                    lng: lon,
                                    traffic: metrics.total_vehicles.value,
                                    aqi: metrics.air_quality.value,
                                    energy: metrics.energy_load.value,
                                    alerts: metrics.active_incidents.value
                                };
                                selectCity(cityObj);
                            })
                            .catch(err => {
                                console.error('Failed to load metrics for custom city:', err);
                                selectCity({
                                    name: name,
                                    lat: lat,
                                    lng: lon,
                                    traffic: 12500,
                                    aqi: 68,
                                    energy: 420.5,
                                    alerts: 2
                                });
                            });
                    } else {
                        searchInput.placeholder = `Not found: ${query}`;
                        setTimeout(() => { searchInput.placeholder = `Current: ${globalState.city}`; }, 2000);
                    }
                })
                .catch(err => {
                    console.error('Nominatim search failed:', err);
                    searchInput.placeholder = `Search failed`;
                    setTimeout(() => { searchInput.placeholder = `Current: ${globalState.city}`; }, 2000);
                });
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.parentElement.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    function selectCity(city) {
        globalState.city = city.name;
        globalState.lat = city.lat;
        globalState.lng = city.lng;
        globalState.metrics = {
            traffic: city.traffic,
            aqi: city.aqi,
            energy: city.energy,
            alerts: city.alerts
        };

        // Save to LocalStorage
        localStorage.setItem('selectedCity', globalState.city);
        localStorage.setItem('selectedLat', globalState.lat);
        localStorage.setItem('selectedLng', globalState.lng);
        localStorage.setItem('selectedMetrics', JSON.stringify(globalState.metrics));

        console.log(`[GlobalState] City changed to ${globalState.city} via local dataset`);

        // Broadcast Event
        const event = new CustomEvent('cityChanged', { detail: globalState });
        window.dispatchEvent(event);
        
        searchInput.placeholder = `Current: ${globalState.city}`;
    }
    
    // Set initial placeholder
    searchInput.placeholder = `Current: ${globalState.city}`;
    
    // Broadcast initial state
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cityChanged', { detail: globalState }));
    }, 500);
}

// Toggle Notification Dropdown
document.addEventListener('DOMContentLoaded', () => {
    const bellBtn = document.getElementById('notification-bell-btn');
    const dropdown = document.getElementById('notification-dropdown');
    
    if (bellBtn && dropdown) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('click', (e) => {
            if (!bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }
});

// Update global notification and sidebar badges based on recommended actions
async function updateGlobalBadges(city) {
    try {
        const res = await fetch(`/api/recommendations?city=${encodeURIComponent(city)}&_=${Date.now()}`);
        const data = await res.json();
        
        if (data.status === 'success') {
            const count = data.recommendations ? data.recommendations.length : 0;
            
            // 1. Update Sidebar AI Actions Badge
            const sidebarBadge = document.querySelector('.sidebar__badge');
            if (sidebarBadge) {
                sidebarBadge.textContent = count;
                sidebarBadge.style.display = count > 0 ? 'inline-block' : 'none';
            }
            
            // 2. Update Top Bar Notification Bell Badge
            const bellBadge = document.querySelector('.notification-bell__count');
            if (bellBadge) {
                bellBadge.textContent = count;
                bellBadge.style.display = count > 0 ? 'inline-block' : 'none';
            }
            
            // 3. Populate Notification Popover Dropdown
            const dropdownList = document.getElementById('notification-dropdown-list');
            if (dropdownList) {
                if (data.recommendations && data.recommendations.length > 0) {
                    dropdownList.innerHTML = '';
                    data.recommendations.forEach(rec => {
                        const item = document.createElement('div');
                        item.style.padding = '8px 10px';
                        item.style.borderRadius = 'var(--radius-sm)';
                        item.style.background = 'rgba(255, 255, 255, 0.02)';
                        item.style.border = '1px solid var(--glass-border)';
                        item.style.cursor = 'pointer';
                        item.style.transition = 'background 0.2s, border-color 0.2s';
                        item.style.marginBottom = '4px';
                        
                        // Extract icon and clean title
                        const icon = rec.title.split(' ')[0] || '💡';
                        const cleanTitle = rec.title.replace(icon, '').trim();
                        
                        item.innerHTML = `
                            <div style="display: flex; gap: 8px; align-items: flex-start;">
                                <span style="font-size: 1.1rem; line-height: 1;">${icon}</span>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; gap: 4px;">
                                        <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${cleanTitle}</span>
                                        <span class="badge" style="font-size: 0.65rem; padding: 1px 4px; background: rgba(13, 142, 239, 0.15); color: #0d8eef; flex-shrink: 0;">${rec.impact}</span>
                                    </div>
                                    <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${rec.description}
                                    </p>
                                </div>
                            </div>
                        `;
                        
                        item.addEventListener('mouseenter', () => {
                            item.style.background = 'var(--glass-hover)';
                            item.style.borderColor = 'var(--primary)';
                        });
                        item.addEventListener('mouseleave', () => {
                            item.style.background = 'rgba(255, 255, 255, 0.02)';
                            item.style.borderColor = 'var(--glass-border)';
                        });
                        
                        item.style.borderLeft = rec.impact === 'Critical' ? '3px solid var(--danger)' : (rec.impact === 'High Impact' ? '3px solid var(--accent)' : '3px solid var(--warning)');
                        
                        item.addEventListener('click', () => {
                            window.location.href = '/recommendations';
                        });
                        
                        dropdownList.appendChild(item);
                    });
                } else {
                    dropdownList.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 15px;">No active recommendations.</div>';
                }
            }
        }
    } catch (err) {
        console.error('[GlobalState] Failed to update dynamic badges:', err);
    }
}

// Hook to global cityChanged event to trigger updates
window.addEventListener('cityChanged', (e) => {
    const data = e.detail;
    if (data && data.city) {
        // Always sync state — selectCity() already set globalState before dispatch,
        // but this also handles map clicks and external dispatches.
        globalState.city = data.city;
        globalState.lat = data.lat || globalState.lat;
        globalState.lng = data.lng || globalState.lng;
        if (data.metrics) {
            globalState.metrics = data.metrics;
        } else {
            // Fetch dynamic metrics for the new city from `/api/dashboard`
            fetch(`/api/dashboard?city=${encodeURIComponent(data.city)}`)
                .then(r => r.json())
                .then(metrics => {
                    globalState.metrics = {
                        traffic: metrics.total_vehicles?.value,
                        aqi: metrics.air_quality?.value,
                        energy: metrics.energy_load?.value,
                        alerts: metrics.active_incidents?.value
                    };
                    localStorage.setItem('selectedMetrics', JSON.stringify(globalState.metrics));
                })
                .catch(err => console.error('Failed to update metrics for city:', err));
        }
        
        localStorage.setItem('selectedCity', globalState.city);
        localStorage.setItem('selectedLat', globalState.lat);
        localStorage.setItem('selectedLng', globalState.lng);
        if (globalState.metrics) {
            localStorage.setItem('selectedMetrics', JSON.stringify(globalState.metrics));
        }

        const searchInput = document.getElementById('global-city-search');
        if (searchInput) {
            searchInput.placeholder = `Current: ${globalState.city}`;
        }
    }
    if (data && data.city) {
        updateGlobalBadges(data.city);
    }
});

// Start
document.addEventListener('DOMContentLoaded', initGlobalSearch);
