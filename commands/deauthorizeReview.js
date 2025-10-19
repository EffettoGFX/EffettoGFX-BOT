const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deauthorizereview')
        .setDescription('Remove a user\'s authorization to leave reviews')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to deauthorize from reviews')
                .setRequired(true)
        ),

    async execute(interaction, db) {
        try {
            const user = interaction.options.getUser('user');

            // Check if user is authorized
            const isAuthorized = await db.isUserAuthorized(user.id);
            if (!isAuthorized) {
                return await interaction.reply({
                    content: `❌ ${user} is not authorized to leave reviews!`,
                    flags: 64
                });
            }

            // Deauthorize user
            const result = await db.deauthorizeUser(user.id);

            if (result === 0) {
                return await interaction.reply({
                    content: '❌ Failed to deauthorize the user.',
                    flags: 64
                });
            }

            const embed = {
                color: 0xff6b6b,
                title: '✅ User Deauthorized',
                description: `${user} has been deauthorized from leaving reviews.`,
                fields: [
                    {
                        name: 'Deauthorized by',
                        value: interaction.user.toString(),
                        inline: true
                    },
                    {
                        name: 'Deauthorized at',
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString()
            };

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('DeauthorizeReview command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while deauthorizing the user.',
                flags: 64
            });
        }
    }
};
