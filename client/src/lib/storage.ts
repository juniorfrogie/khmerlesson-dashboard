// Client-side storage utilities for auto-save and temporary data

export class LocalStorageManager {
  private prefix = "khmer-admin-";

  save(key: string, data: any): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save to localStorage:", error);
    }
  }

  load(key: string): any {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn("Failed to load from localStorage:", error);
      return null;
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn("Failed to remove from localStorage:", error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
  }
}

export const storage = new LocalStorageManager();

// Auto-save functionality
export class AutoSaveManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private storage = new LocalStorageManager();

  scheduleAutoSave(key: string, data: any, delay = 30000): void {
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new auto-save
    const timer = setTimeout(() => {
      this.storage.save(`autosave-${key}`, {
        data,
        timestamp: new Date().toISOString(),
      });
      this.timers.delete(key);
    }, delay);

    this.timers.set(key, timer);
  }

  getAutoSave(key: string): { data: any; timestamp: string } | null {
    return this.storage.load(`autosave-${key}`);
  }

  clearAutoSave(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    this.storage.remove(`autosave-${key}`);
  }

  cleanup(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

export const autoSave = new AutoSaveManager();
