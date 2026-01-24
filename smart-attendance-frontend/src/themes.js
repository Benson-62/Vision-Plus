export const THEMES = [
  {
    id: "dark-purple",
    name: "Midnight Purple",
    vars: {
      "--bg": "#0b1220",
      "--card": "#0f172a",
      "--text": "#e5e7eb",
      "--muted": "#9ca3af",
      "--accent": "#7c3aed",
      "--accent-soft": "rgba(124,58,237,0.15)"
    }
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    vars: {
      "--bg": "#0b1220",
      "--card": "#0f172a",
      "--text": "#e5e7eb",
      "--muted": "#9ca3af",
      "--accent": "#2563eb",
      "--accent-soft": "rgba(37,99,235,0.15)"
    }
  },
  {
    id: "clean-white",
    name: "Clean White",
    vars: {
      "--bg": "#f8fafc",
      "--card": "#ffffff",
      "--text": "#0f172a",
      "--muted": "#6b7280",
      "--accent": "#2563eb",
      "--accent-soft": "rgba(37,99,235,0.12)"
    }
  }
];
// src/themes.js

export const THEME = [
  {
    id: "dark-blue",
    label: "Dark Blue",
    primary: "#4f8cff",
    bg: "#0b1220",
    card: "#0f172a",
    border: "#1e293b",
    text: "#e5e7eb"
  },
  {
    id: "purple",
    label: "Purple",
    primary: "#8b5cf6",
    bg: "#0f0a1f",
    card: "#1a1236",
    border: "#2e1a5e",
    text: "#e9d5ff"
  },
  {
    id: "emerald",
    label: "Emerald",
    primary: "#22c55e",
    bg: "#071a12",
    card: "#0b2a1d",
    border: "#134e34",
    text: "#d1fae5"
  },
  {
    id: "sunset",
    label: "Sunset",
    primary: "#fb923c",
    bg: "#1a0f07",
    card: "#2a160a",
    border: "#7c2d12",
    text: "#ffedd5"
  },
  {
    id: "light",
    label: "Light",
    primary: "#2563eb",
    bg: "#ffffff",
    card: "#f8fafc",
    border: "#e5e7eb",
    text: "#0f172a"
  }
];

export function applyTheme(theme) {
  const root = document.documentElement;

  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--card", theme.card);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--text", theme.text);
}
