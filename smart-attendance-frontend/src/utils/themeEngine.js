export const THEMES = [
    {
        id: "beige-brown",
        label: "Beige & Brown",
        primary: "#8b4513",
        light: { bg: "#fdf5e6", card: "#faebd7", text: "#4a2e15", muted: "#8b7355", border: "#deb887" },
        dark: { bg: "#0b1220", card: "#111827", text: "#f8fafc", muted: "#94a3b8", border: "rgba(255,255,255,0.1)" }
    },
    {
        id: "midnight-blue",
        label: "Midnight Blue",
        primary: "#3b82f6",
        light: { bg: "#eff6ff", card: "#ffffff", text: "#0f172a", muted: "#64748b", border: "#cbd5e1" },
        dark: { bg: "#0b1220", card: "#111827", text: "#f8fafc", muted: "#94a3b8", border: "rgba(255,255,255,0.1)" }
    },
    {
        id: "emerald-green",
        label: "Emerald Green",
        primary: "#10b981",
        light: { bg: "#ecfdf5", card: "#ffffff", text: "#064e3b", muted: "#059669", border: "#a7f3d0" },
        dark: { bg: "#0b1220", card: "#111827", text: "#f8fafc", muted: "#94a3b8", border: "rgba(255,255,255,0.1)" }
    },
    {
        id: "royal-purple",
        label: "Royal Purple",
        primary: "#8b5cf6",
        light: { bg: "#f5f3ff", card: "#ffffff", text: "#2e1065", muted: "#7c3aed", border: "#ddd6fe" },
        dark: { bg: "#0b1220", card: "#111827", text: "#f8fafc", muted: "#94a3b8", border: "rgba(255,255,255,0.1)" }
    }
];

export function applyTheme(themeId, isDark) {
    const selected = THEMES.find(t => t.id === themeId) || THEMES[0];
    const modeVars = isDark ? selected.dark : selected.light;

    document.documentElement.setAttribute("data-theme", isDark ? "dark" : themeId);
    document.documentElement.style.setProperty("--primary", selected.primary);

    document.documentElement.style.setProperty("--bg", modeVars.bg);
    document.documentElement.style.setProperty("--bg-card", modeVars.card);
    document.documentElement.style.setProperty("--card", modeVars.card);
    document.documentElement.style.setProperty("--text", modeVars.text);
    document.documentElement.style.setProperty("--muted", modeVars.muted);
    document.documentElement.style.setProperty("--border", modeVars.border);
}

export function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    const actualTheme = (savedTheme === null || savedTheme === "undefined") ? "beige-brown" : savedTheme;
    const savedDark = localStorage.getItem("darkMode");
    const isDark = savedDark !== null ? savedDark === "true" : false;

    applyTheme(actualTheme, isDark);
}
