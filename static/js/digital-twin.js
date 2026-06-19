document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('digital-twin-viewport');
    if (!container || typeof THREE === 'undefined') return;

    container.innerHTML = '';

    // ─── Global Simulation State ────────────────────────────────────────────
    let simTrafficSpeed = 1.0; // 1.0 = Fast/Clear, 0.2 = Heavy/Slow
    let simPollutionColor = new THREE.Color(0x38bdf8); // Blue = Clean, Orange = Toxic
    let simPollutionOpacity = 0.4;

    // ─── Scene & Engine Setup ───────────────────────────────────────────────
    const scene = new THREE.Scene();
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--gray-900').trim() || '#0f172a';
    scene.fog = new THREE.FogExp2(bgColor, 0.0012);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 4000);
    camera.position.set(400, 300, 500);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(bgColor, 1);
    container.appendChild(renderer.domElement);

    // ─── Post-Processing (Bloom) ────────────────────────────────────────────
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.15;
    bloomPass.strength = 1.4; 
    bloomPass.radius = 0.5;

    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // ─── OrbitControls ──────────────────────────────────────────────────────
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 50;
    controls.maxDistance = 2000;

    // ─── Procedural Window Texture ──────────────────────────────────────────
    function createWindowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#0f172a'; 
        ctx.fillRect(0, 0, 256, 256);
        
        const windowSize = 4;
        const gap = 4;
        for(let y = 0; y < 256; y += windowSize + gap) {
            for(let x = 0; x < 256; x += windowSize + gap) {
                if (Math.random() > 0.5) continue; 
                
                if (Math.random() > 0.95) ctx.fillStyle = '#38bdf8'; 
                else if (Math.random() > 0.98) ctx.fillStyle = '#f43f5e'; 
                else ctx.fillStyle = '#fde047'; 

                ctx.fillRect(x, y, windowSize, windowSize);
            }
        }
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.magFilter = THREE.NearestFilter; 
        return tex;
    }

    const windowTex = createWindowTexture();

    const buildingMat = new THREE.MeshStandardMaterial({ 
        color: 0x1e293b,
        emissiveMap: windowTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.8,
        roughness: 0.8,
        metalness: 0.5
    });

    const hubMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x0d8eef,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.8
    });

    // ─── Grid City Generation ───────────────────────────────────────────────
    const cityGroup = new THREE.Group();
    scene.add(cityGroup);

    const gridSize = 24; // 24x24 blocks
    const blockSize = 40;
    const roadWidth = 16;
    const cellSize = blockSize + roadWidth;
    const offset = (gridSize * cellSize) / 2;

    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    
    // Arrays to store valid road paths for cars and pollution
    const roadX = [];
    const roadZ = [];

    for (let x = 0; x < gridSize; x++) {
        const worldX = x * cellSize - offset;
        roadX.push(worldX + blockSize / 2 + roadWidth / 2);

        for (let z = 0; z < gridSize; z++) {
            const worldZ = z * cellSize - offset;
            if (x === 0) roadZ.push(worldZ + blockSize / 2 + roadWidth / 2);

            // Skip some blocks to create parks/open areas
            if (Math.random() > 0.85) continue;

            const distFromCenter = Math.sqrt((x - gridSize/2)**2 + (z - gridSize/2)**2);
            const isCenter = distFromCenter < 5;

            // Determine block height
            const maxH = isCenter ? 250 : 80;
            const minH = isCenter ? 80 : 15;
            const height = Math.random() * (maxH - minH) + minH;

            // Spawn 1 to 4 buildings per block
            const bCount = isCenter ? 1 : Math.floor(Math.random() * 3) + 1;
            
            for(let b = 0; b < bCount; b++) {
                const mat = (isCenter && Math.random() > 0.7) ? hubMat : buildingMat;
                const mesh = new THREE.Mesh(buildingGeo, mat);
                
                let bW = blockSize;
                let bD = blockSize;
                let px = worldX;
                let pz = worldZ;

                if (bCount > 1) {
                    bW = blockSize / 2 - 2;
                    bD = blockSize / 2 - 2;
                    px = worldX + (b % 2 === 0 ? -blockSize/4 : blockSize/4);
                    pz = worldZ + (b < 2 ? -blockSize/4 : blockSize/4);
                }

                const bH = height * (Math.random() * 0.5 + 0.5); // vary height within block
                
                mesh.scale.set(bW, bH, bD);
                mesh.position.set(px, bH / 2, pz);

                if (mat === buildingMat) {
                    const clonedMat = mat.clone();
                    clonedMat.emissiveMap = mat.emissiveMap.clone();
                    clonedMat.emissiveMap.repeat.set(bW / 15, bH / 15);
                    mesh.material = clonedMat;
                }

                cityGroup.add(mesh);
            }
        }
    }

    // Ground Plane
    const planeGeo = new THREE.PlaneGeometry(3000, 3000);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x050811, roughness: 0.1, metalness: 0.8 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    // ─── Animated Traffic (Cars) ────────────────────────────────────────────
    const carCount = 1500;
    const carGeo = new THREE.BufferGeometry();
    const carPos = new Float32Array(carCount * 3);
    const carColors = new Float32Array(carCount * 3);
    const carData = [];

    const colorHeadlight = new THREE.Color(0xffffff); // White/Yellow
    const colorTaillight = new THREE.Color(0xef4444); // Red

    for (let i = 0; i < carCount; i++) {
        const isAxisX = Math.random() > 0.5;
        const direction = Math.random() > 0.5 ? 1 : -1;
        
        let cx, cz;
        if (isAxisX) {
            cz = roadZ[Math.floor(Math.random() * roadZ.length)];
            cx = (Math.random() - 0.5) * gridSize * cellSize;
            cz += direction * 4; // Shift lane
        } else {
            cx = roadX[Math.floor(Math.random() * roadX.length)];
            cz = (Math.random() - 0.5) * gridSize * cellSize;
            cx += direction * 4;
        }

        carPos[i*3] = cx;
        carPos[i*3+1] = 2; // slightly above ground
        carPos[i*3+2] = cz;

        const isHeadlight = direction === 1; 
        const cColor = isHeadlight ? colorHeadlight : colorTaillight;
        carColors[i*3] = cColor.r;
        carColors[i*3+1] = cColor.g;
        carColors[i*3+2] = cColor.b;

        carData.push({
            isAxisX, direction,
            speed: Math.random() * 3 + 1.5, // faster base speed
            offset: isAxisX ? cz : cx
        });
    }

    carGeo.setAttribute('position', new THREE.BufferAttribute(carPos, 3));
    carGeo.setAttribute('color', new THREE.BufferAttribute(carColors, 3));
    
    const carMat = new THREE.PointsMaterial({
        size: 8, // Made cars larger so they are clearly visible
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1.0,
        depthWrite: false
    });
    const trafficSystem = new THREE.Points(carGeo, carMat);
    scene.add(trafficSystem);

    // ─── Localized Pollution (Street Smog) ──────────────────────────────────
    const smogCount = 4000;
    const smogGeo = new THREE.BufferGeometry();
    const smogPos = new Float32Array(smogCount * 3);
    const smogVels = [];

    for (let i = 0; i < smogCount; i++) {
        const isAxisX = Math.random() > 0.5;
        let px, pz;
        if (isAxisX) {
            pz = roadZ[Math.floor(Math.random() * roadZ.length)] + (Math.random()-0.5)*15;
            px = (Math.random() - 0.5) * gridSize * cellSize;
        } else {
            px = roadX[Math.floor(Math.random() * roadX.length)] + (Math.random()-0.5)*15;
            pz = (Math.random() - 0.5) * gridSize * cellSize;
        }

        smogPos[i*3] = px;
        smogPos[i*3+1] = Math.random() * 30; // Low to the ground
        smogPos[i*3+2] = pz;

        smogVels.push({
            vy: Math.random() * 0.3 + 0.1, 
            driftX: (Math.random() - 0.5) * 0.3,
            driftZ: (Math.random() - 0.5) * 0.3
        });
    }

    smogGeo.setAttribute('position', new THREE.BufferAttribute(smogPos, 3));
    const smogMat = new THREE.PointsMaterial({
        size: 10,
        color: simPollutionColor,
        transparent: true,
        opacity: simPollutionOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const smogSystem = new THREE.Points(smogGeo, smogMat);
    scene.add(smogSystem);

    // ─── Lights ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0f172a, 1.5));
    const dirLight = new THREE.DirectionalLight(0x0d8eef, 1.0);
    dirLight.position.set(200, 500, 300);
    scene.add(dirLight);

    // ─── Animation & Sync ───────────────────────────────────────────────────
    let isCinematic = true;
    let cinematicTime = 0;
    const targetCameraPos = new THREE.Vector3(300, 250, 400);
    const targetLookAt = new THREE.Vector3(0, 50, 0);

    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '20px';
    overlay.style.right = '20px';
    overlay.style.background = 'rgba(15, 23, 42, 0.85)';
    overlay.style.backdropFilter = 'blur(10px)';
    overlay.style.border = '1px solid var(--accent)';
    overlay.style.borderRadius = 'var(--radius-md)';
    overlay.style.padding = '15px 20px';
    overlay.style.color = 'white';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s ease';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '1000';
    overlay.style.minWidth = '200px';
    container.style.position = 'relative'; 
    container.appendChild(overlay);

    window.addEventListener('cityChanged', (e) => {
        const data = e.detail;
        
        // Target an intersection exactly on the road
        const rx = roadX[Math.floor(Math.random() * roadX.length)];
        const rz = roadZ[Math.floor(Math.random() * roadZ.length)];
        
        targetLookAt.set(rx, 5, rz);
        // Position camera directly down the street to see traffic clearly
        targetCameraPos.set(rx, 60, rz + 180); 
        isCinematic = false;

        let currentTraffic, currentAQI;
        if (data.metrics) {
            currentTraffic = Math.floor(data.metrics.traffic * (1 + (Math.random() * 0.1 - 0.05)));
            currentAQI = Math.floor(data.metrics.aqi * (1 + (Math.random() * 0.1 - 0.05)));
        } else {
            currentTraffic = Math.floor(Math.random()*20000+5000);
            currentAQI = Math.floor(Math.random()*150+20);
        }

        const tMult = currentTraffic / 12500.0;
        
        // Fetch Camera Feed Features for the HUD
        fetch(`/api/camera_feed?traffic_multiplier=${tMult}`)
            .then(r => r.json())
            .then(cam => {
                const f = cam.features;
                overlay.innerHTML = `
                    <h4 style="margin:0 0 5px 0; color: var(--accent); font-size: 1.1rem;">${data.city}</h4>
                    <p style="margin:0; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;"><i class="fas fa-video text-danger pulse-dot me-1"></i> Live Camera Feed</p>
                    
                    <div style="margin-top: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--gray-700); font-family: var(--font-mono); font-size: 0.85rem; line-height: 1.6;">
                        <div style="color:var(--primary); font-weight:bold; margin-bottom:5px;">VISION TELEMETRY</div>
                        <div style="display:flex; justify-content:space-between;"><span>Vehicles Detected:</span> <span>${f.vehicle_count}</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Avg Speed:</span> <span style="color:${f.avg_speed < 20 ? 'var(--danger)' : 'var(--warning)'};">${f.avg_speed} km/h</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Physical Density:</span> <span>${f.density.toFixed(2)}</span></div>
                    </div>

                    <div style="margin-top: 10px; font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.6;">
                        <div style="display:flex; justify-content:space-between;"><span>Traffic Score:</span> <span><span style="color:${f.traffic_score > 80 ? 'var(--danger)' : 'var(--warning)'};">${f.traffic_score}%</span></span></div>
                        <div style="display:flex; justify-content:space-between;"><span>Est. AQI:</span> <span><span style="color:${currentAQI > 100 ? 'var(--danger)' : 'var(--accent)'};">${currentAQI}</span></span></div>
                        <div style="display:flex; justify-content:space-between;"><span>World Model:</span> <span style="color:var(--primary); animation: pulse-dot 1.5s infinite;">Learning</span></div>
                    </div>
                `;
            }).catch(e => {
                // Fallback if camera feed API fails
                overlay.innerHTML = `
                    <h4 style="margin:0 0 5px 0; color: var(--accent); font-size: 1.1rem;">${data.city}</h4>
                    <p style="margin:0; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Intersection Locked</p>
                `;
            });
            
        overlay.style.opacity = '1';

        // Apply Data to Simulation Physics
        if (currentTraffic > 15000) {
            simTrafficSpeed = 0.15; // Traffic Jam
        } else if (currentTraffic > 10000) {
            simTrafficSpeed = 0.6; // Moderate
        } else {
            simTrafficSpeed = 1.8; // Fast
        }

        // High AQI = > 100. Toxic smog.
        if (currentAQI > 100) {
            smogMat.color.setHex(0xf59e0b); // Toxic Orange
            smogMat.opacity = 0.8;
            smogMat.size = 8;
        } else if (currentAQI > 50) {
            smogMat.color.setHex(0x94a3b8); // Grey smog
            smogMat.opacity = 0.5;
            smogMat.size = 5;
        } else {
            smogMat.color.setHex(0x38bdf8); // Clean Blue
            smogMat.opacity = 0.2;
            smogMat.size = 3;
        }
    });

    const boundary = (gridSize * cellSize) / 2;

    function animate() {
        requestAnimationFrame(animate);

        if (isCinematic) {
            cinematicTime += 0.0015;
            targetCameraPos.x = Math.sin(cinematicTime) * 600;
            targetCameraPos.z = Math.cos(cinematicTime) * 600;
            targetCameraPos.y = 350;
            targetLookAt.set(0, 50, 0);
        }
        
        camera.position.lerp(targetCameraPos, 0.02);
        controls.target.lerp(targetLookAt, 0.02);
        controls.update(); 

        // Animate Cars
        const cPos = trafficSystem.geometry.attributes.position.array;
        for(let i = 0; i < carCount; i++) {
            const data = carData[i];
            const moveDelta = data.speed * data.direction * simTrafficSpeed;

            if (data.isAxisX) {
                cPos[i*3] += moveDelta;
                // Wrap
                if (cPos[i*3] > boundary) cPos[i*3] = -boundary;
                if (cPos[i*3] < -boundary) cPos[i*3] = boundary;
            } else {
                cPos[i*3+2] += moveDelta;
                if (cPos[i*3+2] > boundary) cPos[i*3+2] = -boundary;
                if (cPos[i*3+2] < -boundary) cPos[i*3+2] = boundary;
            }
        }
        trafficSystem.geometry.attributes.position.needsUpdate = true;

        // Animate Smog
        const sPos = smogSystem.geometry.attributes.position.array;
        for(let i = 0; i < smogCount; i++) {
            sPos[i*3] += smogVels[i].driftX;
            sPos[i*3+1] += smogVels[i].vy;
            sPos[i*3+2] += smogVels[i].driftZ;
            
            // Reset smog to ground level if it rises too high
            if (sPos[i*3+1] > 100) {
                sPos[i*3+1] = 0;
            }
        }
        smogSystem.geometry.attributes.position.needsUpdate = true;

        composer.render();
    }
    animate();

    window.addEventListener('resize', () => {
        if(container.clientWidth > 0) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
            composer.setSize(container.clientWidth, container.clientHeight);
        }
    });
});
