const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('paypal')
        .setDescription('Send the paypal link to the user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, db) {
        try {

            const paypalLink = await db.getConfig('paypal_link');

            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('💰 Paypal Link')
                .setDescription(`** GRAZIE PER IL TUO ACQUISTO!**\n\nPer completare correttamente la procedura, segui attentamente questi passaggi:\n\n1️⃣ Clicca su questo link 👉 [PAYPAL](${paypalLink})\n2️⃣ Inserisci **l’importo esatto** relativo al tuo acquisto\n3️⃣ Seleziona l’opzione **“Amici e parenti”**\n\n  ⚠️ ATTENZIONE: Se selezioni una modalità diversa, **non ci assumeremo alcuna responsabilità** e **il versamento non verrà considerato valido**.\n\n4️⃣ Dopo il pagamento, **allega uno screen come prova** per velocizzare la verifica e l'elaborazione dell’ordine ✅\nGrazie per aver scelto il nostro shop! 🛒`);

            await interaction.reply({
                embeds: [embed],
            });

        } catch (error) {
            console.error('Claim command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while executing the command.',
                flags: 64
            });
        }
    }
};
