const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

/**
 * Optimized Review Command
 * - Uses deferred replies for better UX
 * - Leverages cached product data from database
 * - Handles Discord's 25-option limit for select menus
 * - Enhanced error handling and performance monitoring
 * - Better embed design with product count and pricing info
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('review')
        .setDescription('Leave a review for a product'),

    async execute(interaction, db) {
        const startTime = Date.now();

        try {
            // Defer reply to give more time for processing
            await interaction.deferReply({ ephemeral: true });

            // Check if user is authorized
            const isAuthorized = await db.isUserAuthorized(interaction.user.id);
            if (!isAuthorized) {
                return await interaction.editReply({
                    content: '❌ You are not authorized to leave reviews. Contact an administrator for authorization.'
                });
            }

            // Get all products (now using optimized cached version)
            const products = await db.getAllProducts();
            if (products.length === 0) {
                return await interaction.editReply({
                    content: '❌ No products available for review.'
                });
            }

            // Create Phase 1 Select Menu - Product Selection
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_product')
                .setPlaceholder('Choose a product to review')
                .setMinValues(1)
                .setMaxValues(1);

            // Optimize product options creation
            const productOptions = products.map(product => {
                const emoji = product.emoji || '📦';
                const price = product.price ? `€${product.price.toFixed(2)}` : 'Price TBD';
                return {
                    label: `${emoji} ${product.name}`,
                    value: product.name,
                    description: `${price} - Click to review`
                };
            });

            // Discord has a limit of 25 options per select menu
            if (productOptions.length > 25) {
                // If more than 25 products, split into chunks or show first 25
                selectMenu.addOptions(productOptions.slice(0, 25));
            } else {
                selectMenu.addOptions(productOptions);
            }

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setColor(0x770380)
                .setTitle('⭐ Phase 1: Select Product')
                .setDescription('Please select a product to review from the dropdown below.')
                .addFields({
                    name: '📊 Available Products',
                    value: `${products.length} product${products.length !== 1 ? 's' : ''} available for review`,
                    inline: true
                })
                .setFooter({
                    text: 'You can only review products you have purchased • Review system v2.0'
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

            // Performance logging
            const executionTime = Date.now() - startTime;
            console.log(`✅ [PERFORMANCE] Review command executed in ${executionTime}ms for user ${interaction.user.tag}`);

        } catch (error) {
            console.error('❌ [ERROR] Review command error:', error);
            console.error('❌ [ERROR] Stack trace:', error.stack);

            // Enhanced error handling with different response strategies
            try {
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: '❌ An error occurred while setting up the review system. Please try again later or contact an administrator if the issue persists.'
                    });
                } else if (!interaction.replied) {
                    await interaction.reply({
                        content: '❌ An error occurred while setting up the review system. Please try again later.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (replyError) {
                console.error('❌ [ERROR] Failed to send error message:', replyError);
                // If all else fails, try to send a follow-up message
                try {
                    await interaction.followUp({
                        content: '❌ An error occurred. Please try the command again.',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (followUpError) {
                    console.error('❌ [ERROR] Failed to send follow-up error message:', followUpError);
                }
            }
        }
    }
};
