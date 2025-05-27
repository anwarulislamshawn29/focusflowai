const defaultProductiveSites = ['docs.google.com', 'wikipedia.org', 'linkedin.com'];
const defaultUnproductiveSites = ['facebook.com', 'youtube.com', 'reddit.com'];

function categorizeUrl(url, productiveSites, unproductiveSites) {
  if (!url || typeof url !== 'string') {
    console.log('Invalid or empty URL:', url);
    return 'neutral';
  }
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    console.log('Processing URL:', url, 'Hostname:', hostname);
    const isProductive = productiveSites.some(site => hostname === site || hostname.endsWith('.' + site));
    const isUnproductive = unproductiveSites.some(site => hostname === site || hostname.endsWith('.' + site));
    return isProductive ? 'productive' : isUnproductive ? 'unproductive' : 'neutral';
  } catch (e) {
    console.log('Error parsing URL:', url, e);
    return 'neutral';
  }
}

let lastUpdateTime = null;

function updateTimeSpent() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError || !tabs || tabs.length === 0 || !tabs[0].url) {
      console.log('No active tab or URL:', chrome.runtime.lastError?.message, tabs);
      return;
    }
    const tab = tabs[0];
    console.log('Active tab:', tab.id, 'URL:', tab.url);

    chrome.storage.local.get(['productiveSites', 'unproductiveSites'], (result) => {
      if (chrome.runtime.lastError) {
        console.log('Storage get error:', chrome.runtime.lastError.message);
        return;
      }
      const productiveSites = result.productiveSites || defaultProductiveSites;
      const unproductiveSites = result.unproductiveSites || defaultUnproductiveSites;
      const url = tab.url;
      const category = categorizeUrl(url, productiveSites, unproductiveSites);

      if (!lastUpdateTime) {
        lastUpdateTime = Date.now();
        console.log('Initialized lastUpdateTime:', lastUpdateTime);
        return;
      }

      const now = Date.now();
      const timeSpent = (now - lastUpdateTime) / 60000; // Convert to minutes
      lastUpdateTime = now;

      if (timeSpent <= 0) {
        console.log('No time to accumulate:', timeSpent);
        return;
      }

      const today = new Date().toISOString().split('T')[0]; // e.g., "2025-05-26"
      chrome.storage.local.get(['timeData'], (result) => {
        if (chrome.runtime.lastError) {
          console.log('Storage get error:', chrome.runtime.lastError.message);
          return;
        }
        let timeData = result.timeData || {};
        if (!timeData[today]) {
          timeData[today] = { productive: 0, unproductive: 0, neutral: 0 };
        }
        timeData[today][category] = (timeData[today][category] || 0) + timeSpent;
        chrome.storage.local.set({ timeData }, () => {
          if (chrome.runtime.lastError) {
            console.log('Storage set error:', chrome.runtime.lastError.message);
            return;
          }
          console.log(`Accumulated ${category}: ${timeSpent.toFixed(3)} minutes for ${url}`);
          console.log('Stored timeData:', JSON.stringify(timeData, null, 2));
        });
      });
    });
  });
}

// Initialize active tab on startup
function initializeActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      lastUpdateTime = Date.now();
      console.log('Initialized active tab:', tabs[0].id, 'URL:', tabs[0].url);
      updateTimeSpent();
    }
  });
}

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup, initializing active tab');
  initializeActiveTab();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, initializing...');
  chrome.storage.local.get(['timeData', 'productiveSites', 'unproductiveSites'], (result) => {
    console.log('Initial state:', {
      timeData: result.timeData || {},
      productiveSites: result.productiveSites || defaultProductiveSites,
      unproductiveSites: result.unproductiveSites || defaultUnproductiveSites
    });
    initializeActiveTab();
  });
});

// Track active tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  if (lastUpdateTime) {
    updateTimeSpent();
  }
  lastUpdateTime = Date.now();
});

// Track tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active && tab.windowId === chrome.windows.WINDOW_ID_CURRENT) {
    console.log('Tab updated:', tabId, 'New URL:', changeInfo.url);
    if (lastUpdateTime) {
      updateTimeSpent();
    }
    lastUpdateTime = Date.now();
  }
});

// Track tab closure
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('Tab closed:', tabId);
  if (lastUpdateTime) {
    updateTimeSpent();
  }
  lastUpdateTime = Date.now();
});

// Periodic update using alarms
chrome.alarms.create('trackTime', { periodInMinutes: 1 / 60 }); // Every second

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'trackTime') {
    console.log('Alarm triggered, updating time');
    updateTimeSpent();
  }
});