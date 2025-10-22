const { MongoClient, ObjectId } = require('mongodb');

class Database {
    constructor() {
        this.client = null;
        this.db = null;
        this.isConnected = false;
        // Cache for products to avoid repeated database calls
        this.productsCache = null;
        this.cacheTimestamp = null;
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache expiry
    }

    async connect() {
        try {
            // Use environment variable for MongoDB URI
            const uri = process.env.MONGODB_URI;

            if (!uri) {
                throw new Error('MONGODB_URI environment variable is required but not set');
            }

            console.log('🔗 Connecting to MongoDB...');

            // Optimized connection options for better performance
            const options = {
                maxPoolSize: 10, // Maintain up to 10 socket connections
                serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
                minPoolSize: 2 // Maintain at least 2 socket connections
            };

            this.client = new MongoClient(uri, options);

            await this.client.connect();
            this.db = this.client.db('Effetto');
            this.isConnected = true;

            // Create indexes for better performance
            await this.createIndexes();

            console.log('✅ Connected to MongoDB with optimized settings');
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

    // Create database indexes for better performance
    async createIndexes() {
        try {
            console.log('📊 Creating database indexes...');

            // Products collection indexes
            const products = this.db.collection('products');
            await products.createIndex({ name: 1 }, { unique: true });
            await products.createIndex({ created_at: -1 });

            // Tickets collection indexes
            const tickets = this.db.collection('tickets');
            await tickets.createIndex({ channel_id: 1 }, { unique: true });
            await tickets.createIndex({ user_id: 1 });
            await tickets.createIndex({ status: 1 });
            await tickets.createIndex({ created_at: -1 });

            // Reviews collection indexes
            const reviews = this.db.collection('reviews');
            await reviews.createIndex({ user_id: 1 });
            await reviews.createIndex({ product_name: 1 });
            await reviews.createIndex({ status: 1 });
            await reviews.createIndex({ created_at: -1 });
            await reviews.createIndex({ product_name: 1, status: 1 });

            // Review authorizations collection indexes
            const authorizations = this.db.collection('review_authorizations');
            await authorizations.createIndex({ user_id: 1 }, { unique: true });

            // Bot config collection indexes
            const config = this.db.collection('bot_config');
            await config.createIndex({ key: 1 }, { unique: true });

            console.log('✅ Database indexes created successfully');
        } catch (error) {
            console.error('❌ Error creating database indexes:', error);
            // Don't throw error as indexes might already exist
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
        console.log(`✅ [SUCCESS] Review created with ID: ${result.insertedId}`);
        return result.insertedId;
    }

    async getReviewsByProduct(productName) {
        const reviews = this.db.collection('reviews');
        return await reviews.find({
            product_name: productName,
            status: 'approved'
        }).sort({ created_at: -1 }).toArray();
    }

    async getAllReviews() {
        const reviews = this.db.collection('reviews');
        return await reviews.find({}).sort({ created_at: -1 }).toArray();
    }

    async getReviewById(reviewId) {
        const reviews = this.db.collection('reviews');
        try {
            // Convert string ID to ObjectId for proper database query
            const objectId = new ObjectId(reviewId);
            return await reviews.findOne({ _id: objectId });
        } catch (error) {
            console.error('❌ [ERROR] Invalid review ID format:', reviewId, error);
            return null;
        }
    }

    async updateReviewStatus(reviewId, status, approvedBy = null) {
        const reviews = this.db.collection('reviews');
        const updateData = { status };

        if (status === 'approved' && approvedBy) {
            updateData.approved_by = approvedBy;
            updateData.approved_at = new Date();
        }

        try {
            // Convert string ID to ObjectId for proper database query
            const objectId = new ObjectId(reviewId);
            return await reviews.updateOne(
                { _id: objectId },
                { $set: updateData }
            );
        } catch (error) {
            console.error('❌ [ERROR] Invalid review ID format for update:', reviewId, error);
            throw error;
        }
    }

    // Product methods
    async addProduct(name, price = null, emoji = '📦') {
        const products = this.db.collection('products');
        const product = {
            name: name,
            price: price,
            emoji: emoji,
            created_at: new Date()
        };

        const result = await products.insertOne(product);

        // Invalidate cache when product is added
        this.invalidateProductsCache();

        return result.insertedId;
    }

    async removeProduct(name) {
        const products = this.db.collection('products');
        const result = await products.deleteOne({ name: name });

        // Invalidate cache when product is removed
        this.invalidateProductsCache();

        return result;
    }

    async getAllProducts() {
        // Check if cache is still valid
        if (this.productsCache && this.cacheTimestamp &&
            (Date.now() - this.cacheTimestamp) < this.cacheExpiry) {
            return this.productsCache;
        }

        const products = this.db.collection('products');
        // Use projection to only fetch needed fields and sort by name index
        const result = await products.find({}, {
            projection: { _id: 1, name: 1, price: 1, emoji: 1, created_at: 1 }
        }).sort({ name: 1 }).toArray();

        // Update cache
        this.productsCache = result;
        this.cacheTimestamp = Date.now();

        return result;
    }

    // Cache management methods
    invalidateProductsCache() {
        this.productsCache = null;
        this.cacheTimestamp = null;
    }

    // Optimized product existence check
    async productExists(name) {
        const products = this.db.collection('products');
        const product = await products.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } }, {
            projection: { _id: 1 }
        });
        return !!product;
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