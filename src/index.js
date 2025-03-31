// src/index.js
require("sapphire-plugin-modal-commands/register");
const { SapphireClient } = require("@sapphire/framework");
const { guildSettings } = require("../db");
const config = require("../config.json");
const streamAlerts = require("./utils/streamAlerts");

const activities = [
  {
    text: "på {streamerCount} streams | {serverCount} servere",
    type: "PLAYING",
  },
  {
    text: "over {streamerCount} live streams | {serverCount} servere",
    type: "WATCHING",
  },
  {
    text: "til {streamerCount} streamere | {serverCount} servere",
    type: "LISTENING",
  },
];

const client = new SapphireClient({
  intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES"],
});

client.once("ready", async () => {
  console.log("Bot is online!");
  
  // Register commands
  try {
    console.log("Started refreshing application (/) commands.");
    await client.application.commands.set();
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error refreshing application (/) commands:", error);
  }

  streamAlerts.init(client);

  let activityIndex = 0;

  setInterval(async () => {
    let totalStreamers = 0;

    client.guilds.cache.each((guild) => {
      const guildStreamers = guildSettings.get(guild.id, "streamers", []);
      totalStreamers += guildStreamers.length;
    });

    const serverCount = client.guilds.cache.size;

    const activity = activities[activityIndex % activities.length];
    let formattedText = activity.text
      .replace("{streamerCount}", totalStreamers)
      .replace("{serverCount}", serverCount);

    client.user.setActivity(formattedText, { type: activity.type });

    activityIndex++;
  }, 30000);
});

client.login(config.token);
