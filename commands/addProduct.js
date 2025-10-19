const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addproduct')
        .setDescription('Add a new product to the review system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the product to add')
                .setRequired(true)
        ),

    async execute(interaction, db) {
        try {
            const productName = interaction.options.getString('name');

            // Check if product already exists
            const existingProducts = await db.getAllProducts();
            const productExists = existingProducts.some(p => p.name.toLowerCase() === productName.toLowerCase());

            if (productExists) {
                return await interaction.reply({
                    content: `❌ Product "${productName}" already exists!`,
                    flags: 64
                });
            }

            // Add product to database
            await db.addProduct(productName);

            const embed = {
                color: 0x00ff00,
                title: '✅ Product Added',
                description: `Product "${productName}" has been added to the review system.`,
                timestamp: new Date().toISOString()
            };

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('AddProduct command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while adding the product.',
                flags: 64
            });
        }
    }
};
