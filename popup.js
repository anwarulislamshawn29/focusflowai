document.addEventListener('DOMContentLoaded', () => {
  let chart;
  let selectedPeriod = 'today';
  let updateInterval;

  function initializeChart() {
    if (typeof Chart === 'undefined') {
      console.error('Chart.js not loaded. Chart functionality unavailable.');
      return;
    }
    const canvas = document.getElementById('productivityChart');
    const ctx = canvas.getContext('2d');
    const isDarkTheme = document.documentElement.dataset.theme === 'dark';

    // Set canvas background
    ctx.fillStyle = isDarkTheme ? '#000000' : '#f8f9fc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Productive', 'Unproductive', 'Neutral'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#4CAF50', '#F44336', '#FFC107'],
          borderWidth: 1,
          borderColor: isDarkTheme ? '#1C1C1C' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 12 },
              color: isDarkTheme ? '#E2E8F0' : '#2c3e50'
            }
          },
          tooltip: { enabled: true }
        }
      }
    });
    console.log('Chart initialized with theme:', isDarkTheme ? 'dark' : 'light');
  }

  function getDateString(date) {
    // Adjust for local timezone by using Date methods instead of toISOString()
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function aggregateTimeData(timeData, period) {
    const now = new Date();
    const todayStr = getDateString(now);
    const aggregated = { productive: 0, unproductive: 0, neutral: 0 };

    if (period === 'today') {
      const data = timeData[todayStr] || {};
      return { productive: data.productive || 0, unproductive: data.unproductive || 0, neutral: data.neutral || 0 };
    } else if (period === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = getDateString(yesterday);
      const data = timeData[yesterdayStr] || {};
      return { productive: data.productive || 0, unproductive: data.unproductive || 0, neutral: data.neutral || 0 };
    } else if (period === 'allTime') {
      for (const dateStr in timeData) {
        const data = timeData[dateStr] || {};
        aggregated.productive += data.productive || 0;
        aggregated.unproductive += data.unproductive || 0;
        aggregated.neutral += data.neutral || 0;
      }
    }
    return aggregated;
  }

  function getRandomTip(tips) {
    return tips[Math.floor(Math.random() * tips.length)];
  }

  function updatePopup() {
    chrome.storage.local.get(['timeData'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Popup storage error:', chrome.runtime.lastError.message);
        document.getElementById('score').textContent = 'Error';
        document.getElementById('productive-time').textContent = 'N/A';
        document.getElementById('unproductive-time').textContent = 'N/A';
        document.getElementById('neutral-time').textContent = 'N/A';
        document.getElementById('suggestions').innerHTML = '<li>Error loading data. Please try again.</li>';
        return;
      }
      const timeData = result.timeData || {};
      const aggregated = aggregateTimeData(timeData, selectedPeriod);

      console.log(`Updating popup for ${selectedPeriod}:`, JSON.stringify(aggregated, null, 2));

      // Calculate productivity score
      const totalTime = aggregated.productive + aggregated.unproductive + aggregated.neutral;
      const productivityScore = totalTime > 0 ? Math.round((aggregated.productive / totalTime) * 100) : 0;
      const scoreElement = document.getElementById('score');
      scoreElement.textContent = productivityScore + '%';

      // Apply conditional score styling
      scoreElement.classList.remove('score-low', 'score-warning');
      if (productivityScore < 10) {
        scoreElement.classList.add('score-low');
      } else if (productivityScore < 20) {
        scoreElement.classList.add('score-warning');
      }

      // Update stats
      document.getElementById('productive-time').textContent = aggregated.productive.toFixed(1);
      document.getElementById('unproductive-time').textContent = aggregated.unproductive.toFixed(1);
      document.getElementById('neutral-time').textContent = aggregated.neutral.toFixed(1);

      // Update chart
      if (chart) {
        chart.data.datasets[0].data = [
          aggregated.productive || 0,
          aggregated.unproductive || 0,
          aggregated.neutral || 0
        ];
        chart.update('none');
        console.log('Chart updated with data:', chart.data.datasets[0].data);
      }

      // Productivity tips based on score
      const suggestionsElement = document.querySelector('.tips-section');
      suggestionsElement.classList.remove('alarming');
      let tips = [];

      if (productivityScore === 0 && totalTime === 0) {
        tips = [
          'Add productive websites in Settings.',
          'Set goals to focus your browsing.',
          'Use Pomodoro for focused intervals.',
          'Categorize websites to track habits.'
        ];
      } else if (productivityScore < 10) {
        suggestionsElement.classList.add('alarming');
        tips = [
          'Block unproductive websites now.',
          'Take a 5-min deep breathing break.',
          'Prioritize tasks with a to-do list.',
          'Disable social media notifications.'
        ];
      } else if (productivityScore < 50) {
        tips = [
          'Use Pomodoro: 25 min work, 5 min break.',
          'Limit unproductive sites.',
          'Break tasks into smaller steps.',
          'Schedule email/social media checks.'
        ];
      } else if (productivityScore < 80) {
        tips = [
          'Optimize your workspace.',
          'Review productive websites.',
          'Take short breaks for energy.',
          'Try time-blocking your schedule.'
        ];
      } else {
        tips = [
          'Maintain habits for productivity.',
          'Set a new productivity goal.',
          'Share tips with colleagues.',
          'Reward yourself for focus.'
        ];
      }

      const list = document.getElementById('suggestions');
      list.innerHTML = '';
      const tip = getRandomTip(tips);
      const li = document.createElement('li');
      li.textContent = tip;
      list.appendChild(li);
    });

    // Schedule the next update if the popup is visible
    if (!document.hidden) {
      updateInterval = setTimeout(updatePopup, 2000);
    }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#000000' : '#f8f9fc';
    document.body.style.backgroundColor = theme === 'dark' ? '#000000' : '#f8f9fc';
    chrome.storage.local.set({ theme }, () => {
      console.log(`Theme saved to storage: ${theme}`);
    });
    if (chart) {
      const canvas = document.getElementById('productivityChart');
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = theme === 'dark' ? '#000000' : '#f8f9fc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      chart.data.datasets[0].borderColor = theme === 'dark' ? '#1C1C1C' : '#ffffff';
      chart.options.plugins.legend.labels.color = theme === 'dark' ? '#E2E8F0' : '#2c3e50';
      chart.update('none');
      console.log(`Chart theme updated to: ${theme}`);
    }
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    if (sunIcon && moonIcon) {
      sunIcon.classList.toggle('active', theme === 'light');
      moonIcon.classList.toggle('active', theme === 'dark');
    }
    console.log(`Theme applied: ${theme}`);
  }

  // Initialize
  setTheme('light');
  chrome.storage.local.get(['theme'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Theme storage error:', chrome.runtime.lastError.message);
      setTheme('light');
    } else {
      setTheme(result.theme || 'light');
    }
  });

  // Restore tips toggle state
  const tipsToggle = document.getElementById('tips-toggle');
  const tipsSection = document.getElementById('tips-section');
  chrome.storage.local.get(['tipsVisible'], (result) => {
    const isVisible = result.tipsVisible || false;
    tipsSection.style.display = isVisible ? 'block' : 'none';
    tipsToggle.textContent = isVisible ? 'Hide Tips' : 'Show Tips';
    tipsToggle.classList.toggle('active', isVisible);
  });

  initializeChart();
  updatePopup();

  // Period selector
  document.querySelectorAll('input[name="period"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedPeriod = e.target.value;
      console.log('Time period changed to:', selectedPeriod);
      updatePopup();
    });
  });

  // Theme toggle
  document.querySelector('.theme-toggle').addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  });

  // Tips toggle
  tipsToggle.addEventListener('click', () => {
    const isHidden = tipsSection.style.display === 'none';
    tipsSection.style.display = isHidden ? 'block' : 'none';
    tipsToggle.textContent = isHidden ? 'Hide Tips' : 'Show Tips';
    tipsToggle.classList.toggle('active', isHidden);
    chrome.storage.local.set({ tipsVisible: !isHidden }, () => {
      console.log(`Tips visibility saved: ${!isHidden}`);
    });
  });

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  });

  // Footer buttons
//   document.getElementById('privacy-btn').addEventListener('click', () => {
//     chrome.tabs.create({ url: 'https://focusflow.ai/privacy' });
//   });
//   document.getElementById('support-btn').addEventListener('click', () => {
//     chrome.tabs.create({ url: 'https://focusflow.ai/support' });
//   });

  // Pause updates when popup is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(updateInterval);
      console.log('Popup hidden, pausing updates.');
    } else {
      console.log('Popup visible, resuming updates.');
      updatePopup();
    }
  });
});