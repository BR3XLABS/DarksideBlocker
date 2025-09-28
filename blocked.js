// blocked.js
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const b64 = params.get('blocked');

  if (!b64) {
    document.getElementById('url').textContent = 'Blocked URL not provided.';
    return;
  }

  try {
    const decoded = atob(b64);
    // Use innerHTML instead of textContent
    document.getElementById('url').innerHTML = `Blocked: ${decoded}`;
  } catch (e) {
    document.getElementById('url').textContent = 'Blocked: Unknown URL';
  }
});
