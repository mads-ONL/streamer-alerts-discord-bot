// src/utils/streamAlerts.js
const { guildSettings } = require("../../db");
const { createEmbed } = require("./embed");
const { MessageActionRow, MessageButton } = require('discord.js');
const { checkTwitchLive } = require("./twitch");
const { checkYouTubeLive } = require("./youtube");
const { checkRumbleLive } = require("./rumble");
const { checkKickLive } = require("./kick");
// const { checkTikTokLive } = require("./tiktok");

const lastLiveData = new Map();

module.exports = {
  init: (client) => {
    setInterval(() => checkStreamers(client), 30 * 1000);
  },
};

async function checkStreamers(client) {
  if (client.guilds.cache.size === 0) return;

  for (const [guildId, guild] of client.guilds.cache) {
    let streamers = guildSettings.get(guildId, "streamers") || [];

    for (let i = 0; i < streamers.length; i++) {
      try {
        const liveInfo = await checkIfLive(streamers[i]);
        const liveStreamKey = `${guildId}-${streamers[i].id}`;
        const lastLive = lastLiveData.get(liveStreamKey);

        const shouldSendEmbed =
          liveInfo.isLive &&
          (!lastLive || lastLive.title !== liveInfo.streamer.title);

          if (shouldSendEmbed) {
            const channel = client.channels.cache.get(streamers[i].channelID);
            if (channel) {
              const { embed, components } = createStreamerEmbed(liveInfo.streamer);
              await channel.send({ embeds: [embed], components });
            }

          lastLiveData.set(liveStreamKey, {
            title: liveInfo.streamer.title,
            imageUrl: liveInfo.streamer.imageUrl,
            isLive: liveInfo.isLive,
          });
        }

        if (!liveInfo.isLive && lastLiveData.has(liveStreamKey)) {
          lastLiveData.delete(liveStreamKey);
        }

        streamers[i] = {
          ...streamers[i],
          ...liveInfo.streamer,
          lastLiveAt: liveInfo.isLive ? new Date() : streamers[i].lastLiveAt,
        };
        await guildSettings.set(guildId, "streamers", streamers);
      } catch (error) {
        console.error(
          `Error during live check for ${streamers[i].name}:`,
          error
        );
      }
    }
  }
}

async function checkIfLive(streamer) {
  const platformCheckers = {
    twitch: checkTwitchLive,
    youtube: checkYouTubeLive,
    rumble: checkRumbleLive,
    kick: checkKickLive,
    // tiktok: checkTikTokLive,
  };

  const checker = platformCheckers[streamer.platform.toLowerCase()];
  if (checker) {
    return checker(streamer);
  }
  return { isLive: false, streamer };
}

function createStreamerEmbed(streamer) {
  const platformDetails = {
    twitch: { color: '#9146FF', emoji: '🟪', icon: 'https://i.imgur.com/1Qvz0qB.png' },
    youtube: { color: '#FF0000', emoji: '🟥', icon: 'https://i.imgur.com/8ScLNnk.png' },
    rumble: { color: '#90EE90', emoji: '🟩', icon: 'https://i.imgur.com/8ScLNnk.png' },
    kick: { color: '#00FF00', emoji: '🟩', icon: 'https://i.imgur.com/8ScLNnk.png' },
    tiktok: { color: '#000000', emoji: '🔳', icon: 'https://i.imgur.com/8ScLNnk.png' },
  };

  const currentPlatform = platformDetails[streamer.platform.toLowerCase()] || { color: 'DEFAULT', emoji: '��', icon: null };

  let description = `**${streamer.username || streamer.name}** er nu live på ${currentPlatform.emoji} **${streamer.platform}**!\n\n`;
  
  if (streamer.bio) {
    description += `> ${streamer.bio}\n\n`;
  }

  description += `[Klik her for at se streamen](${streamer.url})`;

  const fields = [];
  
  if (streamer.viewers) {
    fields.push({
      name: "👥 Current Viewers",
      value: streamer.viewers.toLocaleString(),
      inline: true,
    });
  }

  const followerLabel = streamer.platform.toLowerCase() === "youtube" ? "👥 Subscribers" : "👥 Followers";
  if (streamer.followersCount) {
    fields.push({
      name: followerLabel,
      value: streamer.followersCount.toLocaleString(),
      inline: true,
    });
  }

  if (streamer.verified) {
    fields.push({
      name: "✅ Status",
      value: "Verified Creator",
      inline: true,
    });
  }

  const button = new MessageButton()
    .setLabel(`Watch on ${streamer.platform}`)
    .setStyle('LINK')
    .setURL(streamer.url)
    .setEmoji(currentPlatform.emoji);

  const row = new MessageActionRow().addComponents(button);

  return {
    embed: createEmbed({
      title: streamer.title || "Live Stream",
      url: streamer.url,
      description: description,
      color: currentPlatform.color,
      thumbnail: streamer.profileImageUrl || undefined,
      image: streamer.imageUrl || undefined,
      fields: fields,
      author: {
        name: `${streamer.username || streamer.name} on ${streamer.platform}`,
        iconURL: currentPlatform.icon,
        url: streamer.url
      },
      timestamp: true
    }),
    components: [row]
  };
}
