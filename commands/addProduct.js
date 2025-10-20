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
        )
        .addNumberOption(option =>
            option.setName('price')
                .setDescription('Price of the product in euros')
                .setRequired(true)
                .setMinValue(0.01)
        ),

    async execute(interaction, db) {
        try {
            const productName = interaction.options.getString('name');
            const price = interaction.options.getNumber('price');

            // Check if product already exists
            const existingProducts = await db.getAllProducts();
            const productExists = existingProducts.some(p => p.name.toLowerCase() === productName.toLowerCase());

            if (productExists) {
                return await interaction.reply({
                    content: `❌ Product "${productName}" already exists!`,
                    flags: 64
                });
            }

            // Add product to database with price
            await db.addProduct(productName, price);

            const embed = {
                color: 0x00ff00,
                title: '✅ Product Added',
                description: `Product "${productName}" has been added to the review system.`,
                fields: [
                    {
                        name: 'Product Name',
                        value: productName,
                        inline: true
                    },
                    {
                        name: 'Price',
                        value: `€${price.toFixed(2)}`,
                        inline: true
                    }
                ],
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
