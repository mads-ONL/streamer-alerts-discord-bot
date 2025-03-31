// src/commands/social/removestreamer.js
const { Command } = require("@sapphire/framework");
const { guildSettings } = require("../../../db");
const { createEmbed } = require("../../utils/embed");

module.exports = class RemoveStreamerCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "removestreamer",
      description: "Fjern en streameren fra tracking.",
    });
  }

  async registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Navnet på streameren du vil fjerne")
            .setRequired(true)
        )
    );
  }

  async chatInputRun(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has("MANAGE_CHANNELS")) {
      const embed = createEmbed({
        description: "❌ Du har ikke tilladelse til at bruge denne kommando.",
      });
      return interaction.followUp({ embeds: [embed] });
    }

    const guildId = interaction.guildId;
    const name = interaction.options.getString("name");
    const streamers = guildSettings.get(guildId, "streamers", []);

    const streamerIndex = streamers.findIndex(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );

    if (streamerIndex === -1) {
      const embed = createEmbed({
        description: `❌ Streamer ${name} blev ikke fundet i trackinglisten.`,
      });
      return interaction.followUp({ embeds: [embed] });
    }

    streamers.splice(streamerIndex, 1);
    guildSettings.set(guildId, "streamers", streamers);

    const embed = createEmbed({
      description: `✅ ${name} blev fjernet fra trackinglisten.`,
    });
    await interaction.followUp({ embeds: [embed] });
  }
};
