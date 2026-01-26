const { MongoClient, ObjectId } = require('mongodb');

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
    const { id } = req.query;
    if (!id) return res.status(400).send('ID null');

    try {
        const client = await connectToDatabase();
        const db = client.db('school_db');
        const toolsCol = db.collection('tools');

        const tool = await toolsCol.findOne({ _id: new ObjectId(id) });

        if (!tool) return res.status(404).send('Not Found');

        if (tool.type === 'html_code') {
            res.setHeader('Content-Type', 'text/html');
            return res.send(tool.content);
        } else {
            return res.redirect(tool.url);
        }
    } catch (e) {
        res.status(500).send('Server Error');
    }
}
