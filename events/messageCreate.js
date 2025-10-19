module.exports = {
    name: 'messageCreate',
    async execute(message, db) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Check if this is the ticket channel
        const ticketChannelId = await db.getConfig('ticket_channel');
        if (ticketChannelId && message.channel.id === ticketChannelId) {
            // Check if message is a slash command
            if (!message.content.startsWith('/')) {
                // Delete the message and send a warning
                try {
                    await message.delete();
                    const warningMessage = await message.channel.send({
                        content: `❌ ${message.author}, please use the \`/ticket\` command or the button above to open a ticket. Regular messages are not allowed in this channel.`,
                        allowedMentions: { users: [message.author.id] }
                    });

                    // Delete the warning message after 5 seconds
                    setTimeout(async () => {
                        try {
                            await warningMessage.delete();
                        } catch (error) {
                            console.error('Error deleting warning message:', error);
                        }
                    }, 5000);
                } catch (error) {
                    console.error('Error handling ticket channel message:', error);
                }
                return;
            }
        }

        // Check if user is in the middle of writing a review
        if (message.client.tempReviewData && message.client.tempReviewData.has(message.author.id)) {
            const reviewData = message.client.tempReviewData.get(message.author.id);

            try {
                // Create the review
                const reviewId = await db.createReview(
                    reviewData.userId,
                    reviewData.product,
                    reviewData.rating,
                    message.content
                );

                // Clear the temp data
                message.client.tempReviewData.delete(message.author.id);

                // Get review channel
                const reviewChannelId = await db.getConfig('review_channel');
                if (reviewChannelId) {
                    const reviewChannel = message.guild.channels.cache.get(reviewChannelId);
                    if (reviewChannel) {
                        // Create review embed for publishing
                        const reviewEmbed = {
                            color: 0xffd700,
                            title: '⭐ New Review',
                            description: `**${message.author.username}** left a review for **${reviewData.product}**`,
                            fields: [
                                { name: 'Rating', value: '⭐'.repeat(reviewData.rating), inline: true },
                                { name: 'Product', value: reviewData.product, inline: true },
                                { name: 'Review', value: message.content.substring(0, 1000) + (message.content.length > 1000 ? '...' : ''), inline: false }
                            ],
                            footer: { text: `Review ID: ${reviewId}` },
                            timestamp: new Date().toISOString()
                        };

                        // Send review to review channel
                        const reviewMessage = await reviewChannel.send({ embeds: [reviewEmbed] });

                        // Add random emoji reaction
                        const emojis = ['🔥', '❤️', '🔝'];
                        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                        await reviewMessage.react(randomEmoji);

                        console.log(`✅ [SUCCESS] Review published in ${reviewChannel.name} with ${randomEmoji} reaction`);
                    }
                }

                const embed = {
                    color: 0x00ff00,
                    title: '✅ Review Submitted',
                    description: 'Your review has been submitted and published!',
                    fields: [
                        { name: 'Product', value: reviewData.product, inline: true },
                        { name: 'Rating', value: '⭐'.repeat(reviewData.rating), inline: true },
                        { name: 'Description', value: message.content.substring(0, 1000) + (message.content.length > 1000 ? '...' : ''), inline: false }
                    ],
                    timestamp: new Date().toISOString()
                };

                await message.reply({ embeds: [embed] });

            } catch (error) {
                console.error('Error saving review:', error);
                await message.reply({
                    content: '❌ An error occurred while saving your review. Please try again.'
                });
            }
        }
    }
};
