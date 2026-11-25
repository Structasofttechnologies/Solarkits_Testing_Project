export const resolveApiUrl = (url, fallback = '') => {
    const targetUrl = url || fallback;
    if (!targetUrl) return '';
    
    const hostname = window.location.hostname;
    // If we are in production/live env (not localhost/local IP)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '192.168.1.8') {
        if (targetUrl.startsWith('http://localhost') || targetUrl.startsWith('http://127.0.0.1')) {
            try {
                const urlObj = new URL(targetUrl);
                return `${window.location.origin}${urlObj.pathname}`;
            } catch (e) {
                return targetUrl;
            }
        }
    }
    return targetUrl;
};

export const getAuthPortalUrl = () => {
    return '/login';
};
