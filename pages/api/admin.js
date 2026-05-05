const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
// Password diambil dari Vercel Env, jika belum diset pakai fallback 'admin123'
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; 
let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;
    return client;
}

// FIX BUG: Helper untuk menangani bentrok format ID MongoDB
function getSafeId(id) {
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === String(id)) {
        return new ObjectId(id);
    }
    if (!isNaN(id) && id !== null && id !== '') {
        return Number(id);
    }
    return id;
}

export default async function handler(req, res) {
    // CEK KEAMANAN
    const authHeader = req.headers['x-admin-pass'];
    if (authHeader !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized: Password Admin Salah!' });
    }

    try {
        const client = await connectToDatabase();
        const db = client.db('school_db'); 

        // MENGAMBIL DATA (GET)
        if (req.method === 'GET') {
            const { action } = req.query;
            if (action === 'cloud_config') {
                const activeCloud = await db.collection('cloudinary_accounts').findOne({ active: true });
                return res.status(200).json(activeCloud || { name: '', preset: '' });
            }
            if (action === 'hero') {
                const heroData = await db.collection('settings').findOne({ type: 'hero_images' });
                return res.status(200).json(heroData || { images: [] });
            }
            if (action === 'tools') {
                const toolsData = await db.collection('tools').find({}).sort({_id: -1}).toArray();
                return res.status(200).json(toolsData);
            }
            return res.status(400).json({ error: 'Action tidak valid' });
        }

        // MENAMBAH DATA BARU (POST)
        if (req.method === 'POST') {
            const { type, data } = req.body;
            if (type === 'news') {
                const result = await db.collection('news').insertOne(data);
                return res.status(200).json(result);
            }
            if (type === 'videos') {
                const result = await db.collection('videos').insertOne(data);
                return res.status(200).json(result);
            }
            if (type === 'tools') {
                const result = await db.collection('tools').insertOne(data);
                return res.status(200).json(result);
            }
            if (type === 'hero') {
                // Simpan array gambar hero ke dalam setting khusus
                await db.collection('settings').updateOne(
                    { type: 'hero_images' }, 
                    { $set: { images: data.images } }, 
                    { upsert: true }
                );
                return res.status(200).json({ success: true });
            }
            if (type === 'cloud_config') {
                await db.collection('cloudinary_accounts').updateMany({}, { $set: { active: false } });
                const result = await db.collection('cloudinary_accounts').insertOne({ 
                    name: data.name, preset: data.preset, active: true, date: new Date() 
                });
                return res.status(200).json(result);
            }
        }

        // MENGEDIT DATA (PUT)
        if (req.method === 'PUT') {
            const { type, id, data } = req.body;
            if (!id) return res.status(400).json({ error: 'ID is required' });
            
            if (data._id) delete data._id;
            const safeQueryId = getSafeId(id);

            if (type === 'news') {
                const result = await db.collection('news').updateOne({ _id: safeQueryId }, { $set: data });
                return res.status(200).json(result);
            }
            if (type === 'videos') {
                const result = await db.collection('videos').updateOne({ _id: safeQueryId }, { $set: data });
                return res.status(200).json(result);
            }
            if (type === 'tools') {
                const result = await db.collection('tools').updateOne({ _id: safeQueryId }, { $set: data });
                return res.status(200).json(result);
            }
        }

        // MENGHAPUS DATA (DELETE PERMANENT)
        if (req.method === 'DELETE') {
            const { type, id } = req.body;
            if (!id) return res.status(400).json({ error: 'ID is required' });

            const safeQueryId = getSafeId(id);

            if (type === 'news') {
                const result = await db.collection('news').deleteOne({ _id: safeQueryId });
                return res.status(200).json(result);
            }
            if (type === 'videos') {
                const result = await db.collection('videos').deleteOne({ _id: safeQueryId });
                return res.status(200).json(result);
            }
            if (type === 'tools') {
                const result = await db.collection('tools').deleteOne({ _id: safeQueryId });
                return res.status(200).json(result);
            }
        }

        return res.status(405).json({ error: 'Method Not Allowed' });
    } catch (error) {
        console.error('API Admin Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
