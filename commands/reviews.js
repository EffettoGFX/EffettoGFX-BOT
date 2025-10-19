const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reviews')
        .setDescription('Leave a review for a product'),

    async execute(interaction, db) {
        try {
            // Check if user is authorized
            const isAuthorized = await db.isUserAuthorized(interaction.user.id);
            if (!isAuthorized) {
                return await interaction.reply({
                    content: '❌ You are not authorized to leave reviews. Contact an administrator for authorization.',
                    flags: 64
                });
            }

            // Get all products
            const products = await db.getAllProducts();
            if (products.length === 0) {
                return await interaction.reply({
                    content: '❌ No products available for review.',
                    flags: 64
                });
            }

            // Create product selection menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_product')
                .setPlaceholder('Choose a product to review')
                .setMinValues(1)
                .setMaxValues(1);

            products.forEach(product => {
                selectMenu.addOptions({
                    label: product.name,
                    value: product.name,
                    description: `Review ${product.name}`
                });
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('⭐ Leave a Review')
                .setDescription('Please select a product to review from the dropdown below.')
                .setFooter({ text: 'You can only review products you have purchased' });

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            console.error('Reviews command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while setting up the review.',
                flags: 64
            });
        }
    }
};
