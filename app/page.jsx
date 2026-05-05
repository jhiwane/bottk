const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
// Password dari Vercel Env, fallback ke 'admin123'
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; 
let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;
    return client;
}

// Helper ID agar sinkron dengan Telegram bot dan MongoDB
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
    const authHeader = req.headers['x-admin-pass'];
    if (authHeader !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized: Password Admin Salah!' });
    }

    try {
        const client = await connectToDatabase();
        const db = client.db('school_db'); 

        // --- METHOD GET (BACA DATA) ---
        if (req.method === 'GET') {
            const { action } = req.query;
            if (action === 'cloud_config') {
                const accounts = await db.collection('cloudinary_accounts').find({}).sort({_id: -1}).toArray();
                return res.status(200).json(accounts || []);
            }
            if (action === 'config') {
                // BUG FIX: Menggunakan collection 'config' agar sinkron dengan Web UI (api/content.js)
                const configData = await db.collection('config').findOne({ _id: 'main' });
                return res.status(200).json(configData || { heroImages: [], profileImages: [] });
            }
            if (action === 'tools') {
                const toolsData = await db.collection('tools').find({}).sort({_id: -1}).toArray();
                return res.status(200).json(toolsData || []);
            }
            return res.status(400).json({ error: 'Action tidak valid' });
        }

        // --- METHOD POST (TAMBAH DATA BARU) ---
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
            if (type === 'config') {
                // Menyimpan Hero & Profile ke _id: 'main'
                await db.collection('config').updateOne(
                    { _id: 'main' }, 
                    { $set: data }, 
                    { upsert: true }
                );
                return res.status(200).json({ success: true });
            }
            if (type === 'cloud_config') {
                // Jika ini akun pertama, otomatis jadi aktif
                const count = await db.collection('cloudinary_accounts').countDocuments();
                const isActive = count === 0;
                
                const result = await db.collection('cloudinary_accounts').insertOne({ 
                    name: data.name, 
                    preset: data.preset, 
                    active: isActive, 
                    date: new Date() 
                });
                return res.status(200).json(result);
            }
        }

        // --- METHOD PUT (EDIT DATA) ---
        if (req.method === 'PUT') {
            const { type, id, data } = req.body;
            if (!id) return res.status(400).json({ error: 'ID is required' });
            
            if (data && data._id) delete data._id; // Hapus _id agar tidak error immutable field
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
            if (type === 'cloud_activate') {
                // Matikan semua akun, lalu aktifkan yang dipilih
                await db.collection('cloudinary_accounts').updateMany({}, { $set: { active: false } });
                await db.collection('cloudinary_accounts').updateOne({ _id: safeQueryId }, { $set: { active: true } });
                return res.status(200).json({ success: true });
            }
        }

        // --- METHOD DELETE (HAPUS PERMANEN) ---
        if (req.method === 'DELETE') {
            const { type, id } = req.body;
            if (!id) return res.status(400).json({ error: 'ID is required' });

            const safeQueryId = getSafeId(id);

            if (type === 'news') {
                return res.status(200).json(await db.collection('news').deleteOne({ _id: safeQueryId }));
            }
            if (type === 'videos') {
                return res.status(200).json(await db.collection('videos').deleteOne({ _id: safeQueryId }));
            }
            if (type === 'tools') {
                return res.status(200).json(await db.collection('tools').deleteOne({ _id: safeQueryId }));
            }
            if (type === 'cloud_config') {
                return res.status(200).json(await db.collection('cloudinary_accounts').deleteOne({ _id: safeQueryId }));
            }
        }

        return res.status(405).json({ error: 'Method Not Allowed' });
    } catch (error) {
        console.error('API Admin Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
