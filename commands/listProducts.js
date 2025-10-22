const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

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
                    flags: MessageFlags.Ephemeral
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x770380)
                .setTitle('📦 Available Products')
                .setDescription('Here are all the products available for review:')
                .setTimestamp();

            products.forEach((product, index) => {
                const emoji = product.emoji || '📦'; // Fallback emoji for existing products
                embed.addFields({
                    name: `${index + 1}. ${emoji} ${product.name} (€${product.price})`,
                    value: `Added: <t:${Math.floor(new Date(product.created_at).getTime() / 1000)}:R>`,
                    inline: false
                });
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('ListProducts command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while listing products.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
