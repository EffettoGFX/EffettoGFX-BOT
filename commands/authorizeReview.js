const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('authorizereview')
        .setDescription('Authorize a user to leave reviews')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to authorize for reviews')
                .setRequired(true)
        ),

    async execute(interaction, db) {
        try {
            const user = interaction.options.getUser('user');

            // Check if user is already authorized
            const isAlreadyAuthorized = await db.isUserAuthorized(user.id);
            if (isAlreadyAuthorized) {
                return await interaction.reply({
                    content: `❌ ${user} is already authorized to leave reviews!`,
                    flags: 64
                });
            }

            // Authorize user
            await db.authorizeUser(user.id, interaction.user.id);

            const embed = {
                color: 0x00ff00,
                title: '✅ User Authorized',
                description: `${user} has been authorized to leave reviews.`,
                fields: [
                    {
                        name: 'Authorized by',
                        value: interaction.user.toString(),
                        inline: true
                    },
                    {
                        name: 'Authorized at',
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString()
            };

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('AuthorizeReview command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while authorizing the user.',
                flags: 64
            });
        }
    }
};
