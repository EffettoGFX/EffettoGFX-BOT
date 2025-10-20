const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup the bot configuration')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('transcript_channel')
                .setDescription('Channel where ticket transcripts will be sent')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(option =>
            option.setName('ticket_channel')
                .setDescription('Channel where users can open tickets')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption(option =>
            option.setName('review_role')
                .setDescription('Role who purchases products')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('ticket_category')
                .setDescription('Category where tickets will be created')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildCategory)
        )
        .addChannelOption(option =>
            option.setName('review_channel')
                .setDescription('Channel where reviews will be published')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
            option.setName('paypal_link')
                .setDescription('Paypal link to be sent to the user')
                .setRequired(false)

        ),

    async execute(interaction, db) {
        try {
            const transcriptChannel = interaction.options.getChannel('transcript_channel');
            const ticketChannel = interaction.options.getChannel('ticket_channel');
            const reviewRole = interaction.options.getRole('review_role');
            const ticketCategory = interaction.options.getChannel('ticket_category');
            const reviewChannel = interaction.options.getChannel('review_channel');
            const paypalLink = interaction.options.getString('paypal_link');
            // Save configuration to database
            await db.setConfig('transcript_channel', transcriptChannel.id);
            await db.setConfig('ticket_channel', ticketChannel.id);
            await db.setConfig('review_role', reviewRole.id);
            if (ticketCategory) {
                await db.setConfig('ticket_category', ticketCategory.id);
            }
            if (reviewChannel) {
                await db.setConfig('review_channel', reviewChannel.id);
            }
            if (paypalLink) {
                await db.setConfig('paypal_link', paypalLink);
            }

            // Create ticket channel embed
            const ticketEmbed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('🎫 Support Tickets')
                .setDescription('Need help? Open a support ticket and our staff will assist you!')
                .addFields(
                    { name: 'How to open a ticket', value: 'Use the `/ticket` command below', inline: false },
                    { name: 'What to include', value: '• Describe your issue clearly if you need help or tell us what you want to buy\n• Provide any relevant information\n• Be patient while waiting for staff', inline: false }
                )
                .setFooter({ text: 'Our staff will respond as soon as possible' })
                .setTimestamp();

            // Create button for opening tickets
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('open_ticket')
                        .setLabel('Open Ticket')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎫')
                );

            // Send embed to ticket channel
            await ticketChannel.send({
                embeds: [ticketEmbed],
                components: [row]
            });

            const setupEmbed = {
                color: 0x00ff00,
                title: '✅ Setup Complete',
                description: 'Bot configuration has been updated successfully!',
                fields: [
                    {
                        name: 'Transcript Channel',
                        value: `<#${transcriptChannel.id}>`,
                        inline: true
                    },
                    {
                        name: 'Ticket Channel',
                        value: `<#${ticketChannel.id}>`,
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString()
            };

            if (ticketCategory) {
                setupEmbed.fields.push({
                    name: 'Ticket Category',
                    value: `<#${ticketCategory.id}>`,
                    inline: true
                });
            }


            await interaction.reply({ embeds: [setupEmbed] });
        } catch (error) {
            console.error('Setup command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while setting up the bot configuration.',
                flags: 64
            });
        }
    }
};
