const isLocalHostname = (hostname = '') => {
    const host = String(hostname).toLowerCase();
    return (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '[::1]' ||
        host.endsWith('.localhost') ||
        host.startsWith('192.168.') ||
        host.startsWith('10.')
    );
};

const getLiveBackendOrigin = () => {
    const envBackend = String(import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/+$/, '');
    if (envBackend && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(envBackend)) {
        return envBackend;
    }

    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname.toLowerCase();
        const appEnv = String(import.meta.env.VITE_APP_ENV || '').toLowerCase();

        if (appEnv === 'production' || (hostname.includes('solarkits.in') && !hostname.includes('test') && !hostname.includes('staging'))) {
            return 'https://api.solarkits.in';
        }
        if (appEnv === 'staging' || hostname.includes('onrender.com') || hostname.includes('staging') || hostname.includes('test')) {
            return 'https://backend-evwd.onrender.com';
        }
        return window.location.origin;
    }

    return '';
};

export const resolveApiUrl = (url, fallback = '') => {
    const targetUrl = String(url || fallback || '').trim().replace(/\/+$/, '');
    if (!targetUrl) return '';

    if (typeof window !== 'undefined' && !isLocalHostname(window.location.hostname)) {
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(targetUrl)) {
            try {
                const urlObj = new URL(targetUrl);
                const liveOrigin = getLiveBackendOrigin();
                const cleanPath = urlObj.pathname.replace(/\/+$/, '');
                return `${liveOrigin}${cleanPath}`;
            } catch (e) {
                return targetUrl;
            }
        }
    }
    return targetUrl;
};

export const getAdminApiBaseUrl = () => {
    const envBackend = String(import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/+$/, '');
    const backendAdminApi = envBackend ? `${envBackend}/admin-api` : '';
    return resolveApiUrl(
        import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || backendAdminApi,
        'http://localhost:5000/admin-api'
    );
};

export const getAuthApiBaseUrl = () => {
    const envBackend = String(import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/+$/, '');
    const backendAuthApi = envBackend ? `${envBackend}/auth-api` : '';
    return resolveApiUrl(
        import.meta.env.VITE_AUTH_API_URL || backendAuthApi,
        'http://localhost:5000/auth-api'
    );
};

export const getAuthPortalUrl = () => {
    return '/login';
};
