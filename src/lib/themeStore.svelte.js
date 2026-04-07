// Theme store using Svelte 5 runes
let isDark = $state(true);

export const themeStore = {
  get isDark() {
    return isDark;
  },
  
  toggle() {
    isDark = !isDark;
    this.updateDocument();
    this.savePreference();
  },
  
  setDark(value) {
    isDark = value;
    this.updateDocument();
    this.savePreference();
  },
  
  updateDocument() {
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },
  
  savePreference() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
  },
  
  loadPreference() {
    if (typeof localStorage !== 'undefined' && typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) {
        isDark = saved === 'dark';
      } else {
        // Check system preference
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      this.updateDocument();
    }
  }
};
