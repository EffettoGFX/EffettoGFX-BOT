const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close a ticket and generate transcript')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, db) {
        console.log('🔍 [DEBUG] Close command executed by:', interaction.user.tag);
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

                // Create enhanced HTML transcript
                console.log('🔍 [DEBUG] Creating enhanced HTML transcript...');

                // HTML escape helper function
                const escapeHtml = (text) => {
                    if (!text) return '';
                    return text
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                };

                let htmlTranscript = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket Transcript #${ticket._id}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background: #36393f;
            color: #dcddde;
            line-height: 1.6;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #2f3136;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        }

        .header {
            background: linear-gradient(135deg, #5865f2 0%, #7289da 100%);
            padding: 40px;
            color: white;
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ticket-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            backdrop-filter: blur(10px);
        }

        .info-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .info-label {
            font-size: 12px;
            text-transform: uppercase;
            opacity: 0.8;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .info-value {
            font-size: 16px;
            font-weight: 500;
        }

        .messages-container {
            padding: 30px;
        }

        .message {
            display: flex;
            gap: 16px;
            padding: 12px 0;
            transition: background 0.1s ease;
            border-radius: 4px;
            margin: 0 -8px;
            padding: 12px 8px;
        }

        .message:hover {
            background: rgba(4, 4, 5, 0.07);
        }

        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #5865f2, #7289da);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 16px;
            color: white;
            flex-shrink: 0;
        }

        .message-content-wrapper {
            flex: 1;
            min-width: 0;
        }

        .message-header {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 4px;
        }

        .author {
            font-weight: 500;
            color: #ffffff;
            font-size: 16px;
        }

        .timestamp {
            color: #a3a6aa;
            font-size: 12px;
            font-weight: 400;
        }

        .message-text {
            color: #dcddde;
            font-size: 15px;
            line-height: 1.5;
            word-wrap: break-word;
            white-space: pre-wrap;
        }

        .message-text em {
            color: #a3a6aa;
            font-style: italic;
        }

        .attachments {
            margin-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .attachment {
            background: #2b2d31;
            border: 1px solid #1e1f22;
            border-radius: 4px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
        }

        .attachment-icon {
            font-size: 24px;
        }

        .attachment-name {
            color: #00aff4;
            font-size: 14px;
            font-weight: 500;
        }

        .embeds {
            margin-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .embed {
            background: #2b2d31;
            border-left: 4px solid #5865f2;
            border-radius: 4px;
            padding: 12px 16px;
            max-width: 520px;
        }

        .embed-title {
            font-weight: 600;
            color: #ffffff;
            font-size: 15px;
            margin-bottom: 8px;
        }

        .embed-description {
            color: #dbdee1;
            font-size: 14px;
            line-height: 1.5;
        }

        .footer {
            padding: 30px;
            text-align: center;
            color: #a3a6aa;
            font-size: 13px;
            background: #202225;
            border-top: 1px solid #1e1f22;
        }

        .stats {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-bottom: 15px;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
        }

        .stat-value {
            font-size: 24px;
            font-weight: 600;
            color: #5865f2;
        }

        .stat-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        @media (max-width: 768px) {
            body {
                padding: 10px;
            }

            .header {
                padding: 20px;
            }

            .header h1 {
                font-size: 24px;
            }

            .ticket-info {
                grid-template-columns: 1fr;
                gap: 15px;
            }

            .messages-container {
                padding: 15px;
            }

            .message {
                gap: 12px;
            }

            .avatar {
                width: 32px;
                height: 32px;
                font-size: 14px;
            }
        }

        @media print {
            body {
                background: white;
                color: black;
            }

            .container {
                box-shadow: none;
            }

            .message:hover {
                background: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Ticket Transcript</h1>
            <div class="ticket-info">
                <div class="info-item">
                    <div class="info-label">Ticket ID</div>
                    <div class="info-value">#${ticket._id}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">User</div>
                    <div class="info-value"><@${ticket.user_id}></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Closed By</div>
                    <div class="info-value">${escapeHtml(interaction.user.tag)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Created</div>
                    <div class="info-value">${new Date(ticket.created_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                })}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Closed</div>
                    <div class="info-value">${new Date().toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                })}</div>
                </div>
            </div>
        </div>
        <div class="messages-container">
`;

                let messageCount = 0;
                let totalAttachments = 0;
                let totalEmbeds = 0;

                sortedMessages.forEach(msg => {
                    if (!msg.author.bot) {
                        messageCount++;
                        totalAttachments += msg.attachments.size;
                        totalEmbeds += msg.embeds.length;

                        console.log(`🔍 [DEBUG] Processing message ${messageCount} from ${msg.author.username}:`, msg.content?.substring(0, 50) + '...');

                        // Get first letter of username for avatar
                        const avatarLetter = msg.author.username.charAt(0).toUpperCase();

                        htmlTranscript += `
            <div class="message">
                <div class="avatar">${avatarLetter}</div>
                <div class="message-content-wrapper">
                    <div class="message-header">
                        <span class="author">${escapeHtml(msg.author.username)}</span>
                        <span class="timestamp">${msg.createdAt.toLocaleString('en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                        })}</span>
                    </div>
                    <div class="message-text">${msg.content ? escapeHtml(msg.content) : '<em>No text content</em>'}</div>`;

                        // Add attachments
                        if (msg.attachments.size > 0) {
                            console.log(`🔍 [DEBUG] Message has ${msg.attachments.size} attachments`);
                            htmlTranscript += `<div class="attachments">`;
                            msg.attachments.forEach(attachment => {
                                htmlTranscript += `
                    <div class="attachment">
                        <div class="attachment-icon">📎</div>
                        <div class="attachment-name">${escapeHtml(attachment.name)}</div>
                    </div>`;
                            });
                            htmlTranscript += `</div>`;
                        }

                        // Add embeds
                        if (msg.embeds.length > 0) {
                            console.log(`🔍 [DEBUG] Message has ${msg.embeds.length} embeds`);
                            htmlTranscript += `<div class="embeds">`;
                            msg.embeds.forEach(embed => {
                                htmlTranscript += `<div class="embed">`;
                                if (embed.title) htmlTranscript += `<div class="embed-title">${escapeHtml(embed.title)}</div>`;
                                if (embed.description) htmlTranscript += `<div class="embed-description">${escapeHtml(embed.description)}</div>`;
                                htmlTranscript += `</div>`;
                            });
                            htmlTranscript += `</div>`;
                        }

                        htmlTranscript += `
                </div>
            </div>`;
                    }
                });

                console.log(`🔍 [DEBUG] Processed ${messageCount} non-bot messages`);

                // Calculate duration
                const createdDate = new Date(ticket.created_at);
                const closedDate = new Date();
                const durationMs = closedDate - createdDate;
                const durationMinutes = Math.floor(durationMs / 60000);
                const hours = Math.floor(durationMinutes / 60);
                const minutes = durationMinutes % 60;
                const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                htmlTranscript += `
        </div>
        <div class="footer">
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value">${messageCount}</div>
                    <div class="stat-label">Messages</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalAttachments}</div>
                    <div class="stat-label">Attachments</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${durationText}</div>
                    <div class="stat-label">Duration</div>
                </div>
            </div>
            <div>Transcript generated on ${new Date().toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'long'
                })}</div>
        </div>
    </div>
</body>
</html>`;

                transcript = Buffer.from(htmlTranscript, 'utf8');
                console.log('🔍 [DEBUG] Enhanced HTML transcript generated successfully, size:', transcript.length, 'bytes');

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
            console.error('Close command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while closing the ticket.',
                flags: 64
            });
        }
    }
};