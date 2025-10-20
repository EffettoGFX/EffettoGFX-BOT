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

            // Get the review role from configuration
            const reviewRoleId = await db.getConfig('review_role');
            if (!reviewRoleId) {
                return await interaction.reply({
                    content: '❌ Review role is not configured. Please run `/setup` first.',
                    flags: 64
                });
            }

            // Get the role object
            const reviewRole = interaction.guild.roles.cache.get(reviewRoleId);
            if (!reviewRole) {
                return await interaction.reply({
                    content: '❌ Review role not found. Please check the configuration.',
                    flags: 64
                });
            }

            // Get the member object
            const member = interaction.guild.members.cache.get(user.id);
            if (!member) {
                return await interaction.reply({
                    content: '❌ User not found in this server.',
                    flags: 64
                });
            }

            // Add the role to the user
            await member.roles.add(reviewRole);

            // Authorize user in database
            await db.authorizeUser(user.id, interaction.user.id);

            const embed = {
                color: 0x00ff00,
                title: '✅ User Authorized',
                description: `${user} has been authorized to leave reviews and given the ${reviewRole} role.`,
                fields: [
                    {
                        name: 'Authorized by',
                        value: interaction.user.toString(),
                        inline: true
                    },
                    {
                        name: 'Role assigned',
                        value: reviewRole.toString(),
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
