export const ms_conversion = (time) => {
    if (!time || typeof time !== 'string') return 15 * 60 * 1000;
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1));
    const units = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000,
        'M': 30 * 24 * 60 * 60 * 1000,
        'y': 365 * 24 * 60 * 60 * 1000,
    }
    return units[unit] ? value * units[unit] : 15 * 60 * 1000;
}