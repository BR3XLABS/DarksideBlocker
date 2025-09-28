let includesRules = [];
let exactMatchRules = [];

async function loadBlocklist() {
  const res = await fetch(chrome.runtime.getURL("blocklist.txt"));
  const text = await res.text();

  includesRules = [];
  exactMatchRules = [];

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean); // Remove empty lines

  for (const line of lines) {
    if (line.startsWith('includes="') && line.endsWith('"')) {
      const substring = line.slice(9, -1); // extract what's inside includes=""
      includesRules.push(substring);
    } else {
      exactMatchRules.push(line); // treat as full URL
    }
  }

  console.log(`Loaded ${includesRules.length} includes and ${exactMatchRules.length} exact match rules`);
}

function isBlocked(url) {
  // Exact URL match
  if (exactMatchRules.includes(url)) {
    return true;
  }

  // Substring match
  return includesRules.some(substring => url.includes(substring));
}

chrome.runtime.onInstalled.addListener(loadBlocklist);
chrome.runtime.onStartup.addListener(loadBlocklist);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && isBlocked(tab.url)) {
    const redirectUrl = chrome.runtime.getURL("blocked.html");

    if (!tab.url.startsWith(redirectUrl)) {
      chrome.tabs.update(tabId, {
        url: redirectUrl + `?blocked=${encodeURIComponent(tab.url)}`
      });
    }
  }
});
