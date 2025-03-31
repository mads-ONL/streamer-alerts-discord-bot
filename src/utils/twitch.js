// src/utils/twitch.js
(async () => {
  fetch = (await import("node-fetch")).default;
})();

const config = require("../../config.json");

// Cache for access token
let accessToken = null;
let tokenExpiry = null;
const CACHE_DURATION = 15 * 1000; // 15 seconds cache for stream data

async function getAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${config.twitch.clientId}&client_secret=${config.twitch.clientSecret}&grant_type=client_credentials`, {
      method: 'POST'
    });
    
    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    return accessToken;
  } catch (error) {
    console.error('Error getting Twitch access token:', error);
    throw error;
  }
}

async function checkTwitchLive(streamer) {
  try {
    const now = Date.now();
    const cachedData = cache.get(streamer.name);
    
    // Return cached data if it's still valid
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      return cachedData.result;
    }

    const accessToken = await getAccessToken();
    
    // Get user ID first
    const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${streamer.name}`, {
      headers: {
        'Client-ID': config.twitch.clientId,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const userData = await userResponse.json();
    if (!userData.data || userData.data.length === 0) {
      throw new Error(`User ${streamer.name} not found`);
    }

    const userId = userData.data[0].id;

    // Get stream data
    const streamResponse = await fetch(`https://api.twitch.tv/helix/streams?user_id=${userId}`, {
      headers: {
        'Client-ID': config.twitch.clientId,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const streamData = await streamResponse.json();
    const isLive = streamData.data && streamData.data.length > 0;

    streamer.url = `https://twitch.tv/${streamer.name}`;

    if (isLive) {
      const stream = streamData.data[0];
      streamer.title = stream.title;
      streamer.description = stream.user_name; // Twitch doesn't provide bio in stream data
      streamer.imageUrl = stream.thumbnail_url
        .replace('{width}', '440')
        .replace('{height}', '248');
      streamer.startedAt = stream.started_at;
      streamer.viewers = stream.viewer_count;
      streamer.followersCount = userData.data[0].followers_count;
      streamer.verified = userData.data[0].broadcaster_type === 'partner' || userData.data[0].broadcaster_type === 'affiliate';
      streamer.profileImageUrl = userData.data[0].profile_image_url;
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

// Cache to store last check times and results
const cache = new Map();

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
