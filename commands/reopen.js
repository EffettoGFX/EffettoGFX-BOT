const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reopen')
        .setDescription('Reopen a closed ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, db) {
        try {
            const ticket = await db.getTicketByChannel(interaction.channel.id);

            if (!ticket) {
                return await interaction.reply({
                    content: '❌ This is not a valid ticket channel!',
                    flags: 64
                });
            }

            if (ticket.status !== 'closed') {
                return await interaction.reply({
                    content: '❌ This ticket is not closed!',
                    flags: 64
                });
            }

            // Update ticket status
            await db.updateTicketStatus(interaction.channel.id, 'open');

            const embed = {
                color: 0x00ff00,
                title: '🔓 Ticket Reopened',
                description: `This ticket has been reopened by ${interaction.user}`,
                timestamp: new Date().toISOString()
            };

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Reopen command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while reopening the ticket.',
                flags: 64
            });
        }
    }
};
