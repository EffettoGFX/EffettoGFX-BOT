# Discord Ticket & Review Bot

A comprehensive Discord bot built with Discord.js v14+ featuring a ticket system with HTML transcripts and a review management system.

## Features

### 🎫 Ticket System

- **HTML Transcripts**: Generate beautiful HTML transcripts using `discord-html-transcripts`
- **Slash Commands**: `/setup`, `/ticket`, `/claim`, `/close`, `/reopen`
- **Permission Control**: Role-based access control for staff operations
- **Auto-cleanup**: Automatic channel deletion after ticket closure

### ⭐ Review System

- **Star Ratings**: 1-5 star rating system
- **Product Management**: Add/remove products for review
- **Authorization System**: Control who can leave reviews
- **Staff Moderation**: Approve/reject reviews

### 🛍️ Product Management

- **Admin Commands**: `/addproduct`, `/removeproduct`, `/listproducts`
- **Dynamic Product Selection**: Products appear in review dropdowns
- **Database Persistence**: MongoDB database for data storage (Vercel compatible)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd discord-ticket-review-bot
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up MongoDB**

   - **Local**: Install MongoDB locally or use MongoDB Atlas (recommended)
   - **Atlas**: Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)

4. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

   Edit `.env` with your bot credentials:

   ```
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here
   ADMIN_ROLE_ID=your_admin_role_id_here
   STAFF_ROLE_ID=your_staff_role_id_here
   MONGODB_URI=mongodb://localhost:27017/discord-bot
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

## Bot Setup

1. **Set up environment variables**:

   - Copy `env.example` to `.env`
   - Fill in your bot token, client ID, and MongoDB connection string
   - Server-specific settings (channels, roles) are configured via `/setup` command

2. **Invite the bot** to your server with the following permissions:

   - Manage Channels
   - Send Messages
   - Read Message History
   - Use Slash Commands
   - Manage Roles (for permission checks)

3. **Configure the bot** using `/setup`:

   ```
   /setup transcript_channel:#transcripts ticket_channel:#support review_role:@Customer ticket_category:Tickets
   ```

   **Configuration Storage:**

   - **Environment Variables (.env)**: Bot token, database connection, role IDs
   - **Database (via /setup)**: Server-specific channels, roles, and settings

4. **Add products** for review:

   ```
   /addproduct "Premium Package"
   /addproduct "Basic Package"
   ```

5. **Authorize users** to leave reviews:
   ```
   /authorizereview @user
   ```

## Commands

### Ticket Commands

- `/setup` - Configure bot settings (Admin only)
- `/ticket` - Open a new support ticket
- `/claim` - Claim a ticket (Staff only)
- `/close` - Close a ticket and generate transcript (Staff only)
- `/reopen` - Reopen a closed ticket (Staff only)

### Review Commands

- `/reviews` - Leave a review (Authorized users only)
- `/addproduct` - Add a product for review (Admin only)
- `/removeproduct` - Remove a product (Admin only)
- `/listproducts` - List all products (Admin only)
- `/authorizereview` - Authorize user to leave reviews (Admin only)
- `/deauthorizereview` - Remove user's review authorization (Admin only)

## Database Schema

The bot uses MongoDB with the following collections:

- **tickets**: Stores ticket information and status
- **reviews**: Stores user reviews and ratings
- **products**: Stores available products for review
- **review_authorizations**: Stores authorized users
- **bot_config**: Stores bot configuration settings

## Vercel Deployment

This bot is fully compatible with Vercel deployment. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Vercel Setup:

1. Connect your GitHub repository to Vercel
2. Set up MongoDB Atlas (free tier available)
3. Configure environment variables in Vercel dashboard
4. Deploy!

## File Structure

```
discord-ticket-review-bot/
├── commands/           # Slash command handlers
│   ├── setup.js
│   ├── ticket.js
│   ├── claim.js
│   ├── close.js
│   ├── reopen.js
│   ├── reviews.js
│   ├── addProduct.js
│   ├── removeProduct.js
│   ├── listProducts.js
│   ├── authorizeReview.js
│   └── deauthorizeReview.js
├── events/            # Event handlers
│   ├── ready.js
│   ├── interactionCreate.js
│   └── messageCreate.js
├── database/          # Database module
│   └── database.js
├── index.js           # Main bot file
├── package.json       # Dependencies
├── .env               # Environment variables (create from env.example)
└── README.md          # This file
```

## Permissions

The bot requires the following Discord permissions:

- **Manage Channels**: Create/delete ticket channels
- **Send Messages**: Send messages and embeds
- **Read Message History**: Access message history for transcripts
- **Use Slash Commands**: Execute slash commands
- **Manage Roles**: Check user roles for permissions

## Troubleshooting

### Common Issues

1. **Bot not responding to commands**

   - Check if the bot has the required permissions
   - Verify the bot token is correct
   - Ensure slash commands are registered

2. **Transcript generation fails**

   - Check if the transcript channel is properly configured
   - Verify the bot has permission to send files in the transcript channel

3. **Database errors**
   - Verify MongoDB connection string is correct
   - Check if MongoDB Atlas cluster is running
   - Ensure database user has proper permissions

### Logs

The bot logs important events to the console. Check the console output for error messages and debugging information.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on the repository or contact the development team.
