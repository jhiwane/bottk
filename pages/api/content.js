const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');

    if (req.method === 'GET') {
        try {
            // PENTING: Pakai koneksi cached, JANGAN di-close
            const client = await connectToDatabase();
            const db = client.db('school_db');
            
            const config = await db.collection('config').findOne({ _id: 'main' });
            const news = await db.collection('news').find({}).sort({_id:-1}).toArray();
            const videos = await db.collection('videos').find({}).sort({_id:-1}).toArray();
            const tools = await db.collection('tools').find({}).sort({_id:-1}).toArray();

            let finalConfig = config || {};
            if (!finalConfig.heroImages) finalConfig.heroImages = ["https://files.catbox.moe/3tf995.png"];
            if (!finalConfig.profileImages) finalConfig.profileImages = ["https://files.catbox.moe/3tf995.png"];
            if (!finalConfig.logoUrl) finalConfig.logoUrl = "https://files.catbox.moe/dlbpqp.png";

            res.status(200).json({ config: finalConfig, news, videos, tools });
        } catch (e) {
            console.error("DB Error:", e);
            res.status(500).json({ error: 'Database Error' });
        }
        // JANGAN ADA client.close() DISINI
    }
}
