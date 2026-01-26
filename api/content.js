const { MongoClient } = require('mongodb');

// Pastikan URI MongoDB diambil dari Environment Variables
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // Header agar bisa diakses dari mana saja (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Cache Control: Data dianggap segar selama 1 detik, tapi boleh pakai data lama di background
    // Ini agar saat reset di bot, web langsung update tanpa clear cache browser
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');

    if (req.method === 'GET') {
        try {
            await client.connect();
            const db = client.db('school_db');
            
            // 1. Ambil Config (Hero, Profil, Mascot, Info Teks)
            const config = await db.collection('config').findOne({ _id: 'main' });
            
            // 2. Ambil Berita (Urutkan dari yang terbaru)
            const news = await db.collection('news').find({}).sort({_id:-1}).toArray();
            
            // 3. Ambil Video (Urutkan dari yang terbaru)
            const videos = await db.collection('videos').find({}).sort({_id:-1}).toArray();

            // 4. Ambil Tools / Aplikasi Web (Urutkan dari yang terbaru) - FITUR BARU
            const tools = await db.collection('tools').find({}).sort({_id:-1}).toArray();

            // Setup Default Config jika kosong (Fallback)
            let finalConfig = config || {};
            if (!finalConfig.heroImages) finalConfig.heroImages = ["https://files.catbox.moe/3tf995.png"];
            if (!finalConfig.profileImages) finalConfig.profileImages = ["https://files.catbox.moe/3tf995.png"];
            if (!finalConfig.logoUrl) finalConfig.logoUrl = "https://files.catbox.moe/dlbpqp.png";

            // Kirim Response JSON Lengkap
            res.status(200).json({ 
                config: finalConfig, 
                news: news, 
                videos: videos,
                tools: tools 
            });

        } catch (e) {
            console.error("Database Error:", e);
            res.status(500).json({ error: 'Gagal mengambil data dari Database' });
        } finally {
            // Selalu tutup koneksi agar tidak memory leak
            await client.close();
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
