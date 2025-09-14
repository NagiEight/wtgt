// themeManager.js

const THEME_KEY = 'anime-theme';

export const getCurrentTheme = () => {
    return localStorage.getItem(THEME_KEY) || 'light';
};

export const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
};

export const toggleTheme = () => {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    return next;
};
