const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Open a new support ticket'),

    async execute(interaction, db) {
        try {
            const userId = interaction.user.id;
            const guild = interaction.guild;

            // Check if user already has an open ticket
            const existingTicket = await db.getTicketByChannel(interaction.channel.id);
            if (existingTicket && existingTicket.status === 'open') {
                return await interaction.reply({
                    content: '❌ You already have an open ticket in this channel!',
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
                type: ChannelType.GuildText,
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
            console.error('Ticket command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while creating your ticket.',
                flags: 64
            });
        }
    }
};
