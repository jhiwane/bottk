const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'GET') {
        try {
            await client.connect();
            const db = client.db('school_db');
            
            const config = await db.collection('config').findOne({ _id: 'main' });
            const news = await db.collection('news').find({}).sort({_id:-1}).limit(3).toArray();
            const videos = await db.collection('videos').find({}).sort({_id:-1}).limit(5).toArray();

            res.status(200).json({ config, news, videos });
        } catch (e) {
            res.status(500).json({ error: 'DB Error' });
        } finally {
            await client.close();
        }
    }
}
