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
  loadMessageCommandListeners: true,
  loadDefaultErrorListeners: true,
  api: {
    auth: true,
    version: '10'
  }
});

client.once("ready", async () => {
  console.log("Bot is online!");
  
  // Register commands
  try {
    console.log("Started refreshing application (/) commands.");
    await client.application?.fetch();
    
    // Register commands globally
    const commands = await client.application.commands.fetch();
    console.log(`Found ${commands.size} existing commands.`);
    
    // Register commands using Sapphire's registry
    const commandStore = client.stores.get('commands');
    const commandsToRegister = [];
    
    for (const command of commandStore.values()) {
      const commandData = {
        name: command.name,
        description: command.description
      };
      
      if (command.options && Array.isArray(command.options)) {
        commandData.options = command.options.map(option => ({
          name: option.name,
          description: option.description,
          type: option.type,
          required: option.required,
          choices: option.choices
        }));
      }
      
      commandsToRegister.push(commandData);
    }
    
    await client.application.commands.set(commandsToRegister);
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
