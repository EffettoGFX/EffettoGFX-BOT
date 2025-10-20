const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, db) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const { client } = require('../index');
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`❌ [ERROR] No command matching ${interaction.commandName} was found.`);
                return;
            }

            console.log('🔍 [DEBUG] Executing command:', interaction.commandName);
            try {
                await command.execute(interaction, db);
                console.log('✅ [SUCCESS] Command executed successfully:', interaction.commandName);
            } catch (error) {
                console.error(`❌ [ERROR] Error executing ${interaction.commandName}:`, error);
                console.error('❌ [ERROR] Stack trace:', error.stack);

                const errorMessage = {
                    content: '❌ There was an error while executing this command!',
                    flags: 64
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
            return;
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'review_phase1_modal') {
                await handleReviewPhase1(interaction, db);
            } else if (interaction.customId === 'review_phase2_modal') {
                await handleReviewPhase2(interaction, db);
            } else if (interaction.customId === 'review_phase3_modal') {
                await handleReviewPhase3(interaction, db);
            }
            return;
        }

        // Handle buttons and select menus
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        try {
            // Handle ticket buttons
            if (interaction.isButton()) {
                console.log('🔍 [DEBUG] Button clicked:', interaction.customId);
                console.log('🔍 [DEBUG] User:', interaction.user.tag);
                console.log('🔍 [DEBUG] Channel:', interaction.channel.name);

                if (interaction.customId === 'claim_ticket') {
                    await handleClaimTicket(interaction, db);
                } else if (interaction.customId === 'close_ticket') {
                    console.log('🔍 [DEBUG] Close ticket button clicked, calling handleCloseTicket...');
                    await handleCloseTicket(interaction, db);
                } else if (interaction.customId === 'reopen_ticket') {
                    await handleReopenTicket(interaction, db);
                } else if (interaction.customId === 'open_ticket') {
                    await handleOpenTicket(interaction, db);
                } else if (interaction.customId === 'delete_ticket_channel') {
                    await handleDeleteTicketChannel(interaction, db);
                }
            }

            // Handle review product selection
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'select_product') {
                    await handleProductSelection(interaction, db);
                } else if (interaction.customId === 'select_rating') {
                    await handleRatingSelection(interaction, db);
                }
            }

        } catch (error) {
            console.error('Interaction create error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your request.',
                    flags: 64
                });
            }
        }
    }
};

async function handleClaimTicket(interaction, db) {
    const ticket = await db.getTicketByChannel(interaction.channel.id);

    if (!ticket) {
        return await interaction.reply({
            content: '❌ This is not a valid ticket channel!',
            flags: 64
        });
    }

    if (ticket.status !== 'open') {
        return await interaction.reply({
            content: '❌ This ticket is not open!',
            flags: 64
        });
    }

    if (ticket.claimed_by) {
        return await interaction.reply({
            content: `❌ This ticket is already claimed by <@${ticket.claimed_by}>!`,
            flags: 64
        });
    }

    // Update ticket status
    await db.updateTicketStatus(interaction.channel.id, 'claimed', interaction.user.id);

    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Ticket Claimed')
        .setDescription(`This ticket has been claimed by ${interaction.user}`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleCloseTicket(interaction, db) {
    console.log('🔍 [DEBUG] handleCloseTicket called by:', interaction.user.tag);
    console.log('🔍 [DEBUG] Channel ID:', interaction.channel.id);
    console.log('🔍 [DEBUG] Channel name:', interaction.channel.name);

    try {
        console.log('🔍 [DEBUG] Looking up ticket in database...');
        const ticket = await db.getTicketByChannel(interaction.channel.id);
        console.log('🔍 [DEBUG] Ticket found:', !!ticket);
        if (ticket) {
            console.log('🔍 [DEBUG] Ticket status:', ticket.status);
            console.log('🔍 [DEBUG] Ticket user:', ticket.user_id);
        }

        if (!ticket) {
            console.log('❌ [ERROR] No ticket found for channel');
            return await interaction.reply({
                content: '❌ This is not a valid ticket channel!',
                flags: 64
            });
        }

        if (ticket.status === 'closed') {
            console.log('❌ [ERROR] Ticket already closed');
            return await interaction.reply({
                content: '❌ This ticket is already closed!',
                flags: 64
            });
        }

        console.log('🔍 [DEBUG] Ticket validation passed, proceeding with transcript generation...');

        // Generate transcript
        let transcript;
        try {
            console.log('🔍 [DEBUG] Starting transcript generation for channel:', interaction.channel.id);
            console.log('🔍 [DEBUG] Ticket data:', ticket);

            // Fetch all messages from the channel
            console.log('🔍 [DEBUG] Fetching messages from channel...');
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            console.log('🔍 [DEBUG] Fetched', messages.size, 'messages');

            const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
            console.log('🔍 [DEBUG] Sorted messages, count:', sortedMessages.size);

            // Create HTML transcript
            console.log('🔍 [DEBUG] Creating HTML transcript...');
            let htmlTranscript = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket Transcript - ${ticket._id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #2c2f33; color: #dcddde; }
        .header { background: #7289da; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .message { background: #36393f; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #7289da; }
        .author { font-weight: bold; color: #7289da; margin-bottom: 5px; }
        .timestamp { color: #99aab5; font-size: 0.9em; }
        .content { margin-top: 8px; line-height: 1.4; }
        .attachment { color: #43b581; margin-top: 5px; }
        .embed { background: #2f3136; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .embed-title { font-weight: bold; color: #7289da; }
        .embed-description { margin-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎫 Ticket Transcript</h1>
        <p><strong>Ticket ID:</strong> ${ticket._id}</p>
        <p><strong>User:</strong> <@${ticket.user_id}></p>
        <p><strong>Closed by:</strong> ${interaction.user.tag}</p>
        <p><strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}</p>
        <p><strong>Closed:</strong> ${new Date().toLocaleString()}</p>
    </div>
    <div class="messages">
`;

            let messageCount = 0;
            sortedMessages.forEach(msg => {
                if (!msg.author.bot) {
                    messageCount++;
                    console.log(`🔍 [DEBUG] Processing message ${messageCount} from ${msg.author.username}:`, msg.content?.substring(0, 50) + '...');

                    htmlTranscript += `
        <div class="message">
            <div class="author">${msg.author.username}</div>
            <div class="timestamp">${msg.createdAt.toLocaleString()}</div>
            <div class="content">${msg.content || '<em>No content</em>'}</div>`;

                    // Add attachments
                    if (msg.attachments.size > 0) {
                        console.log(`🔍 [DEBUG] Message has ${msg.attachments.size} attachments`);
                        msg.attachments.forEach(attachment => {
                            htmlTranscript += `<div class="attachment">📎 ${attachment.name}</div>`;
                        });
                    }

                    // Add embeds
                    if (msg.embeds.length > 0) {
                        console.log(`🔍 [DEBUG] Message has ${msg.embeds.length} embeds`);
                        msg.embeds.forEach(embed => {
                            htmlTranscript += `<div class="embed">`;
                            if (embed.title) htmlTranscript += `<div class="embed-title">${embed.title}</div>`;
                            if (embed.description) htmlTranscript += `<div class="embed-description">${embed.description}</div>`;
                            htmlTranscript += `</div>`;
                        });
                    }

                    htmlTranscript += `</div>`;
                }
            });

            console.log(`🔍 [DEBUG] Processed ${messageCount} non-bot messages`);

            htmlTranscript += `
    </div>
</body>
</html>`;

            transcript = Buffer.from(htmlTranscript, 'utf8');
            console.log('🔍 [DEBUG] HTML transcript generated successfully, size:', transcript.length, 'bytes');
            console.log('🔍 [DEBUG] Transcript preview (first 200 chars):', htmlTranscript.substring(0, 200));

        } catch (transcriptError) {
            console.error('❌ [ERROR] Transcript generation error:', transcriptError);
            console.error('❌ [ERROR] Error details:', transcriptError.message);
            console.error('❌ [ERROR] Stack trace:', transcriptError.stack);
            // Continue without transcript if generation fails
            transcript = null;
        }

        // Get transcript channel
        console.log('🔍 [DEBUG] Getting transcript channel configuration...');
        const transcriptChannelId = await db.getConfig('transcript_channel');
        console.log('🔍 [DEBUG] Transcript channel ID from config:', transcriptChannelId);

        if (!transcriptChannelId) {
            console.log('❌ [ERROR] No transcript channel configured');
            return await interaction.reply({
                content: '❌ Transcript channel not configured! Use /setup first.',
                flags: 64
            });
        }

        console.log('🔍 [DEBUG] Looking for transcript channel in guild...');
        const transcriptChannel = interaction.guild.channels.cache.get(transcriptChannelId);
        console.log('🔍 [DEBUG] Found transcript channel:', transcriptChannel ? transcriptChannel.name : 'NOT FOUND');

        if (!transcriptChannel) {
            console.log('❌ [ERROR] Transcript channel not found in guild');
            return await interaction.reply({
                content: '❌ Transcript channel not found!',
                flags: 64
            });
        }

        // Send transcript
        const transcriptEmbed = {
            color: 0xff6b6b,
            title: '📄 Ticket Transcript',
            fields: [
                { name: 'Ticket ID', value: ticket._id.toString(), inline: true },
                { name: 'User', value: `<@${ticket.user_id}>`, inline: true },
                { name: 'Closed by', value: interaction.user.toString(), inline: true },
                { name: 'Created', value: `<t:${Math.floor(new Date(ticket.created_at).getTime() / 1000)}:F>`, inline: true },
                { name: 'Closed', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            ],
            timestamp: new Date().toISOString()
        };

        if (ticket.claimed_by) {
            transcriptEmbed.fields.push({
                name: 'Claimed by',
                value: `<@${ticket.claimed_by}>`,
                inline: true
            });
        }

        // Send transcript with or without file
        console.log('🔍 [DEBUG] Attempting to send transcript to channel:', transcriptChannel.name);
        console.log('🔍 [DEBUG] Transcript available:', !!transcript);

        if (transcript) {
            console.log('🔍 [DEBUG] Sending HTML transcript...');
            try {
                await transcriptChannel.send({
                    embeds: [transcriptEmbed],
                    files: [{
                        attachment: transcript,
                        name: `ticket-${ticket._id}-transcript.html`
                    }]
                });
                console.log('✅ [SUCCESS] HTML transcript sent successfully');
            } catch (sendError) {
                console.error('❌ [ERROR] Failed to send HTML transcript:', sendError);
                console.error('❌ [ERROR] Send error details:', sendError.message);
            }
        } else {
            console.log('🔍 [DEBUG] Creating fallback text transcript...');
            // Create a simple text transcript as fallback
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            let textTranscript = `# Ticket Transcript\n\n`;
            textTranscript += `**Ticket ID:** ${ticket._id}\n`;
            textTranscript += `**User:** <@${ticket.user_id}>\n`;
            textTranscript += `**Closed by:** ${interaction.user}\n`;
            textTranscript += `**Created:** <t:${Math.floor(new Date(ticket.created_at).getTime() / 1000)}:F>\n`;
            textTranscript += `**Closed:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n`;
            textTranscript += `## Messages:\n\n`;

            messages.reverse().forEach(msg => {
                if (!msg.author.bot) {
                    textTranscript += `**${msg.author.username}:** ${msg.content}\n`;
                    if (msg.attachments.size > 0) {
                        msg.attachments.forEach(attachment => {
                            textTranscript += `📎 Attachment: ${attachment.name}\n`;
                        });
                    }
                }
            });

            console.log('🔍 [DEBUG] Sending text transcript fallback...');
            try {
                // Send embed with text transcript
                transcriptEmbed.description = '⚠️ HTML transcript generation failed, but a text transcript is available below.';
                await transcriptChannel.send({
                    embeds: [transcriptEmbed],
                    files: [{
                        attachment: Buffer.from(textTranscript, 'utf8'),
                        name: `ticket-${ticket._id}-transcript.txt`
                    }]
                });
                console.log('✅ [SUCCESS] Text transcript sent successfully');
            } catch (sendError) {
                console.error('❌ [ERROR] Failed to send text transcript:', sendError);
                console.error('❌ [ERROR] Send error details:', sendError.message);
            }
        }

        // Update ticket status
        await db.updateTicketStatus(interaction.channel.id, 'closed', interaction.user.id);

        const embed = {
            color: 0xff6b6b,
            title: '🔒 Ticket Closed',
            description: 'This ticket has been closed and a transcript has been generated. Use the button below to delete the channel when ready.',
            timestamp: new Date().toISOString()
        };

        // Create delete button
        const deleteButton = {
            type: 1, // ActionRow
            components: [{
                type: 2, // Button
                style: 4, // Danger
                custom_id: 'delete_ticket_channel',
                label: 'Delete Channel',
                emoji: { name: '🗑️' }
            }]
        };

        await interaction.reply({
            embeds: [embed],
            components: [deleteButton]
        });

    } catch (error) {
        console.error('❌ [ERROR] handleCloseTicket error:', error);
        console.error('❌ [ERROR] Stack trace:', error.stack);
        await interaction.reply({
            content: '❌ An error occurred while closing the ticket.',
            flags: 64
        });
    }
}

async function handleReopenTicket(interaction, db) {
    const ticket = await db.getTicketByChannel(interaction.channel.id);

    if (!ticket) {
        return await interaction.reply({
            content: '❌ This is not a valid ticket channel!',
            flags: 64
        });
    }

    if (ticket.status !== 'closed') {
        return await interaction.reply({
            content: '❌ This ticket is not closed!',
            flags: 64
        });
    }

    // Update ticket status
    await db.updateTicketStatus(interaction.channel.id, 'open');

    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🔓 Ticket Reopened')
        .setDescription(`This ticket has been reopened by ${interaction.user}`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleOpenTicket(interaction, db) {
    try {
        const userId = interaction.user.id;
        const guild = interaction.guild;

        // Check if user already has an open ticket
        const existingTickets = await db.db.collection('tickets').find({
            user_id: userId,
            status: 'open'
        }).toArray();

        if (existingTickets.length > 0) {
            return await interaction.reply({
                content: '❌ You already have an open ticket! Please wait for it to be resolved before opening a new one.',
                flags: 64
            });
        }

        // Get ticket category from config
        const ticketCategoryId = await db.getConfig('ticket_category');
        let category = null;
        if (ticketCategoryId) {
            category = guild.channels.cache.get(ticketCategoryId);
        }

        // Create ticket channel
        const ticketChannel = await guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: 0, // GuildText
            parent: category,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: ['ViewChannel']
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                }
            ]
        });

        // Add staff role permissions if configured
        const staffRoleId = process.env.STAFF_ROLE_ID;
        if (staffRoleId) {
            const staffRole = guild.roles.cache.get(staffRoleId);
            if (staffRole) {
                await ticketChannel.permissionOverwrites.create(staffRole, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
            }
        }

        // Create ticket in database
        await db.createTicket(ticketChannel.id, userId);

        // Create welcome embed
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x770380)
            .setTitle('🎫 Support Ticket')
            .setDescription(`Hello ${interaction.user}! Your support ticket has been created. Please describe your issue and our staff will assist you shortly.`)
            .addFields(
                { name: 'Ticket ID', value: ticketChannel.id, inline: true },
                { name: 'Created', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: 'Use the buttons below to manage your ticket' })
            .setTimestamp();

        // Create action buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('Claim')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒'),
                new ButtonBuilder()
                    .setCustomId('reopen_ticket')
                    .setLabel('Reopen')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔓')
            );

        await ticketChannel.send({
            embeds: [welcomeEmbed],
            components: [row]
        });

        await interaction.reply({
            content: `✅ Your ticket has been created: ${ticketChannel}`,
            flags: 64
        });

    } catch (error) {
        console.error('Open ticket error:', error);
        await interaction.reply({
            content: '❌ An error occurred while creating your ticket.',
            flags: 64
        });
    }
}

async function handleDeleteTicketChannel(interaction, db) {
    try {
        // Check if user has permission to delete channels
        if (!interaction.member.permissions.has('ManageChannels')) {
            return await interaction.reply({
                content: '❌ You do not have permission to delete this channel.',
                flags: 64
            });
        }

        // Check if this is a ticket channel
        const ticket = await db.getTicketByChannel(interaction.channel.id);
        if (!ticket) {
            return await interaction.reply({
                content: '❌ This is not a valid ticket channel!',
                flags: 64
            });
        }

        // Confirm deletion
        const confirmEmbed = new EmbedBuilder()
            .setColor(0xff6b6b)
            .setTitle('🗑️ Channel Deletion Confirmed')
            .setDescription('This ticket channel will be deleted in 5 seconds...')
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed] });

        // Delete channel after delay
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                console.error('Error deleting ticket channel:', error);
            }
        }, 5000);

    } catch (error) {
        console.error('Delete ticket channel error:', error);
        await interaction.reply({
            content: '❌ An error occurred while deleting the channel.',
            flags: 64
        });
    }
}

async function handleProductSelection(interaction, db) {
    const productName = interaction.values[0];

    // Get product details to show emoji
    const products = await db.getAllProducts();
    const selectedProduct = products.find(p => p.name === productName);
    const emoji = selectedProduct?.emoji || '📦';

    // Create rating selection menu
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_rating')
        .setPlaceholder('Choose a rating (1-5 stars)')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions([
            { label: '⭐ 1 Star', value: '1', description: 'Poor' },
            { label: '⭐⭐ 2 Stars', value: '2', description: 'Fair' },
            { label: '⭐⭐⭐ 3 Stars', value: '3', description: 'Good' },
            { label: '⭐⭐⭐⭐ 4 Stars', value: '4', description: 'Very Good' },
            { label: '⭐⭐⭐⭐⭐ 5 Stars', value: '5', description: 'Excellent' }
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setColor(0x770380)
        .setTitle('⭐ Rate Your Experience')
        .setDescription(`You selected: **${emoji} ${productName}**\n\nPlease rate your experience with this product.`)
        .setFooter({ text: 'Your rating will be saved and may be reviewed by staff' });

    await interaction.update({
        embeds: [embed],
        components: [row]
    });
}

async function handleRatingSelection(interaction, db) {
    const rating = parseInt(interaction.values[0]);

    // Store the rating and product for the description step
    const embed = new EmbedBuilder()
        .setColor(0x770380)
        .setTitle('📝 Write Your Review')
        .setDescription(`Please write a description of your experience with this product.\n\n**Rating:** ${'⭐'.repeat(rating)}\n\nType your review in the chat and I'll save it.`)
        .setFooter({ text: 'Your review will be submitted for staff approval' });

    await interaction.update({
        embeds: [embed],
        components: []
    });

    // Store the review data temporarily (in a real implementation, you'd use a more robust storage)
    interaction.client.tempReviewData = interaction.client.tempReviewData || new Map();
    interaction.client.tempReviewData.set(interaction.user.id, {
        product: interaction.message.embeds[0].description.match(/\*\*(.*?)\*\*/)[1],
        rating: rating,
        userId: interaction.user.id
    });
}

// New 3-Phase Review System
async function handleReviewPhase1(interaction, db) {
    try {
        const selectedProduct = interaction.fields.getTextInputValue('selected_product');

        // Validate product exists
        const products = await db.getAllProducts();
        const product = products.find(p => p.name.toLowerCase() === selectedProduct.toLowerCase());

        if (!product) {
            return await interaction.reply({
                content: `❌ Product "${selectedProduct}" not found. Please check the spelling and try again.`,
                flags: 64,
                ephemeral: true
            });
        }

        // Store product selection temporarily
        interaction.client.tempReviewData = interaction.client.tempReviewData || new Map();
        interaction.client.tempReviewData.set(interaction.user.id, {
            product: product.name,
            emoji: product.emoji || '📦'
        });

        // Create Phase 2 Modal - Star Rating
        const modal = new ModalBuilder()
            .setCustomId('review_phase2_modal')
            .setTitle('⭐ Phase 2: Rate Your Experience');

        const ratingInput = new TextInputBuilder()
            .setCustomId('star_rating')
            .setLabel('Rating (0.5-5.0 stars):')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., 4.5 (for 4.5 stars)')
            .setRequired(true)
            .setMaxLength(3);

        const actionRow = new ActionRowBuilder().addComponents(ratingInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

    } catch (error) {
        console.error('Review Phase 1 error:', error);
        await interaction.reply({
            content: '❌ An error occurred in Phase 1.',
            flags: 64,
            ephemeral: true
        });
    }
}

async function handleReviewPhase2(interaction, db) {
    try {
        const ratingText = interaction.fields.getTextInputValue('star_rating');
        const rating = parseFloat(ratingText);

        // Validate rating
        if (isNaN(rating) || rating < 0.5 || rating > 5.0) {
            return await interaction.reply({
                content: '❌ Invalid rating. Please enter a number between 0.5 and 5.0 (e.g., 4.5).',
                flags: 64,
                ephemeral: true
            });
        }

        // Get stored product data
        const tempData = interaction.client.tempReviewData?.get(interaction.user.id);
        if (!tempData) {
            return await interaction.reply({
                content: '❌ Session expired. Please start the review process again with `/reviews`.',
                flags: 64,
                ephemeral: true
            });
        }

        // Update temp data with rating
        tempData.rating = rating;
        interaction.client.tempReviewData.set(interaction.user.id, tempData);

        // Create Phase 3 Modal - Description
        const modal = new ModalBuilder()
            .setCustomId('review_phase3_modal')
            .setTitle('⭐ Phase 3: Describe Your Experience');

        const descriptionInput = new TextInputBuilder()
            .setCustomId('review_description')
            .setLabel('Describe your experience:')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Share your thoughts about the product...')
            .setRequired(true)
            .setMaxLength(1000);

        const actionRow = new ActionRowBuilder().addComponents(descriptionInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

    } catch (error) {
        console.error('Review Phase 2 error:', error);
        await interaction.reply({
            content: '❌ An error occurred in Phase 2.',
            flags: 64,
            ephemeral: true
        });
    }
}

async function handleReviewPhase3(interaction, db) {
    try {
        const description = interaction.fields.getTextInputValue('review_description');

        // Get stored review data
        const tempData = interaction.client.tempReviewData?.get(interaction.user.id);
        if (!tempData) {
            return await interaction.reply({
                content: '❌ Session expired. Please start the review process again with `/reviews`.',
                flags: 64,
                ephemeral: true
            });
        }

        // Create the review
        await db.createReview(interaction.user.id, tempData.product, tempData.rating, description);

        // Clear temp data
        interaction.client.tempReviewData.delete(interaction.user.id);

        // Create confirmation embed
        const stars = '⭐'.repeat(Math.floor(tempData.rating)) + (tempData.rating % 1 === 0.5 ? '⭐' : '');
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Review Submitted Successfully!')
            .setDescription(`Thank you for your review!`)
            .addFields(
                {
                    name: 'Product',
                    value: `${tempData.emoji} ${tempData.product}`,
                    inline: true
                },
                {
                    name: 'Rating',
                    value: `${stars} (${tempData.rating}/5)`,
                    inline: true
                },
                {
                    name: 'Description',
                    value: description.length > 200 ? description.substring(0, 200) + '...' : description,
                    inline: false
                }
            )
            .setFooter({ text: 'Your review is pending approval by staff' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    } catch (error) {
        console.error('Review Phase 3 error:', error);
        await interaction.reply({
            content: '❌ An error occurred while submitting your review.',
            flags: 64,
            ephemeral: true
        });
    }
}
