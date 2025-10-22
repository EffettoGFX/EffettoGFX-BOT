const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, db) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            // Get client from interaction
            const command = interaction.client.commands.get(interaction.commandName);

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

                // Send error message
                try {
                    const errorMessage = {
                        content: '❌ There was an error while executing this command!',
                        flags: MessageFlags.Ephemeral
                    };

                    if (interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else if (!interaction.replied) {
                        await interaction.reply(errorMessage);
                    }
                } catch (replyError) {
                    console.error('❌ [ERROR] Failed to send error message:', replyError);
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
                } else if (interaction.customId.startsWith('approve_review_')) {
                    await handleApproveReview(interaction, db);
                } else if (interaction.customId.startsWith('reject_review_')) {
                    await handleRejectReview(interaction, db);
                }
            }

            // Handle review product selection
            if (interaction.isStringSelectMenu()) {
                try {
                    if (interaction.customId === 'select_product') {
                        await handleProductSelection(interaction, db);
                    } else if (interaction.customId === 'select_rating') {
                        await handleRatingSelection(interaction, db);
                    }
                } catch (error) {
                    console.error('Select menu interaction error:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        try {
                            await interaction.reply({
                                content: '❌ An error occurred while processing your selection.',
                                flags: MessageFlags.Ephemeral
                            });
                        } catch (replyError) {
                            console.error('Failed to send error message:', replyError);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Interaction create error:', error);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ An error occurred while processing your request.',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (replyError) {
                    console.error('Failed to send error message:', replyError);
                }
            }
        }
    }
};

async function handleClaimTicket(interaction, db) {
    const ticket = await db.getTicketByChannel(interaction.channel.id);

    if (!ticket) {
        return await interaction.reply({
            content: '❌ This is not a valid ticket channel!',
            flags: MessageFlags.Ephemeral
        });
    }

    if (ticket.status !== 'open') {
        return await interaction.reply({
            content: '❌ This ticket is not open!',
            flags: MessageFlags.Ephemeral
        });
    }

    if (ticket.claimed_by) {
        return await interaction.reply({
            content: `❌ This ticket is already claimed by <@${ticket.claimed_by}>!`,
            flags: MessageFlags.Ephemeral
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
                flags: MessageFlags.Ephemeral
            });
        }

        if (ticket.status === 'closed') {
            console.log('❌ [ERROR] Ticket already closed');
            return await interaction.reply({
                content: '❌ This ticket is already closed!',
                flags: MessageFlags.Ephemeral
            });
        }

        console.log('🔍 [DEBUG] Ticket validation passed, proceeding with transcript generation...');

        // Generate transcript using discord-html-transcripts
        let transcript;
        try {
            console.log('🔍 [DEBUG] Starting transcript generation for channel:', interaction.channel.id);
            console.log('🔍 [DEBUG] Ticket data:', ticket);

            // Generate transcript using discord-html-transcripts
            console.log('🔍 [DEBUG] Generating HTML transcript with discord-html-transcripts...');

            const transcriptOptions = {
                filename: `ticket-${ticket._id}-transcript.html`,
                saveImages: false, // Set to false to avoid large file sizes
                returnType: 'buffer', // Return as buffer for Discord upload
                footerText: `Ticket ${ticket._id} • Closed by ${interaction.user.tag} • Generated on ${new Date().toLocaleString()}`,
                limit: -1, // Fetch all messages recursively
                filter: (message) => !message.author.bot // Exclude bot messages from transcript
            };

            transcript = await discordTranscripts.createTranscript(interaction.channel, transcriptOptions);
            console.log('✅ [SUCCESS] HTML transcript generated successfully with discord-html-transcripts, size:', transcript.length, 'bytes');
            console.log('🔍 [DEBUG] Transcript filename:', transcriptOptions.filename);

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
                flags: MessageFlags.Ephemeral
            });
        }

        console.log('🔍 [DEBUG] Looking for transcript channel in guild...');
        const transcriptChannel = interaction.guild.channels.cache.get(transcriptChannelId);
        console.log('🔍 [DEBUG] Found transcript channel:', transcriptChannel ? transcriptChannel.name : 'NOT FOUND');

        if (!transcriptChannel) {
            console.log('❌ [ERROR] Transcript channel not found in guild');
            return await interaction.reply({
                content: '❌ Transcript channel not found!',
                flags: MessageFlags.Ephemeral
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
            console.log('❌ [ERROR] No transcript generated - sending transcript embed without file');
            try {
                transcriptEmbed.description = '⚠️ Transcript generation failed, but ticket has been closed.';
                await transcriptChannel.send({
                    embeds: [transcriptEmbed]
                });
                console.log('✅ [SUCCESS] Transcript embed sent without file');
            } catch (sendError) {
                console.error('❌ [ERROR] Failed to send transcript embed:', sendError);
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
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleReopenTicket(interaction, db) {
    const ticket = await db.getTicketByChannel(interaction.channel.id);

    if (!ticket) {
        return await interaction.reply({
            content: '❌ This is not a valid ticket channel!',
            flags: MessageFlags.Ephemeral
        });
    }

    if (ticket.status !== 'closed') {
        return await interaction.reply({
            content: '❌ This ticket is not closed!',
            flags: MessageFlags.Ephemeral
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
                flags: MessageFlags.Ephemeral
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
            flags: MessageFlags.Ephemeral
        });

    } catch (error) {
        console.error('Open ticket error:', error);
        await interaction.reply({
            content: '❌ An error occurred while creating your ticket.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleDeleteTicketChannel(interaction, db) {
    try {
        // Check if user has permission to delete channels
        if (!interaction.member.permissions.has('ManageChannels')) {
            return await interaction.reply({
                content: '❌ You do not have permission to delete this channel.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Check if this is a ticket channel
        const ticket = await db.getTicketByChannel(interaction.channel.id);
        if (!ticket) {
            return await interaction.reply({
                content: '❌ This is not a valid ticket channel!',
                flags: MessageFlags.Ephemeral
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
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleProductSelection(interaction, db) {
    const productName = interaction.values[0];

    // Get product details to show emoji (this will use cache if available)
    const products = await db.getAllProducts();
    const selectedProduct = products.find(p => p.name === productName);
    const emoji = selectedProduct?.emoji || '📦';

    // Store product selection temporarily
    interaction.client.tempReviewData = interaction.client.tempReviewData || new Map();
    interaction.client.tempReviewData.set(interaction.user.id, {
        product: productName,
        emoji: emoji
    });

    // Create Phase 2 Select Menu - Star Rating
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
        .setTitle('⭐ Phase 2: Rate Your Experience')
        .setDescription(`You selected: **${emoji} ${productName}**\n\nPlease rate your experience with this product.`)
        .setFooter({ text: 'Your rating will be saved and may be reviewed by staff' });

    try {
        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('Product selection update error:', error);
        // If update fails, try to reply instead
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ An error occurred while processing your selection.',
                    flags: MessageFlags.Ephemeral,
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    }
}

async function handleRatingSelection(interaction, db) {
    const rating = parseInt(interaction.values[0]);

    // Get stored product data
    const tempData = interaction.client.tempReviewData?.get(interaction.user.id);
    if (!tempData) {
        return await interaction.reply({
            content: '❌ Session expired. Please start the review process again with `/review`.',
            flags: MessageFlags.Ephemeral,
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

    try {
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Rating selection modal error:', error);
        // If showModal fails, try to reply instead
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ An error occurred while showing the review form.',
                    flags: MessageFlags.Ephemeral,
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    }
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
                flags: MessageFlags.Ephemeral,
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
            flags: MessageFlags.Ephemeral,
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
                flags: MessageFlags.Ephemeral,
                ephemeral: true
            });
        }

        // Get stored product data
        const tempData = interaction.client.tempReviewData?.get(interaction.user.id);
        if (!tempData) {
            return await interaction.reply({
                content: '❌ Session expired. Please start the review process again with `/reviews`.',
                flags: MessageFlags.Ephemeral,
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
            flags: MessageFlags.Ephemeral,
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
                flags: MessageFlags.Ephemeral,
                ephemeral: true
            });
        }

        // Create the review
        const reviewId = await db.createReview(interaction.user.id, tempData.product, tempData.rating, description);

        // Get review approval channel from config
        const reviewApprovalChannelId = await db.getConfig('review_approval_channel');

        if (reviewApprovalChannelId) {
            const reviewApprovalChannel = interaction.guild.channels.cache.get(reviewApprovalChannelId);
            if (reviewApprovalChannel) {
                // Create review embed for the channel
                const stars = '⭐'.repeat(Math.floor(tempData.rating)) + (tempData.rating % 1 === 0.5 ? '⭐' : '');
                const reviewEmbed = new EmbedBuilder()
                    .setColor(0x770380)
                    .setTitle('⭐ New Review Submitted')
                    .setDescription(`A new review has been submitted and is pending approval.`)
                    .addFields(
                        {
                            name: '👤 Reviewer',
                            value: `<@${interaction.user.id}>`,
                            inline: true
                        },
                        {
                            name: '🛍️ Product',
                            value: `${tempData.emoji} ${tempData.product}`,
                            inline: true
                        },
                        {
                            name: '⭐ Rating',
                            value: `${stars} (${tempData.rating}/5)`,
                            inline: true
                        },
                        {
                            name: '📝 Description',
                            value: description,
                            inline: false
                        },
                        {
                            name: '🆔 Review ID',
                            value: reviewId.toString(),
                            inline: true
                        },
                        {
                            name: '📅 Submitted',
                            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                            inline: true
                        }
                    )
                    .setFooter({ text: 'Review pending staff approval' })
                    .setTimestamp();

                // Create approval buttons
                const approveButton = new ButtonBuilder()
                    .setCustomId(`approve_review_${reviewId}`)
                    .setLabel('Approve')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅');

                const rejectButton = new ButtonBuilder()
                    .setCustomId(`reject_review_${reviewId}`)
                    .setLabel('Reject')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌');

                const buttonRow = new ActionRowBuilder().addComponents(approveButton, rejectButton);

                await reviewApprovalChannel.send({
                    embeds: [reviewEmbed],
                    components: [buttonRow]
                });
            }
        }

        // Clear temp data
        interaction.client.tempReviewData.delete(interaction.user.id);

        // Create confirmation embed for user
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
            flags: MessageFlags.Ephemeral
        });

    } catch (error) {
        console.error('Review Phase 3 error:', error);
        await interaction.reply({
            content: '❌ An error occurred while submitting your review.',
            flags: MessageFlags.Ephemeral,
            ephemeral: true
        });
    }
}

async function handleApproveReview(interaction, db) {
    try {
        // Defer the interaction first to prevent timeout issues
        await interaction.deferReply({ ephemeral: true });

        // Check if user has permission to approve reviews
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.editReply({
                content: '❌ You do not have permission to approve reviews.'
            });
        }

        const reviewId = interaction.customId.replace('approve_review_', '');
        console.log(`🔍 [DEBUG] Processing approval for review ID: ${reviewId}`);

        // Update review status in database
        console.log(`🔍 [DEBUG] Updating review status to approved...`);
        const updateResult = await db.updateReviewStatus(reviewId, 'approved', interaction.user.id);
        console.log(`🔍 [DEBUG] Update result:`, updateResult);

        // Get the review data to post to review channel
        console.log(`🔍 [DEBUG] Fetching review data...`);
        const review = await db.getReviewById(reviewId);
        console.log(`🔍 [DEBUG] Review data:`, review ? 'Found' : 'Not found');

        if (review) {
            console.log(`🔍 [DEBUG] Processing review approval for review ID: ${reviewId}`);

            // Get review channel from config
            const reviewChannelId = await db.getConfig('review_channel');
            console.log(`🔍 [DEBUG] Review channel ID from config: ${reviewChannelId}`);

            if (reviewChannelId) {
                const reviewChannel = interaction.guild.channels.cache.get(reviewChannelId);
                console.log(`🔍 [DEBUG] Review channel found: ${reviewChannel ? reviewChannel.name : 'NOT FOUND'}`);

                if (reviewChannel) {
                    try {
                        // Get product details (using cached version for better performance)
                        const products = await db.getAllProducts();
                        const product = products.find(p => p.name === review.product_name);
                        const emoji = product?.emoji || '📦';
                        const price = product?.price ? `€${product.price.toFixed(2)}` : 'Price TBD';

                        // Create enhanced approved review embed for public channel
                        const stars = '⭐'.repeat(Math.floor(review.rating));
                        const hasHalfStar = review.rating % 1 !== 0;
                        const starDisplay = stars + (hasHalfStar ? '⭐' : '');

                        const publicReviewEmbed = new EmbedBuilder()
                            .setColor(0x00ff00)
                            .setTitle('⭐ New Customer Review')
                            .setDescription(`A customer has shared their experience with **${emoji} ${review.product_name}**`)
                            .addFields(
                                {
                                    name: '👤 Customer',
                                    value: `<@${review.user_id}>`,
                                    inline: true
                                },
                                {
                                    name: '⭐ Rating',
                                    value: `${starDisplay} **${review.rating}/5**`,
                                    inline: true
                                },
                                {
                                    name: '💰 Price',
                                    value: price,
                                    inline: true
                                },
                                {
                                    name: '📝 Customer Review',
                                    value: review.description,
                                    inline: false
                                }
                            )
                            .setFooter({
                                text: `Review approved by ${interaction.user.tag} • Review ID: ${reviewId}`
                            })
                            .setTimestamp();

                        console.log(`🔍 [DEBUG] Sending review embed to channel: ${reviewChannel.name}`);

                        await reviewChannel.send({
                            embeds: [publicReviewEmbed]
                        });

                        console.log(`✅ [SUCCESS] Review embed sent successfully to review channel`);

                        // Send a success notification to the approval channel
                        console.log(`✅ [SUCCESS] Review successfully posted to review channel`);

                    } catch (embedError) {
                        console.error('❌ [ERROR] Failed to send review embed:', embedError);
                        console.error('❌ [ERROR] Error details:', embedError.message);

                        // Send error notification
                        console.error(`❌ [ERROR] Failed to post review to the review channel. Error: ${embedError.message}`);
                    }
                } else {
                    console.error('❌ [ERROR] Review channel not found in guild');
                }
            } else {
                console.error('❌ [ERROR] No review channel configured');
            }
        } else {
            console.error('❌ [ERROR] Review not found for ID:', reviewId);
        }

        // Update the embed to show approval
        const approvedEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Review Approved')
            .setDescription(`This review has been approved and is now public.`)
            .setFooter({ text: `Approved by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({
            embeds: [approvedEmbed],
            components: []
        });

    } catch (error) {
        console.error('❌ [ERROR] Approve review error:', error);
        console.error('❌ [ERROR] Stack trace:', error.stack);

        // Since we deferred the interaction, we can always use editReply
        try {
            await interaction.editReply({
                content: '❌ An error occurred while approving the review. Please try again or contact an administrator.'
            });
        } catch (replyError) {
            console.error('❌ [ERROR] Failed to send error message:', replyError);
        }
    }
}

async function handleRejectReview(interaction, db) {
    try {
        // Defer the interaction first to prevent timeout issues
        await interaction.deferReply({ ephemeral: true });

        // Check if user has permission to reject reviews
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.editReply({
                content: '❌ You do not have permission to reject reviews.'
            });
        }

        const reviewId = interaction.customId.replace('reject_review_', '');

        // Update review status in database
        await db.updateReviewStatus(reviewId, 'rejected', interaction.user.id);

        // Update the embed to show rejection
        const rejectedEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ Review Rejected')
            .setDescription(`This review has been rejected and will not be published.`)
            .setFooter({ text: `Rejected by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({
            embeds: [rejectedEmbed],
            components: []
        });

    } catch (error) {
        console.error('❌ [ERROR] Reject review error:', error);
        console.error('❌ [ERROR] Stack trace:', error.stack);

        try {
            await interaction.editReply({
                content: '❌ An error occurred while rejecting the review. Please try again or contact an administrator.'
            });
        } catch (replyError) {
            console.error('❌ [ERROR] Failed to send error message:', replyError);
        }
    }
}
