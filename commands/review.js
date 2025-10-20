const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('review')
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

            // Create Phase 1 Modal - Product Selection
            const modal = new ModalBuilder()
                .setCustomId('review_phase1_modal')
                .setTitle('⭐ Phase 1: Select Product');

            // Create product selection dropdown as text input with options
            const productOptions = products.map(product => {
                const emoji = product.emoji || '📦';
                return `${emoji} ${product.name}`;
            }).join('\n');

            const productInput = new TextInputBuilder()
                .setCustomId('product_selection')
                .setLabel('Available Products:')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(productOptions)
                .setRequired(false)
                .setMaxLength(1000);

            const productNameInput = new TextInputBuilder()
                .setCustomId('selected_product')
                .setLabel('Product name:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., Logo Design')
                .setRequired(true)
                .setMaxLength(100);

            const firstActionRow = new ActionRowBuilder().addComponents(productInput);
            const secondActionRow = new ActionRowBuilder().addComponents(productNameInput);

            modal.addComponents(firstActionRow, secondActionRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Reviews command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while setting up the review.',
                flags: 64
            });
        }
    }
};
