const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim a ticket for support')
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

            if (ticket.status !== 'open') {
                return await interaction.reply({
                    content: '❌ This ticket is not open!',
                    flags: 64
                });
            }

            if (ticket.claimed_by) {
                return await interaction.reply({
                    content: `❌ This ticket is already claimed by <@${ticket.claimed_by}>!`,
                    flags: 64
                });
            }

            // Update ticket status
            await db.updateTicketStatus(interaction.channel.id, 'claimed', interaction.user.id);

            const embed = {
                color: 0x00ff00,
                title: '✅ Ticket Claimed',
                description: `This ticket has been claimed by ${interaction.user}`,
                timestamp: new Date().toISOString()
            };

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Claim command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while claiming the ticket.',
                flags: 64
            });
        }
    }
};
