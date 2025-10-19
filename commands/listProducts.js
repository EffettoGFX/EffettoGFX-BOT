const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listproducts')
        .setDescription('List all available products for review')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, db) {
        try {
            const products = await db.getAllProducts();

            if (products.length === 0) {
                return await interaction.reply({
                    content: '❌ No products available.',
                    flags: 64
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('📦 Available Products')
                .setDescription('Here are all the products available for review:')
                .setTimestamp();

            products.forEach((product, index) => {
                embed.addFields({
                    name: `${index + 1}. ${product.name}`,
                    value: `Added: <t:${Math.floor(new Date(product.created_at).getTime() / 1000)}:R>`,
                    inline: false
                });
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('ListProducts command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while listing products.',
                flags: 64
            });
        }
    }
};
