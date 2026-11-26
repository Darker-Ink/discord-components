/* global document, localStorage */
// Paints the visitor's theme before the app loads (src/theme.ts uses the same key and default).
try {
  const stored = localStorage.getItem('discord-mana:theme');
  const classes = { light: 'light', ash: 'dark', dark: 'darker', onyx: 'midnight' };
  document.documentElement.className = `theme-${Object.hasOwn(classes, stored) ? classes[stored] : 'darker'}`;
} catch {
  document.documentElement.className = 'theme-darker';
}
