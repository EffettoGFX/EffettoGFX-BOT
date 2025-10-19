const { MongoClient } = require('mongodb');

class Database {
    constructor() {
        this.client = null;
        this.db = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            // Try environment variable first, then config.json
            const config = require('../config.json');
            const uri = process.env.MONGODB_URI || config.database.uri || 'mongodb://localhost:27017/discord-bot';
            this.client = new MongoClient(uri);

            await this.client.connect();
            this.db = this.client.db('Effetto');
            this.isConnected = true;
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.isConnected = false;
            console.log('🔌 Disconnected from MongoDB');
        }
    }

    // Ticket methods
    async createTicket(channelId, userId) {
        const tickets = this.db.collection('tickets');
        const ticket = {
            channel_id: channelId,
            user_id: userId,
            claimed_by: null,
            status: 'open',
            created_at: new Date(),
            closed_at: null,
            transcript_url: null
        };

        const result = await tickets.insertOne(ticket);
        return result.insertedId;
    }

    async getTicketByChannel(channelId) {
        const tickets = this.db.collection('tickets');
        return await tickets.findOne({ channel_id: channelId });
    }

    async updateTicketStatus(channelId, status, claimedBy = null) {
        const tickets = this.db.collection('tickets');
        const updateData = { status };

        if (claimedBy) {
            updateData.claimed_by = claimedBy;
        }

        if (status === 'closed') {
            updateData.closed_at = new Date();
        }

        return await tickets.updateOne(
            { channel_id: channelId },
            { $set: updateData }
        );
    }

    async setTranscriptUrl(channelId, url) {
        const tickets = this.db.collection('tickets');
        return await tickets.updateOne(
            { channel_id: channelId },
            { $set: { transcript_url: url } }
        );
    }

    // Review methods
    async createReview(userId, productName, rating, description) {
        const reviews = this.db.collection('reviews');
        const review = {
            user_id: userId,
            product_name: productName,
            rating: rating,
            description: description,
            status: 'pending',
            created_at: new Date(),
            approved_by: null,
            approved_at: null
        };

        const result = await reviews.insertOne(review);
        return result.insertedId;
    }

    async getReviewsByProduct(productName) {
        const reviews = this.db.collection('reviews');
        return await reviews.find({
            product_name: productName,
            status: 'approved'
        }).toArray();
    }

    async getAllReviews() {
        const reviews = this.db.collection('reviews');
        return await reviews.find({}).sort({ created_at: -1 }).toArray();
    }

    async updateReviewStatus(reviewId, status, approvedBy = null) {
        const reviews = this.db.collection('reviews');
        const updateData = { status };

        if (status === 'approved' && approvedBy) {
            updateData.approved_by = approvedBy;
            updateData.approved_at = new Date();
        }

        return await reviews.updateOne(
            { _id: reviewId },
            { $set: updateData }
        );
    }

    // Product methods
    async addProduct(name) {
        const products = this.db.collection('products');
        const product = {
            name: name,
            created_at: new Date()
        };

        const result = await products.insertOne(product);
        return result.insertedId;
    }

    async removeProduct(name) {
        const products = this.db.collection('products');
        return await products.deleteOne({ name: name });
    }

    async getAllProducts() {
        const products = this.db.collection('products');
        return await products.find({}).sort({ name: 1 }).toArray();
    }

    // Authorization methods
    async authorizeUser(userId, authorizedBy) {
        const authorizations = this.db.collection('review_authorizations');
        return await authorizations.updateOne(
            { user_id: userId },
            {
                $set: {
                    user_id: userId,
                    authorized_by: authorizedBy,
                    created_at: new Date()
                }
            },
            { upsert: true }
        );
    }

    async deauthorizeUser(userId) {
        const authorizations = this.db.collection('review_authorizations');
        return await authorizations.deleteOne({ user_id: userId });
    }

    async isUserAuthorized(userId) {
        const authorizations = this.db.collection('review_authorizations');
        const auth = await authorizations.findOne({ user_id: userId });
        return !!auth;
    }

    // Config methods
    async setConfig(key, value) {
        const config = this.db.collection('bot_config');
        return await config.updateOne(
            { key: key },
            { $set: { key: key, value: value } },
            { upsert: true }
        );
    }

    async getConfig(key) {
        const config = this.db.collection('bot_config');
        const result = await config.findOne({ key: key });
        return result ? result.value : null;
    }

    // Health check
    async ping() {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return await this.db.admin().ping();
    }
}

module.exports = Database;