/* ============================================================
   CityMind-AI — WebSocket Manager
   Auto-reconnect, message routing, connection status UI
   ============================================================ */

class WebSocketManager {
    constructor(url) {
        this.url = url || this._buildUrl();
        this.ws = null;
        this.handlers = {};
        this.reconnectAttempts = 0;
        this.maxReconnectDelay = 30000;
        this.baseDelay = 1000;
        this.isConnected = false;
        this.reconnectTimer = null;
        this.messageQueue = [];
        this.debug = false;
    }

    _buildUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws`;
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        this.updateStatusUI('connecting');

        try {
            this.ws = new WebSocket(this.url);
        } catch (e) {
            this._log('WebSocket creation failed:', e);
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            this._log('Connected to', this.url);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateStatusUI('connected');

            // Flush queued messages
            while (this.messageQueue.length > 0) {
                const msg = this.messageQueue.shift();
                this.send(msg.type, msg.data);
            }

            // Notify subscribers
            this._dispatch('connection', { status: 'connected' });
        };

        this.ws.onclose = (event) => {
            this._log('Disconnected. Code:', event.code, 'Reason:', event.reason);
            this.isConnected = false;
            this.updateStatusUI('disconnected');
            this._dispatch('connection', { status: 'disconnected', code: event.code });
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            this._log('WebSocket error:', error);
            this.updateStatusUI('error');
            if (this.ws) {
                this.ws.close();
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this._log('Received:', message.type || 'unknown', message);

                if (message.type) {
                    this._dispatch(message.type, message.data || message);
                }

                // Always dispatch to wildcard subscribers
                this._dispatch('*', message);
            } catch (e) {
                this._log('Failed to parse message:', event.data, e);
            }
        };
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.onclose = null; // Prevent reconnect
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.updateStatusUI('disconnected');
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;

        const delay = Math.min(
            this.baseDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );

        this._log(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts + 1})`);
        this.updateStatusUI('reconnecting');

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    send(type, data) {
        const message = JSON.stringify({ type, data, timestamp: Date.now() });

        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
            this._log('Sent:', type, data);
        } else {
            // Queue message for when connection is restored
            this.messageQueue.push({ type, data });
            this._log('Queued message (not connected):', type);
        }
    }

    subscribe(eventType, callback) {
        if (!this.handlers[eventType]) {
            this.handlers[eventType] = [];
        }
        this.handlers[eventType].push(callback);

        // Return unsubscribe function
        return () => {
            this.handlers[eventType] = this.handlers[eventType].filter(cb => cb !== callback);
        };
    }

    unsubscribe(eventType, callback) {
        if (this.handlers[eventType]) {
            this.handlers[eventType] = this.handlers[eventType].filter(cb => cb !== callback);
        }
    }

    _dispatch(eventType, data) {
        const handlers = this.handlers[eventType] || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (e) {
                console.error(`Error in handler for "${eventType}":`, e);
            }
        });
    }

    updateStatusUI(status) {
        const statusEl = document.getElementById('ws-status');
        if (!statusEl) return;

        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');

        if (!dot || !text) return;

        // Remove all existing status classes
        dot.classList.remove('status-dot--online', 'status-dot--offline', 'status-dot--connecting');

        switch (status) {
            case 'connected':
                dot.classList.add('status-dot--online');
                text.textContent = 'Connected';
                text.style.color = 'var(--accent-400)';
                break;
            case 'disconnected':
            case 'error':
                dot.classList.add('status-dot--offline');
                text.textContent = 'Disconnected';
                text.style.color = 'var(--danger-400)';
                break;
            case 'connecting':
            case 'reconnecting':
                dot.classList.add('status-dot--connecting');
                text.textContent = 'Connecting...';
                text.style.color = 'var(--warning-400)';
                break;
        }

        // Also update system status dot in sidebar
        const systemDot = document.getElementById('system-status');
        if (systemDot) {
            systemDot.classList.remove('status-dot--online', 'status-dot--offline', 'status-dot--connecting');
            if (status === 'connected') {
                systemDot.classList.add('status-dot--online');
            } else if (status === 'connecting' || status === 'reconnecting') {
                systemDot.classList.add('status-dot--connecting');
            } else {
                systemDot.classList.add('status-dot--offline');
            }
        }
    }

    _log(...args) {
        if (this.debug) {
            console.log('[WS]', ...args);
        }
    }
}

// --- Global Instance ---
window.wsManager = new WebSocketManager();

// Auto-connect when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to let UI render first
    setTimeout(() => {
        window.wsManager.connect();
    }, 500);
});

// --- Toast notification helper ---
window.showToast = function(message, type = 'info', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '✅',
        warning: '⚠️',
        danger: '❌',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <span class="toast__icon">${icons[type] || icons.info}</span>
        <span class="toast__message">${message}</span>
        <button class="toast__close" onclick="this.parentElement.classList.add('toast--out'); setTimeout(() => this.parentElement.remove(), 300);">✕</button>
    `;

    container.appendChild(toast);

    // Auto dismiss
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('toast--out');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
};

// --- Sidebar toggle ---
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar--open');
            if (overlay) overlay.classList.toggle('sidebar-overlay--visible');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('sidebar--open');
            overlay.classList.remove('sidebar-overlay--visible');
        });
    }
});

// --- Intersection Observer for scroll animations ---
document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
});
