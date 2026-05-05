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

// FIX BUG: Helper untuk menangani bentrok format ID antara Web Admin dan Telegram Bot
function getSafeId(id) {
    // 1. Jika id adalah format ObjectId MongoDB yang valid (24 hex char)
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === String(id)) {
        return new ObjectId(id);
    }
    // 2. Jika id dari Telegram bot berbentuk angka timestamp (misal: 1710000000)
    if (!isNaN(id) && id !== null && id !== '') {
        return Number(id);
    }
    // 3. Fallback jika string biasa
    return id;
}

export default async function handler(req, res) {
    // 1. CEK KEAMANAN (Cegah orang asing masuk dan menghapus DB)
    const authHeader = req.headers['x-admin-pass'];
    if (authHeader !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized: Password Admin Salah!' });
    }

    try {
        const client = await connectToDatabase();
        const db = client.db('school_db'); // Menggunakan nama DB dari repo kamu

        // MENGAMBIL DATA (Khusus yang tidak ada di /api/content)
        if (req.method === 'GET') {
            const { action } = req.query;
            if (action === 'cloud_config') {
                const activeCloud = await db.collection('cloudinary_accounts').findOne({ active: true });
                return res.status(200).json(activeCloud || { name: '', preset: '' });
            }
            return res.status(400).json({ error: 'Action tidak valid' });
        }

        // MENAMBAH DATA BARU (CREATE)
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
            if (type === 'cloud_config') {
                // Nonaktifkan semua akun cloudinary sebelumnya, lalu buat yang baru
                await db.collection('cloudinary_accounts').updateMany({}, { $set: { active: false } });
                const result = await db.collection('cloudinary_accounts').insertOne({ 
                    name: data.name, 
                    preset: data.preset, 
                    active: true, 
                    date: new Date() 
                });
                return res.status(200).json(result);
            }
        }

        // MENGEDIT DATA (UPDATE)
        if (req.method === 'PUT') {
            const { type, id, data } = req.body;
            if (!id) return res.status(400).json({ error: 'ID is required' });
            
            // Hapus _id dari payload agar MongoDB tidak error immutable field saat replace
            if (data._id) {
                delete data._id;
            }

            const safeQueryId = getSafeId(id);

            if (type === 'news') {
                const result = await db.collection('news').updateOne({ _id: safeQueryId }, { $set: data });
                return res.status(200).json(result);
            }
            if (type === 'videos') {
                const result = await db.collection('videos').updateOne({ _id: safeQueryId }, { $set: data });
                return res.status(200).json(result);
            }
        }

        // MENGHAPUS DATA (DELETE)
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
        }

        return res.status(405).json({ error: 'Method Not Allowed' });
    } catch (error) {
        console.error('API Admin Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
