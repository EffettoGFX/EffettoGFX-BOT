const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeproduct')
        .setDescription('Remove a product from the review system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the product to remove')
                .setRequired(true)
        ),

    async execute(interaction, db) {
        try {
            const productName = interaction.options.getString('name');

            // Check if product exists (optimized query)
            const productExists = await db.productExists(productName);

            if (!productExists) {
                return await interaction.reply({
                    content: `❌ Product "${productName}" does not exist!`,
                    flags: 64
                });
            }

            // Remove product from database
            const result = await db.removeProduct(productName);

            if (result === 0) {
                return await interaction.reply({
                    content: '❌ Failed to remove the product.',
                    flags: 64
                });
            }

            const embed = {
                color: 0xff6b6b,
                title: '✅ Product Removed',
                description: `Product "${productName}" has been removed from the review system.`,
                timestamp: new Date().toISOString()
            };

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('RemoveProduct command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while removing the product.',
                flags: 64
            });
        }
    }
};
