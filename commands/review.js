const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('review')
        .setDescription('Submit a review for a product')
        .addStringOption(option =>
            option.setName('product')
                .setDescription('Name of the product to review')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('rating')
                .setDescription('Rating from 1 to 5 stars')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5)
        )
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Short description of your experience')
                .setRequired(true)
                .setMaxLength(1000)
        ),

    async execute(interaction, db) {
        try {
            const productName = interaction.options.getString('product');
            const rating = interaction.options.getInteger('rating');
            const description = interaction.options.getString('description');

            // Check if user is authorized
            const isAuthorized = await db.isUserAuthorized(interaction.user.id);
            if (!isAuthorized) {
                return await interaction.reply({
                    content: '❌ You are not authorized to leave reviews. Contact an administrator for authorization.',
                    flags: 64
                });
            }

            // Check if the product exists
            const products = await db.getAllProducts();
            const productExists = products.some(product =>
                product.name.toLowerCase() === productName.toLowerCase()
            );

            if (!productExists) {
                return await interaction.reply({
                    content: `❌ Product "${productName}" not found. Available products: ${products.map(p => p.name).join(', ')}`,
                    flags: 64
                });
            }

            // Create the review
            const reviewId = await db.createReview(
                interaction.user.id,
                productName,
                rating,
                description
            );

            // Get review channel for publishing
            const reviewChannelId = await db.getConfig('review_channel');
            if (reviewChannelId) {
                const reviewChannel = interaction.guild.channels.cache.get(reviewChannelId);
                if (reviewChannel) {
                    // Get product price for the embed
                    const products = await db.getAllProducts();
                    const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
                    const productPrice = product ? product.price : null;

                    const reviewEmbed = {
                        color: 0x0099ff,
                        title: `⭐ New Review: ${productName}`,
                        description: description,
                        fields: [
                            {
                                name: 'Rating',
                                value: '⭐'.repeat(rating),
                                inline: true
                            },
                            {
                                name: 'Reviewed by',
                                value: interaction.user.toString(),
                                inline: true
                            },
                            {
                                name: 'Status',
                                value: 'Pending Approval',
                                inline: true
                            }
                        ],
                        footer: {
                            text: `Review ID: ${reviewId}`
                        },
                        timestamp: new Date().toISOString()
                    };

                    // Add price field if available
                    if (productPrice) {
                        reviewEmbed.fields.push({
                            name: 'Product Price',
                            value: `€${productPrice.toFixed(2)}`,
                            inline: true
                        });
                    }

                    await reviewChannel.send({ embeds: [reviewEmbed] });
                }
            }

            // Send confirmation to user
            const embed = {
                color: 0x00ff00,
                title: '✅ Review Submitted',
                description: 'Your review has been submitted successfully!',
                fields: [
                    {
                        name: 'Product',
                        value: productName,
                        inline: true
                    },
                    {
                        name: 'Rating',
                        value: '⭐'.repeat(rating),
                        inline: true
                    },
                    {
                        name: 'Description',
                        value: description.substring(0, 1000) + (description.length > 1000 ? '...' : ''),
                        inline: false
                    }
                ],
                footer: {
                    text: 'Your review is pending staff approval'
                },
                timestamp: new Date().toISOString()
            };

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Review command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while submitting your review.',
                flags: 64
            });
        }
    }
};