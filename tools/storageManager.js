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
      console.warn(`[StorageManager] Storage failed for ${key}:`, error);
      throw error;
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
      console.warn(`[StorageManager] Storage failed for ${key}:`, error);
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

};