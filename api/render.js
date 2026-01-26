const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // Ambil ID dari URL (contoh: /api/render?id=65a...)
    const { id } = req.query;

    if (!id) return res.status(400).send('ID Tool tidak ditemukan');

    try {
        await client.connect();
        const db = client.db('school_db');
        const toolsCol = db.collection('tools');

        // Cari data tool berdasarkan ID
        const tool = await toolsCol.findOne({ _id: new ObjectId(id) });

        if (!tool) return res.status(404).send('Tool/File tidak ditemukan di database');

        // PENTING: Jika tipe datanya HTML Content (disimpan di DB)
        if (tool.type === 'html_code') {
            // Beritahu browser bahwa ini adalah file HTML, bukan text biasa
            res.setHeader('Content-Type', 'text/html');
            // Tampilkan isinya
            return res.send(tool.content);
        } 
        
        // Jika tipe link biasa (Google Form dll), redirect saja
        else {
            return res.redirect(tool.url);
        }

    } catch (e) {
        console.error(e);
        res.status(500).send('Terjadi kesalahan server saat memuat tool.');
    } finally {
        await client.close();
    }
}
