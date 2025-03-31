// src/utils/twitch.js
(async () => {
  fetch = (await import("node-fetch")).default;
})();

// Cache to store last check times and results
const cache = new Map();
const CACHE_DURATION = 15 * 1000; // 15 seconds cache

async function checkTwitchLive(streamer) {
  try {
    const now = Date.now();
    const cachedData = cache.get(streamer.name);
    
    // Return cached data if it's still valid
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      return cachedData.result;
    }

    const response = await fetch(`https://twitch.tv/${streamer.name}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const sourceCode = await response.text();
    
    // Quick check for live status before parsing JSON
    const isLive = sourceCode.includes('"isLiveBroadcast":true');
    streamer.url = `https://twitch.tv/${streamer.name}`;

    if (isLive) {
      // Extract JSON data more efficiently
      const jsonLdMatch = sourceCode.match(/<script type="application\/ld\+json">(\[.*?\])<\/script>/s);
      if (jsonLdMatch?.[1]) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          const liveData = jsonLd.find(data => data["@type"] === "VideoObject");

          if (liveData) {
            streamer.title = liveData.name;
            streamer.description = liveData.description;
            streamer.imageUrl = liveData.thumbnailUrl[2];
            streamer.startedAt = liveData.publication.startDate;
          }
        } catch (e) {
          console.error(`Error parsing JSON for ${streamer.name}:`, e);
        }
      }
    }

    const result = { isLive, streamer };
    
    // Cache the result
    cache.set(streamer.name, {
      timestamp: now,
      result
    });

    return result;
  } catch (error) {
    console.error(
      `Error checking Twitch live status for ${streamer.name}:`,
      error
    );
    return { isLive: false, streamer };
  }
}

// Clear cache periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
}, CACHE_DURATION);

module.exports = {
  checkTwitchLive,
};
