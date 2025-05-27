document.addEventListener('DOMContentLoaded', () => {
  // Accordion functionality
  document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
      const answer = button.nextElementSibling;
      const isOpen = answer.style.display === 'block';

      // Close all other answers
      document.querySelectorAll('.faq-answer').forEach(item => {
        item.style.display = 'none';
        item.previousElementSibling.classList.remove('active');
      });

      // Toggle the clicked answer
      if (!isOpen) {
        answer.style.display = 'block';
        button.classList.add('active');
      }
    });
  });

  // Theme toggle functionality
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#000000' : '#f8f9fc';
    document.body.style.backgroundColor = theme === 'dark' ? '#000000' : '#f8f9fc';
    chrome.storage.local.set({ theme }, () => {
      console.log(`Theme saved to storage: ${theme}`);
    });
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    if (sunIcon && moonIcon) {
      sunIcon.classList.toggle('active', theme === 'light');
      moonIcon.classList.toggle('active', theme === 'dark');
    }
    console.log(`Theme applied: ${theme}`);
  }

  // Initialize theme
  setTheme('light');
  chrome.storage.local.get(['theme'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Theme storage error:', chrome.runtime.lastError.message);
      setTheme('light');
    } else {
      setTheme(result.theme || 'light');
    }
  });

  // Theme toggle event
  document.querySelector('.theme-toggle').addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  });
});