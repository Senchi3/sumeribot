const { SlashCommandBuilder } = require('discord.js');
const sqliteHandler = require('../../sqlite-handler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setgeneralchannel')
        .setDescription('Set the general channel for the server.')
        .addStringOption(option =>
            option.setName('channel_id')
                .setDescription('The ID of the general channel.')
                .setRequired(true)),
    async execute(interaction) {
        // Get the server ID
        const serverId = interaction.guild.id;

        // Get the provided general channel ID from the interaction
        const channelOption = interaction.options.getString('channel_id');
        const generalChannelId = channelOption.trim();

        // Set the general channel ID in the database
        await sqliteHandler.setGeneralChannelID(serverId, generalChannelId);

        // Respond to the user
        await interaction.reply(`General channel ID set to ${generalChannelId} for this server.`);
    },
};