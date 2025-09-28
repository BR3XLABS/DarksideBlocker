async function loadBlocklist() {
  const response = await fetch(chrome.runtime.getURL('blocklist.txt'));
  const text = await response.text();

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  let rules = [];
  let ruleId = 1;

  for (const line of lines) {
    if (line.startsWith('includes="') && line.endsWith('"')) {
      const urlPart = line.slice(9, -1); // Extract what's inside the quotes

      // Build the rule
      rules.push({
        id: ruleId++,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: urlPart,
          resourceTypes: ["main_frame"]
        }
      });
    }
    // You can add more syntax here later (e.g. startsWith=, endsWith=, etc.)
  }

  // Remove previous rules
  const oldRuleIds = rules.map(r => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
    addRules: rules
  });

  console.log(`Loaded ${rules.length} rules from blocklist.txt`);
}

chrome.runtime.onInstalled.addListener(loadBlocklist);
