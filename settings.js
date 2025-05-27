document.addEventListener('DOMContentLoaded', () => {
  const productiveInput = document.getElementById('productive-input');
  const unproductiveInput = document.getElementById('unproductive-input');
  const productiveList = document.getElementById('productive-list');
  const unproductiveList = document.getElementById('unproductive-list');

  // Load existing sites or set defaults
  function loadSites() {
    chrome.storage.local.get(['productiveSites', 'unproductiveSites'], (result) => {
      productiveList.innerHTML = '';
      unproductiveList.innerHTML = '';
      let productiveSites = result.productiveSites;
      let unproductiveSites = result.unproductiveSites;

      // Set default sites if none exist
      if (!productiveSites || productiveSites.length === 0) {
        productiveSites = ['docs.google.com', 'wikipedia.org', 'coursera.org'];
        chrome.storage.local.set({ productiveSites });
      }
      if (!unproductiveSites || unproductiveSites.length === 0) {
        unproductiveSites = ['facebook.com', 'youtube.com', 'reddit.com'];
        chrome.storage.local.set({ unproductiveSites });
      }

      productiveSites.forEach(site => addSiteToList(productiveList, site, 'productive'));
      unproductiveSites.forEach(site => addSiteToList(unproductiveList, site, 'unproductive'));
    });
  }

  // Add site to list (UI)
  function addSiteToList(list, site, type) {
    const li = document.createElement('li');
    const siteText = document.createElement('span');
    siteText.textContent = site;
    const removeBtn = document.createElement('span');
    removeBtn.textContent = '✕';
    removeBtn.className = 'remove-site';
    removeBtn.addEventListener('click', () => {
      removeSite(site, type);
    });
    li.appendChild(siteText);
    li.appendChild(removeBtn);
    list.appendChild(li);
  }

  // Remove site
  function removeSite(site, type) {
    const key = type === 'productive' ? 'productiveSites' : 'unproductiveSites';
    chrome.storage.local.get([key], (result) => {
      const sites = result[key] || [];
      const updatedSites = sites.filter(s => s !== site);
      chrome.storage.local.set({ [key]: updatedSites }, () => {
        loadSites(); // Refresh UI
      });
    });
  }

  // Add productive site
  document.getElementById('add-productive').addEventListener('click', () => {
    const site = productiveInput.value.trim();
    if (!site) {
      alert('Please enter a valid website.');
      return;
    }
    chrome.storage.local.get(['productiveSites'], (result) => {
      const productiveSites = result.productiveSites || [];
      if (!productiveSites.includes(site)) {
        productiveSites.push(site);
        chrome.storage.local.set({ productiveSites }, () => {
          loadSites();
          productiveInput.value = '';
        });
      } else {
        alert('Site already added.');
      }
    });
  });

  // Add unproductive site
  document.getElementById('add-unproductive').addEventListener('click', () => {
    const site = unproductiveInput.value.trim();
    if (!site) {
      alert('Please enter a valid website.');
      return;
    }
    chrome.storage.local.get(['unproductiveSites'], (result) => {
      const unproductiveSites = result.unproductiveSites || [];
      if (!unproductiveSites.includes(site)) {
        unproductiveSites.push(site);
        chrome.storage.local.set({ unproductiveSites }, () => {
          loadSites();
          unproductiveInput.value = '';
        });
      } else {
        alert('Site already added.');
      }
    });
  });

  // Reset data
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all productivity data? This cannot be undone.')) {
      chrome.storage.local.remove('timeData', () => {
        if (chrome.runtime.lastError) {
          console.log('Reset error:', chrome.runtime.lastError.message);
          alert('Error resetting data.');
        } else {
          alert('All productivity data has been reset.');
        }
      });
    }
  });

  // Initial load
  loadSites();
});