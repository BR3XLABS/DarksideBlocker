let includesRules = [];
let exactMatchRules = [];

// Helper to extract quoted value safely from blocklist line
function extractQuotedValue(line, prefix) {
  if (!line.toLowerCase().startsWith(prefix)) return "";

  const rest = line.slice(prefix.length);
  if (rest.endsWith('"')) {
    return rest.slice(0, -1).trim();
  }
  return rest.trim();
}

// Load blocklist.txt and parse rules
async function loadBlocklist() {
  const res = await fetch(chrome.runtime.getURL("https://raw.githubusercontent.com/BR3XLABS/DarksideBlocker/refs/heads/main/blocklist.txt"));
  const text = await res.text();

  includesRules = [];
  exactMatchRules = [];

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.toLowerCase().startsWith('includes="')) {
      const val = extractQuotedValue(line, 'includes="');
      includesRules.push(val.toLowerCase());
    } else {
      exactMatchRules.push(line.toLowerCase());
    }
  }

  console.log("Blocklist loaded:", { includesRules, exactMatchRules });
}

// Check if URL is blocked by exact match or includes rules
function isBlockedUrl(url) {
  const lowerUrl = url.toLowerCase();

  if (exactMatchRules.includes(lowerUrl)) {
    console.log(`Blocked exact match: ${url}`);
    return true;
  }

  for (const sub of includesRules) {
    if (lowerUrl.includes(sub)) {
      console.log(`Blocked includes rule: "${sub}" found in "${url}"`);
      return true;
    }
  }

  return false;
}

// Redirect tab to blocked.html with base64 encoded original URL
function redirectToBlocked(tabId, url) {
  const redirectUrl = chrome.runtime.getURL("blocked.html");
  if (!url.startsWith(redirectUrl)) {
    const base64 = btoa(url);
    chrome.tabs.update(tabId, { url: `${redirectUrl}?blocked=${base64}` });
  }
}

// Listen for tab updates to block URLs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    if (isBlockedUrl(tab.url)) {
      redirectToBlocked(tabId, tab.url);
    }
  }
});

// Load blocklist on install and startup
chrome.runtime.onInstalled.addListener(loadBlocklist);
chrome.runtime.onStartup.addListener(loadBlocklist);

// Also load immediately on background start
loadBlocklist();

