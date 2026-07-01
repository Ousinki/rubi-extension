(function() {
  const saved = localStorage.getItem('rubi-theme');
  const theme = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.classList.add('theme-' + theme);
})();
