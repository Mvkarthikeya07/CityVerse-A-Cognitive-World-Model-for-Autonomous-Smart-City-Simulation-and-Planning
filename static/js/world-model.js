document.addEventListener('DOMContentLoaded', () => {
    // World model status fetch
    function fetchModelStatus() {
        fetch('/api/world-model/status')
            .then(r => r.json())
            .then(data => {
                const statusEl = document.getElementById('model-status');
                if (statusEl) {
                    statusEl.textContent = data.status === 'online' ? 'Online' : 'Offline';
                    statusEl.className = data.status === 'online' ? 'text-success' : 'text-danger';
                }
            })
            .catch(err => console.error('Error fetching model status', err));
    }

    // Animate latent state visualization
    function renderLatentState() {
        const container = document.getElementById('latent-display');
        if (!container) return;
        
        container.innerHTML = '';
        container.style.display = 'flex';
        container.style.gap = '2px';
        container.style.height = '100px';
        container.style.alignItems = 'flex-end';
        container.style.background = 'rgba(0,0,0,0.2)';
        container.style.padding = '10px';
        container.style.borderRadius = '8px';

        // create 64 bars
        for (let i = 0; i < 64; i++) {
            const bar = document.createElement('div');
            bar.style.width = '100%';
            bar.style.backgroundColor = '#0d8eef';
            bar.style.transition = 'height 0.5s ease';
            container.appendChild(bar);
        }

        // Randomly update heights
        setInterval(() => {
            Array.from(container.children).forEach(bar => {
                const height = Math.floor(Math.random() * 100);
                bar.style.height = `${height}%`;
                bar.style.opacity = (height / 100) * 0.8 + 0.2;
            });
        }, 1000);
    }

    fetchModelStatus();
    renderLatentState();
    
    const startBtn = document.getElementById('start-imagination-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            startBtn.textContent = 'Imagining...';
            startBtn.classList.add('pulse');
            setTimeout(() => {
                startBtn.textContent = 'Start Imagination';
                startBtn.classList.remove('pulse');
            }, 3000);
        });
    }
});
