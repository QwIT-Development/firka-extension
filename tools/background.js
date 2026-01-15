chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const setupCompleted = await chrome.storage.sync.get('firka_setupCompleted');

    if (!setupCompleted.firka_setupCompleted) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('setup/setup.html')
      });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'storage_set':
          await handleStorageSet(request.key, request.value);
          sendResponse({ success: true });
          break;

        case 'storage_get':
          const value = await handleStorageGet(request.key, request.defaultValue);
          sendResponse({ success: true, value: value });
          break;

        case 'storage_remove':
          await handleStorageRemove(request.key);
          sendResponse({ success: true });
          break;

        case 'storage_clear':
          await handleStorageClear();
          sendResponse({ success: true });
          break;

        case 'download_attachment':
          const downloadResult = await handleDownloadAttachment(request.azonosito, request.fileName);
          sendResponse(downloadResult);
          break;

        default:
          console.warn('[Background] Unknown action:', request.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[Background] Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true;
});

async function handleStorageSet(key, value) {
  try {
    await chrome.storage.sync.set({ [key]: value });
  } catch (error) {
    console.error(`[Background] Failed to save ${key}:`, error);
    throw error;
  }
}

async function handleStorageGet(key, defaultValue = null) {
  try {
    const result = await chrome.storage.sync.get(key);
    const value = result[key];
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    console.error(`[Background] Failed to get ${key}:`, error);
    throw error;
  }
}

async function handleStorageRemove(key) {
  try {
    await chrome.storage.sync.remove(key);
  } catch (error) {
    console.error(`[Background] Failed to remove ${key}:`, error);
    throw error;
  }
}

async function handleStorageClear() {
  try {
    const allData = await chrome.storage.sync.get(null);
    const firkaKeys = Object.keys(allData).filter(key => key.startsWith('firka_'));

    if (firkaKeys.length > 0) {
      await chrome.storage.sync.remove(firkaKeys);
    }
  } catch (error) {
    console.error('[Background] Failed to clear storage:', error);
    throw error;
  }
}

async function handleDownloadAttachment(azonosito, fileName) {
  try {
    const apiUrl = `https://eugyintezes.e-kreta.hu/api/v1/dokumentumok/uzenetek/${azonosito}`;

    const redirectResponse = await fetch(apiUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'x-csrf': '1',
        'x-uzenet-json-formatum': 'CamelCase',
        'x-uzenet-lokalizacio': 'hu-HU',
        'x-uzenet-verzio-szam': '1.2.3'
      },
      redirect: 'manual'
    });

    let fileUrl;
    if (redirectResponse.type === 'opaqueredirect' || redirectResponse.status === 0) {
      const followResponse = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'x-csrf': '1',
          'x-uzenet-json-formatum': 'CamelCase',
          'x-uzenet-lokalizacio': 'hu-HU',
          'x-uzenet-verzio-szam': '1.2.3'
        },
        redirect: 'follow'
      });

      if (followResponse.ok) {
        const blob = await followResponse.blob();
        const base64 = await blobToBase64(blob);
        return { success: true, data: base64, fileName: fileName };
      }
    } else if (redirectResponse.status === 302 || redirectResponse.status === 301) {
      fileUrl = redirectResponse.headers.get('location');
    }

    if (fileUrl) {
      const fileResponse = await fetch(fileUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'x-csrf': '1',
          'x-uzenet-json-formatum': 'CamelCase',
          'x-uzenet-lokalizacio': 'hu-HU',
          'x-uzenet-verzio-szam': '1.2.3'
        }
      });

      if (fileResponse.ok) {
        const blob = await fileResponse.blob();
        const base64 = await blobToBase64(blob);
        return { success: true, data: base64, fileName: fileName };
      }
    }

    return { success: false, error: 'Nem sikerült letölteni a mellékletet.' };
  } catch (error) {
    console.error('[Background] Attachment download error:', error);
    return { success: false, error: error.message };
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    const firkaChanges = Object.keys(changes).filter(key => key.startsWith('firka_'));
    if (firkaChanges.length > 0) {
      notifyContentScriptsOfChanges(changes);
    }
  }
});

async function notifyContentScriptsOfChanges(changes) {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://*.e-kreta.hu/*' });
    
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'storage_changed',
          changes: changes
        });
      } catch (error) {
        console.debug(`[Background] Could not notify tab ${tab.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[Background] Failed to notify content scripts:', error);
  }
}