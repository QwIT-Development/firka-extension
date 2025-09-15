const storageManager = {
  isExtensionContext() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  },

  isContentScript() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage;
  },

  async set(key, value) {
    const prefixedKey = `firka_${key}`;
    
    try {
      if (this.isExtensionContext()) {
        await chrome.storage.sync.set({ [prefixedKey]: value });
      } else if (this.isContentScript()) {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'storage_set',
            key: prefixedKey,
            value: value
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (response && response.success) {
              resolve();
            } else {
              reject(new Error('Failed to save via message passing'));
            }
          });
        });
      } else {
        localStorage.setItem(prefixedKey, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`[StorageManager] Primary storage failed for ${key}, falling back to cookie:`, error);
      if (typeof cookieManager !== 'undefined') {
        cookieManager.set(prefixedKey, JSON.stringify(value));
      }
    }
  },

  async get(key, defaultValue = null) {
    const prefixedKey = `firka_${key}`;
    
    try {
      if (this.isExtensionContext()) {
        const result = await chrome.storage.sync.get(prefixedKey);
        const value = result[prefixedKey];
        return value !== undefined ? value : defaultValue;
      } else if (this.isContentScript()) {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'storage_get',
            key: prefixedKey,
            defaultValue: defaultValue
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (response && response.hasOwnProperty('value')) {
              resolve(response.value);
            } else {
              reject(new Error('Failed to get via message passing'));
            }
          });
        });
      } else {
        const value = localStorage.getItem(prefixedKey);
        if (value !== null) {
          return JSON.parse(value);
        }
        return defaultValue;
      }
    } catch (error) {
      console.warn(`[StorageManager] Primary storage failed for ${key}, falling back to cookie:`, error);
      if (typeof cookieManager !== 'undefined') {
        const cookieValue = cookieManager.get(prefixedKey);
        if (cookieValue) {
          try {
            return JSON.parse(cookieValue);
          } catch (parseError) {
            return cookieValue;
          }
        }
      }
      return defaultValue;
    }
  },

  async remove(key) {
    const prefixedKey = `firka_${key}`;
    
    try {
      if (this.isExtensionContext()) {
        await chrome.storage.sync.remove(prefixedKey);
      } else if (this.isContentScript()) {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'storage_remove',
            key: prefixedKey
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (response && response.success) {
              resolve();
            } else {
              reject(new Error('Failed to remove via message passing'));
            }
          });
        });
      } else {
        localStorage.removeItem(prefixedKey);
      }
    } catch (error) {
      console.warn(`[StorageManager] Failed to remove ${key}:`, error);
    }
  },

  async clear() {
    try {
      if (this.isExtensionContext()) {
        const allData = await chrome.storage.sync.get(null);
        const firkaKeys = Object.keys(allData).filter(key => key.startsWith('firka_'));
        if (firkaKeys.length > 0) {
          await chrome.storage.sync.remove(firkaKeys);
        }
      } else if (this.isContentScript()) {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'storage_clear'
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (response && response.success) {
              resolve();
            } else {
              reject(new Error('Failed to clear via message passing'));
            }
          });
        });
      } else {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('firka_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('[StorageManager] Failed to clear storage:', error);
    }
  },

  async migrateFromCookies() {
    if (typeof cookieManager === 'undefined') {
      return;
    }

    const knownSettings = [
      'theme', 'language', 'notifications', 'autoRefresh', 
      'compactMode', 'showGrades', 'showAbsences'
    ];

    let migratedCount = 0;
    
    for (const setting of knownSettings) {
      try {
        const cookieValue = cookieManager.get(`firka_${setting}`);
        if (cookieValue !== null) {
          let value;
          try {
            value = JSON.parse(cookieValue);
          } catch {
            value = cookieValue;
          }
          
          await this.set(setting, value);
          migratedCount++;
        }
      } catch (error) {
        console.warn(`[StorageManager] Failed to migrate ${setting}:`, error);
      }
    }
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    storageManager.migrateFromCookies().catch(console.error);
  });
}