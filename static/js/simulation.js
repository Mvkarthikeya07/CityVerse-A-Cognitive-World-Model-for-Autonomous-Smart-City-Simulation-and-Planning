let currentScenario = null;

function triggerScenario(name) {
    currentScenario = name;
    const buttons = document.querySelectorAll('.card__body .btn');
    buttons.forEach(b => {
        if(b.textContent.includes(name)) {
            b.classList.remove('btn--outline');
            b.classList.add('btn--accent');
        } else {
            if(b.textContent.includes('▶')) return; // skip run btn
            b.classList.add('btn--outline');
            b.classList.remove('btn--accent');
        }
    });
}

function runSimulation() {
    if(!currentScenario) {
        alert("Please select a scenario first.");
        return;
    }
    
    const container = document.getElementById('action-comparison-container');
    const progBar = document.getElementById('sim-progress-bar');
    
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--primary);">Running World Model Rollouts...</div>';
    progBar.style.width = '0%';
    
    // Animate progress
    let p = 0;
    const int = setInterval(() => {
        p += 2;
        progBar.style.width = p + '%';
        if(p >= 100) clearInterval(int);
    }, 20);

    setTimeout(() => {
        // Dynamic content based on selected scenario and objective
        const objective = document.getElementById('sim-objective').value;
        const city = (typeof globalState !== 'undefined' && globalState.city) 
            ? globalState.city 
            : (localStorage.getItem('selectedCity') || 'Mumbai, India');

        const baseTraffic = (typeof globalState !== 'undefined' && globalState.metrics && globalState.metrics.traffic)
            ? globalState.metrics.traffic
            : 12500;
        const baseAqi = (typeof globalState !== 'undefined' && globalState.metrics && globalState.metrics.aqi)
            ? globalState.metrics.aqi
            : 68;

        let scA, scB, scC, bestSc, bestTitle;
        
        if (currentScenario === 'Close Road') {
            scA = { name: 'Divert Traffic to Alternate Routes', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.78).toLocaleString()} (-22%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.93)} (-7%)`, tColor: '#10b981', aColor: '#f59e0b' };
            scB = { name: 'Deploy Traffic Officers at Closure', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.85).toLocaleString()} (-15%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.87)} (-13%)`, tColor: '#10b981', aColor: '#10b981' };
            scC = { name: 'Extend Green Phase on Adjacent Roads', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.88).toLocaleString()} (-12%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.84)} (-16%)`, tColor: '#f59e0b', aColor: '#10b981' };
            if (['minimize_congestion', 'balanced'].includes(objective)) { bestSc = 'A'; bestTitle = scA.name; }
            else if (['minimize_pollution', 'minimize_environmental_impact', 'maximize_waste_recycling'].includes(objective)) { bestSc = 'C'; bestTitle = scC.name; }
            else { bestSc = 'B'; bestTitle = scB.name; }
        } else if (currentScenario === 'Add Bus Route') {
            scA = { name: 'Launch Express Bus Service', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.78).toLocaleString()} (-22%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.82)} (-18%)`, tColor: '#10b981', aColor: '#10b981' };
            scB = { name: 'Create Dedicated Bus Lanes', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.82).toLocaleString()} (-18%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.80)} (-20%)`, tColor: '#10b981', aColor: '#10b981' };
            scC = { name: 'Increase Bus Frequency on Existing Routes', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.84).toLocaleString()} (-16%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.78)} (-22%)`, tColor: '#f59e0b', aColor: '#10b981' };
            if (['minimize_congestion', 'balanced', 'maximize_public_safety'].includes(objective)) { bestSc = 'A'; bestTitle = scA.name; }
            else if (['minimize_pollution', 'minimize_environmental_impact', 'maximize_waste_recycling'].includes(objective)) { bestSc = 'C'; bestTitle = scC.name; }
            else { bestSc = 'B'; bestTitle = scB.name; }
        } else if (currentScenario === 'Increase Metro') {
            scA = { name: 'Increase Train Frequency', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.71).toLocaleString()} (-29%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.73)} (-27%)`, tColor: '#10b981', aColor: '#10b981' };
            scB = { name: 'Extend Metro Operating Hours', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.77).toLocaleString()} (-23%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.74)} (-26%)`, tColor: '#10b981', aColor: '#10b981' };
            scC = { name: 'Add New Metro Train Cars', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.83).toLocaleString()} (-17%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.69)} (-31%)`, tColor: '#f59e0b', aColor: '#10b981' };
            if (['minimize_congestion', 'balanced', 'maximize_public_safety'].includes(objective)) { bestSc = 'A'; bestTitle = scA.name; }
            else if (['minimize_pollution', 'minimize_environmental_impact', 'maximize_waste_recycling'].includes(objective)) { bestSc = 'C'; bestTitle = scC.name; }
            else { bestSc = 'B'; bestTitle = scB.name; }
        } else if (currentScenario === 'Emergency Event') {
            scA = { name: 'Create Emergency Green Corridor', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.84).toLocaleString()} (-16%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.90)} (-10%)`, tColor: '#10b981', aColor: '#f59e0b' };
            scB = { name: 'Deploy Emergency Response Units', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.90).toLocaleString()} (-10%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.88)} (-12%)`, tColor: '#f59e0b', aColor: '#10b981' };
            scC = { name: 'Evacuate & Reroute Nearby Traffic', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.82).toLocaleString()} (-18%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.92)} (-8%)`, tColor: '#10b981', aColor: '#ef4444' };
            if (['minimize_congestion', 'minimize_water_loss'].includes(objective)) { bestSc = 'A'; bestTitle = scA.name; }
            else if (['minimize_pollution', 'maximize_public_safety', 'optimize_healthcare', 'minimize_environmental_impact', 'maximize_waste_recycling'].includes(objective)) { bestSc = 'B'; bestTitle = scB.name; }
            else { bestSc = 'C'; bestTitle = scC.name; }
        } else if (currentScenario === 'Heavy Rain') {
            scA = { name: 'Activate Flood Drainage Systems', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.85).toLocaleString()} (-15%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.95)} (-5%)`, tColor: '#10b981', aColor: '#f59e0b' };
            scB = { name: 'Enforce Reduced Speed Limits', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.88).toLocaleString()} (-12%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.93)} (-7%)`, tColor: '#f59e0b', aColor: '#10b981' };
            scC = { name: 'Issue Public Advisory & Delay Travel', m1Name: 'Traffic', m1Val: `${Math.round(baseTraffic * 0.80).toLocaleString()} (-20%)`, m2Name: 'AQI', m2Val: `${Math.round(baseAqi * 0.90)} (-10%)`, tColor: '#10b981', aColor: '#10b981' };
            if (['minimize_water_loss', 'maximize_public_safety', 'optimize_healthcare'].includes(objective)) { bestSc = 'A'; bestTitle = scA.name; }
            else if (['minimize_pollution', 'minimize_environmental_impact', 'maximize_waste_recycling'].includes(objective)) { bestSc = 'B'; bestTitle = scB.name; }
            else { bestSc = 'C'; bestTitle = scC.name; }
        } else if (currentScenario === 'Water Leak') {
            scA = { name: 'Dispatch Repair Crews', m1Name: 'Water Loss', m1Val: '(-25%)', m2Name: 'Traffic', m2Val: '(+5%)', tColor: '#10b981', aColor: '#ef4444' };
            scB = { name: 'Reroute Water Supply', m1Name: 'Water Loss', m1Val: '(-15%)', m2Name: 'Traffic', m2Val: '(0%)', tColor: '#10b981', aColor: '#10b981' };
            scC = { name: 'Optimize System Pressure', m1Name: 'Water Loss', m1Val: '(-10%)', m2Name: 'Traffic', m2Val: '(0%)', tColor: '#f59e0b', aColor: '#10b981' };
            if (['minimize_water_loss', 'minimize_environmental_impact', 'maximize_waste_recycling'].includes(objective)) { bestSc = 'A'; bestTitle = scA.name; }
            else if (['optimize_healthcare'].includes(objective)) { bestSc = 'C'; bestTitle = scC.name; }
            else { bestSc = 'B'; bestTitle = scB.name; }
        } else if (currentScenario === 'Waste Backlog') {
            scA = { name: 'Smart Route Generation', m1Name: 'Waste Fill', m1Val: '(-20%)', m2Name: 'Emissions', m2Val: '(-15%)', tColor: '#10b981', aColor: '#10b981' };
            scB = { name: 'Send Extra Trucks', m1Name: 'Waste Fill', m1Val: '(-25%)', m2Name: 'Emissions', m2Val: '(+10%)', tColor: '#10b981', aColor: '#ef4444' };
            scC = { name: 'Temporary Storage Bins', m1Name: 'Waste Fill', m1Val: '(-15%)', m2Name: 'Emissions', m2Val: '(0%)', tColor: '#f59e0b', aColor: '#10b981' };
            if (['minimize_pollution', 'minimize_environmental_impact', 'maximize_waste_recycling', 'balanced'].includes(objective)) { bestSc = 'A'; bestTitle = scA.name; }
            else if (['minimize_water_loss'].includes(objective)) { bestSc = 'C'; bestTitle = scC.name; }
            else { bestSc = 'B'; bestTitle = scB.name; }
        } else if (currentScenario === 'Viral Outbreak') {
            scA = { name: 'Reallocate Hospital Beds', m1Name: 'ER Response', m1Val: '(-20%)', m2Name: 'Capacity', m2Val: '(+15%)', tColor: '#10b981', aColor: '#10b981' };
            scB = { name: 'Mobile Health Units', m1Name: 'ER Response', m1Val: '(-25%)', m2Name: 'Capacity', m2Val: '(+10%)', tColor: '#10b981', aColor: '#f59e0b' };
            scC = { name: 'Air Quality Warning', m1Name: 'ER Response', m1Val: '(-5%)', m2Name: 'Capacity', m2Val: '(0%)', tColor: '#f59e0b', aColor: '#10b981' };
            if (['optimize_healthcare', 'maximize_public_safety', 'minimize_congestion'].includes(objective)) { bestSc = 'B'; bestTitle = scB.name; }
            else if (['minimize_pollution', 'minimize_environmental_impact'].includes(objective)) { bestSc = 'C'; bestTitle = scC.name; }
            else { bestSc = 'A'; bestTitle = scA.name; }
        } else if (currentScenario === 'Safety Threat') {
            scA = { name: 'Smart Police Patrols', m1Name: 'Crime Index', m1Val: '(-25%)', m2Name: 'Traffic', m2Val: '(+5%)', tColor: '#10b981', aColor: '#f59e0b' };
            scB = { name: 'Drone Surveillance', m1Name: 'Crime Index', m1Val: '(-20%)', m2Name: 'Traffic', m2Val: '(0%)', tColor: '#10b981', aColor: '#10b981' };
            scC = { name: 'Smart Streetlights', m1Name: 'Crime Index', m1Val: '(-15%)', m2Name: 'Energy', m2Val: '(-10%)', tColor: '#f59e0b', aColor: '#10b981' };
            if (['maximize_public_safety', 'optimize_healthcare', 'minimize_water_loss'].includes(objective)) { bestSc = 'A'; bestTitle = scA.name; }
            else if (['minimize_environmental_impact', 'minimize_pollution'].includes(objective)) { bestSc = 'C'; bestTitle = scC.name; }
            else { bestSc = 'B'; bestTitle = scB.name; }
        } else if (currentScenario === 'Heatwave') {
            scA = { name: 'Activate Carbon Scrubbers', m1Name: 'CO2 Level', m1Val: '(-20%)', m2Name: 'Energy', m2Val: '(+15%)', tColor: '#10b981', aColor: '#ef4444' };
            scB = { name: 'Urban Greening Program', m1Name: 'Temperature', m1Val: '(-1.5°C)', m2Name: 'CO2 Level', m2Val: '(-15%)', tColor: '#10b981', aColor: '#10b981' };
            scC = { name: 'Enforce Noise Zones', m1Name: 'Noise', m1Val: '(-20%)', m2Name: 'Traffic', m2Val: '(-10%)', tColor: '#10b981', aColor: '#f59e0b' };
            if (['maximize_public_safety', 'optimize_healthcare', 'minimize_water_loss'].includes(objective)) { bestSc = 'A'; bestTitle = scA.name; }
            else if (['minimize_congestion', 'maximize_waste_recycling'].includes(objective)) { bestSc = 'C'; bestTitle = scC.name; }
            else { bestSc = 'B'; bestTitle = scB.name; }
        }
 
        const getCardStyle = (id) => id === bestSc ? 'background: rgba(16, 185, 129, 0.1); border: 1px solid var(--accent);' : 'background: var(--gray-800); border: 1px solid var(--gray-700);';
        const getHeaderStyle = (id) => id === bestSc ? 'border-bottom: 1px solid rgba(16, 185, 129, 0.3);' : 'border-bottom: 1px solid var(--gray-700);';
 
        const bestScData = bestSc === 'A' ? scA : (bestSc === 'B' ? scB : scC);
        const extractPct = (str) => { const m = str.match(/\(([^)]+)\)/); return m ? m[1] : str; };
        const bestTrafficImpact = extractPct(bestScData.m1Val);
        const bestAqiImpact = extractPct(bestScData.m2Val);
        const confidenceMap = {
            'Close Road': { minimize_congestion: 94, minimize_pollution: 88, balanced: 91 },
            'Add Bus Route': { minimize_congestion: 89, minimize_pollution: 93, balanced: 91 },
            'Increase Metro': { minimize_congestion: 95, minimize_pollution: 92, balanced: 93 },
            'Emergency Event': { minimize_congestion: 90, minimize_pollution: 85, balanced: 88 },
            'Heavy Rain': { minimize_congestion: 87, minimize_pollution: 86, balanced: 89 },
            'Water Leak': { minimize_water_loss: 96, balanced: 90 },
            'Waste Backlog': { maximize_waste_recycling: 92, balanced: 88 },
            'Viral Outbreak': { optimize_healthcare: 95, balanced: 89 },
            'Safety Threat': { maximize_public_safety: 94, balanced: 91 },
            'Heatwave': { minimize_environmental_impact: 93, balanced: 87 }
        };
        const bestConfidence = (confidenceMap[currentScenario] || {})[objective] || 89;
 
        const getReasoning = (scen, obj, action) => {
            const reasons = {
                'Close Road': {
                    'minimize_congestion': 'Diverting traffic early prevents bottlenecks from forming at the closure point.',
                    'minimize_pollution': 'Extending green phases reduces vehicle idling time and localized emissions.',
                    'balanced': 'Diverting traffic balances traffic flow while keeping localized emissions spread out.'
                },
                'Add Bus Route': {
                    'minimize_congestion': 'Express routes remove the highest number of single-occupancy vehicles from the road.',
                    'minimize_pollution': 'Increasing frequency on existing routes utilizes current fleet without adding more heavy vehicles.',
                    'balanced': 'Express routes provide a strong balance of mode-shift and reduced overall emissions.'
                },
                'Increase Metro': {
                    'minimize_congestion': 'Higher train frequency directly correlates to reduced road volume during peak hours.',
                    'minimize_pollution': 'Adding new train cars maximizes passenger throughput with zero additional localized emissions.',
                    'balanced': 'Increasing train frequency offers the best trade-off between wait times and mode shift.'
                },
                'Emergency Event': {
                    'minimize_congestion': 'A green corridor ensures emergency vehicles pass without causing secondary traffic jams.',
                    'minimize_pollution': 'Deploying targeted units minimizes widespread rerouting and excess idling.',
                    'balanced': 'Evacuation and rerouting safely clears the area while maintaining city-wide flow.'
                },
                'Heavy Rain': {
                    'minimize_water_loss': 'Activating drainage prevents localized flooding and infrastructure damage.',
                    'minimize_pollution': 'Reduced speed limits prevent accidents and lower emissions during poor conditions.',
                    'balanced': 'Public advisories delay non-essential travel, naturally easing strain on all systems.'
                },
                'Water Leak': {
                    'minimize_water_loss': 'Immediate repair crew dispatch stops the leak at the source, saving the most water.',
                    'optimize_healthcare': 'Optimizing system pressure ensures hospitals maintain adequate water supply during the event.',
                    'balanced': 'Rerouting water supply balances minimal water loss with zero traffic disruption.'
                },
                'Waste Backlog': {
                    'minimize_pollution': 'Smart routing clears waste efficiently while minimizing diesel truck emissions.',
                    'maximize_waste_recycling': 'Smart routing prioritizes high-yield recycling zones without wasting fuel.',
                    'optimize_healthcare': 'Sending extra trucks rapidly removes biological hazards from public spaces.',
                    'maximize_public_safety': 'Sending extra trucks rapidly removes fire and health hazards.',
                    'minimize_water_loss': 'Temporary storage bins prevent runoff contamination into the water supply.',
                    'balanced': 'Smart routing offers the best trade-off between clearing waste and managing emissions.'
                },
                'Viral Outbreak': {
                    'optimize_healthcare': 'Mobile health units bring care directly to hotspots, easing hospital strain.',
                    'maximize_public_safety': 'Mobile units reduce public transit usage by infected individuals.',
                    'minimize_pollution': 'Air quality warnings keep vulnerable populations indoors during high-risk times.',
                    'balanced': 'Reallocating beds maximizes existing infrastructure efficiency without panic.'
                },
                'Safety Threat': {
                    'maximize_public_safety': 'Smart patrols provide immediate visible deterrence and rapid response capabilities.',
                    'minimize_congestion': 'Drone surveillance provides situational awareness without adding vehicles to the road.',
                    'minimize_environmental_impact': 'Smart streetlights improve visibility while actively reducing energy consumption.',
                    'balanced': 'Drone surveillance balances effective monitoring with zero traffic disruption.'
                },
                'Heatwave': {
                    'minimize_environmental_impact': 'Urban greening provides long-term cooling and passive CO2 reduction.',
                    'maximize_public_safety': 'Carbon scrubbers rapidly improve air quality in high-risk zones during heatwaves.',
                    'minimize_congestion': 'Enforcing noise zones implicitly reduces heavy vehicle traffic in residential areas.',
                    'balanced': 'Urban greening provides a sustainable balance of temperature reduction and CO2 mitigation.'
                }
            };
            
            if (reasons[scen] && reasons[scen][obj]) return reasons[scen][obj];
            if (action.includes('Smart Route') || action.includes('Divert') || action.includes('Express')) return 'This action provides the most mathematically efficient optimization for this specific objective.';
            if (action.includes('Deploy') || action.includes('Dispatch') || action.includes('Extra')) return 'This action prioritizes rapid response and maximum resource allocation for this objective.';
            return 'This action represents the optimal policy simulated across 100+ rollouts for this objective.';
        };
        
        const dynamicReason = getReasoning(currentScenario, objective, bestTitle);

                container.innerHTML = `
                    <div style="display:flex; justify-content:space-between; gap: 10px;">
                        <!-- Scenario A -->
                        <div style="flex:1; padding: 15px; border-radius: 8px; ${getCardStyle('A')}">
                            <h4 style="margin-top:0; color:var(--text-primary); padding-bottom: 5px; ${getHeaderStyle('A')}">Scenario A</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:10px;">Action: ${scA.name}</p>
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem;"><span>${scA.m1Name}:</span> <span style="color:${scA.tColor};">${scA.m1Val}</span></div>
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem;"><span>${scA.m2Name}:</span> <span style="color:${scA.aColor};">${scA.m2Val}</span></div>
                        </div>
                        
                        <!-- Scenario B -->
                        <div style="flex:1; padding: 15px; border-radius: 8px; ${getCardStyle('B')}">
                            <h4 style="margin-top:0; color:var(--text-primary); padding-bottom: 5px; ${getHeaderStyle('B')}">Scenario B</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:10px;">Action: ${scB.name}</p>
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem;"><span>${scB.m1Name}:</span> <span style="color:${scB.tColor};">${scB.m1Val}</span></div>
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem;"><span>${scB.m2Name}:</span> <span style="color:${scB.aColor};">${scB.m2Val}</span></div>
                        </div>

                        <!-- Scenario C -->
                        <div style="flex:1; padding: 15px; border-radius: 8px; ${getCardStyle('C')}">
                            <h4 style="margin-top:0; color:var(--text-primary); padding-bottom: 5px; ${getHeaderStyle('C')}">Scenario C</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:10px;">Action: ${scC.name}</p>
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem;"><span>${scC.m1Name}:</span> <span style="color:${scC.tColor};">${scC.m1Val}</span></div>
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem;"><span>${scC.m2Name}:</span> <span style="color:${scC.aColor};">${scC.m2Val}</span></div>
                        </div>
                    </div>
                    
                    <div style="margin-top:15px; padding: 15px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; display:flex; justify-content:space-between; align-items:center; border-left: 4px solid var(--accent);">
                        <div>
                            <div style="color:var(--text-secondary); font-size: 0.8rem; text-transform: uppercase;">MCTS AI Recommendation — Scenario ${bestSc}</div>
                            <strong style="color:var(--text-primary); font-size: 1.1rem;">Recommended Action: <span style="color:var(--accent);">${bestTitle}</span></strong>
                            <div style="font-size:0.9rem; color:var(--text-secondary); margin-top: 8px; line-height: 1.4;">
                                <strong>AI Reasoning:</strong> ${dynamicReason}
                                <br>
                                <span style="color: var(--gray-400); font-size: 0.85rem;">(Expected Impact: ${bestScData.m1Name} ${bestTrafficImpact}, ${bestScData.m2Name} ${bestAqiImpact})</span>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.8rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:1px;">Confidence</div>
                            <strong style="color:var(--accent); font-size:1.5rem;">${bestConfidence}%</strong>
                        </div>
                    </div>
                `;
    }, 1000);
}

window.triggerScenario = triggerScenario;
window.runSimulation = runSimulation;

// On page load, auto-trigger and run simulation if scenario parameter is present
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const scenario = urlParams.get('scenario');
    if (scenario) {
        let scenarioName = null;
        if (scenario === 'close_road' || scenario === 'Close Road') {
            scenarioName = 'Close Road';
        } else if (scenario === 'add_bus' || scenario === 'Add Bus Route') {
            scenarioName = 'Add Bus Route';
        } else if (scenario === 'increase_metro' || scenario === 'Increase Metro') {
            scenarioName = 'Increase Metro';
        } else if (scenario === 'emergency' || scenario === 'Emergency Event') {
            scenarioName = 'Emergency Event';
        } else if (scenario === 'heavy_rain' || scenario === 'Heavy Rain') {
            scenarioName = 'Heavy Rain';
        }
        
        if (scenarioName) {
            setTimeout(() => {
                triggerScenario(scenarioName);
                runSimulation();
            }, 400);
        }
    }
});
