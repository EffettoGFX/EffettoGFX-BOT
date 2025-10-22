const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available bot commands and their descriptions'),

    async execute(interaction, db) {
        try {
            // Check if user is admin
            const isAdmin = interaction.member.permissions.has('Administrator');

            const embed = new EmbedBuilder()
                .setColor(0x770380)
                .setTitle('🤖 Bot Commands Help')
                .setDescription('Here are the available commands for this bot:')
                .setFooter({ text: 'Need more help? Open a ticket using /ticket' })
                .setTimestamp();

            // Common commands for all users
            embed.addFields(
                {
                    name: '🎫 Ticket Commands',
                    value: '`/ticket` - Open a support ticket',
                    inline: false
                },
                {
                    name: '⭐ Review Commands',
                    value: '`/review` - Leave a review for a product (3-phase system)\n`/authorizereview` - Authorize user to leave reviews (Admin only)\n`/deauthorizereview` - Remove review authorization (Admin only)',
                    inline: false
                },
                {
                    name: '🛍️ Product Commands',
                    value: '`/listproducts` - List all available products',
                    inline: false
                },
                {
                    name: '💰 Payment Commands',
                    value: '`/paypal` - Get PayPal payment information',
                    inline: false
                },
                {
                    name: '❓ Other Commands',
                    value: '`/help` - Show this help message',
                    inline: false
                }
            );

            // Add admin-only commands if user is admin
            if (isAdmin) {
                embed.addFields(
                    {
                        name: '🔧 Admin Commands',
                        value: '`/setup` - Configure bot settings (including review channel)\n`/addproduct` - Add a new product with emoji\n`/removeproduct` - Remove a product\n`/authorizereview` - Authorize user to leave reviews\n`/deauthorizereview` - Remove review authorization',
                        inline: false
                    },
                    {
                        name: '👮 Staff Commands',
                        value: '`/claim` - Claim a ticket\n`/close` - Close a ticket\n`/reopen` - Reopen a closed ticket\n**Review Management** - Approve/reject reviews in review channel',
                        inline: false
                    }
                );
            }

            // Add usage instructions
            embed.addFields({
                name: '📋 How to Use',
                value: isAdmin
                    ? '• Use `/ticket` to open a support ticket\n• Use `/review` to leave a product review (3-phase system)\n• Use `/listproducts` to see available products\n• Use `/setup` to configure bot settings and review channel\n• Use admin commands to manage the system\n• Approve/reject reviews in the review channel'
                    : '• Use `/ticket` to open a support ticket\n• Use `/review` to leave a product review (3-phase system)\n• Use `/listproducts` to see available products\n• Contact staff for authorization to leave reviews',
                inline: false
            });

            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error('Help command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while showing help information.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
