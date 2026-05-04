export class ThemeManager {
  constructor({ storageKey, themes }) {
    this.storageKey = storageKey;
    this.themes = themes;
    this.active = themes[0];
  }

  init() {
    const stored = window.localStorage.getItem(this.storageKey);
    if (stored && this.themes.includes(stored)) this.active = stored;
    this.apply();
  }

  apply() {
    document.documentElement.dataset.theme = this.active;
    window.localStorage.setItem(this.storageKey, this.active);
    document.dispatchEvent(new CustomEvent("chronos:theme", { detail: { theme: this.active } }));
  }

  set(theme) {
    if (!this.themes.includes(theme)) return;
    this.active = theme;
    this.apply();
  }

  cycle() {
    const index = this.themes.indexOf(this.active);
    const next = this.themes[(index + 1) % this.themes.length];
    this.set(next);
  }
}

