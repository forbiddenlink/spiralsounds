// Runs before first paint (loaded without defer) so a saved theme never flashes.
try {
  const saved = localStorage.getItem('ss:theme')
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved
} catch {
  // storage blocked: fall back to the system preference
}
