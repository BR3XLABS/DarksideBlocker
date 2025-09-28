let includesRules = [];
let exactMatchRules = [];
let blocklistSources = [];

// Helper to extract quoted value safely from blocklist line
function extractQuotedValue(line, prefix) {
  if (!line.toLowerCase().startsWith(prefix)) return "";

  const rest = line.slice(prefix.length);
  if (rest.endsWith('"')) {
    return rest.slice(0, -1).trim();
  }
  return rest.trim();
}

// Helper to fetch and parse blocklist from a given URL
async function fetchAndParseBlocklist(url, seenSources = new Set()) {
  // Avoid infinite loops on circular src=
  if (seenSources.has(url)) return { includes: [], exact: [], sources: [] };
  seenSources.add(url);

  let includes = [];
  let exact = [];
  let sources = [];

  try {
    const res = await fetch(url);
    const text = await res.text();

    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      if (line.toLowerCase().startsWith('includes="')) {
        const val = extractQuotedValue(line, 'includes="');
        includes.push(val.toLowerCase());
      } else if (line.toLowerCase().startsWith('src="')) {
        const srcUrl = extractQuotedValue(line, 'src="');
        if (srcUrl) {
          sources.push(srcUrl);
        }
      } else {
        exact.push(line.toLowerCase());
      }
    }
  } catch (e) {
    console.error("Failed to fetch or parse blocklist from:", url, e);
  }

  // Recursively fetch src= lists
  for (const srcUrl of sources) {
    const result = await fetchAndParseBlocklist(srcUrl, seenSources);
    includes = includes.concat(result.includes);
    exact = exact.concat(result.exact);
    // sources from sublists are already processed
  }

  return { includes, exact, sources: [] };
}

// Load blocklist.txt and parse rules, supporting includes= and src=
async function loadBlocklist() {
  const mainUrl = "https://raw.githubusercontent.com/BR3XLABS/DarksideBlocker/refs/heads/main/blocklist.txt";
  includesRules = [];
  exactMatchRules = [];
  blocklistSources = [];

  // Gather all rules from main and external sources
  const seenSources = new Set();
  const { includes, exact, sources } = await fetchAndParseBlocklist(mainUrl, seenSources);

  includesRules = includes;
  exactMatchRules = exact;
  blocklistSources = Array.from(seenSources);

  console.log("Blocklist loaded:", {
    includesRules,
    exactMatchRules,
    blocklistSources
  });
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
