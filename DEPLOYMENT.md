# Vercel Deployment Guide

This guide will help you deploy your Discord bot to Vercel with MongoDB Atlas.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **MongoDB Atlas Account**: Sign up at [mongodb.com/atlas](https://mongodb.com/atlas)
3. **Discord Bot**: Create a bot at [discord.com/developers/applications](https://discord.com/developers/applications)

## Step 1: Set up MongoDB Atlas

1. **Create a new cluster** in MongoDB Atlas
2. **Create a database user** with read/write permissions
3. **Whitelist your IP** (or use 0.0.0.0/0 for all IPs)
4. **Get your connection string** from the "Connect" button
5. **Replace `<password>` and `<dbname>`** in the connection string

Example connection string:

```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/discord-bot?retryWrites=true&w=majority
```

## Step 2: Prepare Your Bot

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:

   ```bash
   cp env.example .env
   ```

3. **Configure your `.env` file**:
   ```
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here
   ADMIN_ROLE_ID=your_admin_role_id_here
   STAFF_ROLE_ID=your_staff_role_id_here
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/discord-bot?retryWrites=true&w=majority
   ```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel CLI

1. **Install Vercel CLI**:

   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:

   ```bash
   vercel login
   ```

3. **Deploy your project**:

   ```bash
   vercel
   ```

4. **Set environment variables**:
   ```bash
   vercel env add DISCORD_TOKEN
   vercel env add CLIENT_ID
   vercel env add GUILD_ID
   vercel env add ADMIN_ROLE_ID
   vercel env add STAFF_ROLE_ID
   vercel env add MONGODB_URI
   ```

### Option B: Deploy via GitHub

1. **Push your code to GitHub**
2. **Connect your GitHub repo to Vercel**
3. **Set environment variables in Vercel dashboard**:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add all required variables

## Step 4: Configure Discord Bot

1. **Set bot permissions** in Discord Developer Portal:

   - `applications.commands`
   - `bot` with permissions:
     - Send Messages
     - Use Slash Commands
     - Manage Channels
     - Read Message History
     - Manage Roles

2. **Invite bot to your server** using the OAuth2 URL:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
   ```

## Step 5: Set up the Bot

1. **Use `/setup` command** to configure:

   ```
   /setup transcript_channel:#transcripts ticket_category:Tickets
   ```

2. **Add products** for review:

   ```
   /addproduct "Premium Package"
   /addproduct "Basic Package"
   ```

3. **Authorize users** to leave reviews:
   ```
   /authorizereview @user
   ```

## Environment Variables Reference

| Variable        | Description                                  | Required |
| --------------- | -------------------------------------------- | -------- |
| `DISCORD_TOKEN` | Your bot token from Discord Developer Portal | ✅       |
| `CLIENT_ID`     | Your bot's client ID                         | ✅       |
| `GUILD_ID`      | Your server's ID (for testing)               | ❌       |
| `ADMIN_ROLE_ID` | Role ID for admin commands                   | ✅       |
| `STAFF_ROLE_ID` | Role ID for staff commands                   | ✅       |
| `MONGODB_URI`   | MongoDB Atlas connection string              | ✅       |

## Troubleshooting

### Common Issues

1. **Bot not responding**:

   - Check if environment variables are set correctly
   - Verify bot token is valid
   - Ensure bot has proper permissions

2. **Database connection errors**:

   - Verify MongoDB URI is correct
   - Check if IP is whitelisted in MongoDB Atlas
   - Ensure database user has proper permissions

3. **Slash commands not appearing**:
   - Wait a few minutes for commands to sync
   - Check if bot has `applications.commands` scope
   - Verify CLIENT_ID is correct

### Vercel-Specific Issues

1. **Function timeout**:

   - Vercel has a 10-second timeout for hobby plans
   - Consider upgrading to Pro plan for longer timeouts
   - Optimize your code to reduce execution time

2. **Cold starts**:
   - First request might be slower due to cold start
   - Consider using Vercel Pro for better performance

## Monitoring

1. **Vercel Dashboard**: Monitor function executions and errors
2. **MongoDB Atlas**: Monitor database performance and usage
3. **Discord Bot**: Check bot status and command usage

## Scaling

- **Vercel Pro**: For production use with better performance
- **MongoDB Atlas M10+**: For production database needs
- **Multiple regions**: Deploy to multiple Vercel regions for global performance

## Security Best Practices

1. **Environment Variables**: Never commit sensitive data to Git
2. **MongoDB Security**: Use strong passwords and IP whitelisting
3. **Discord Permissions**: Use minimal required permissions
4. **Rate Limiting**: Implement rate limiting for bot commands

## Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **MongoDB Atlas Documentation**: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- **Discord.js Documentation**: [discord.js.org](https://discord.js.org)
