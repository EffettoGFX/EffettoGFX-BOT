module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
        console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} guilds`);
        console.log(`👥 Serving ${client.users.cache.size} users`);

        // Set bot status
        client.user.setActivity('EFFETTO Productions', { type: 'WATCHING' });
    }
};
