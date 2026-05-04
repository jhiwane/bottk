const axios = require('axios');
const FormData = require('form-data');

// Fungsi Remove Background (Tetap sama)
async function removeBackground(imageUrl, apiKey) {
    if (!apiKey) { console.error("❌ API Key Null"); return null; }
    try {
        const formData = new FormData();
        formData.append('image_url', imageUrl);
        formData.append('size', 'auto');
        const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
            headers: { 'X-Api-Key': apiKey, ...formData.getHeaders() },
            responseType: 'arraybuffer',
            timeout: 15000
        });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) { return null; }
}

// Fungsi Upload Cloudinary (UPGRADE: SUPPORT RAW FILES)
async function uploadToCloudinary(fileSource, cloudName, uploadPreset, isBase64 = false) {
    if (!cloudName || !uploadPreset) return null;

    try {
        const formData = new FormData();
        // Jika base64 (dari remove bg)
        if (isBase64) {
            formData.append('file', `data:image/png;base64,${fileSource}`);
        } else {
            // Jika URL file (dari Telegram)
            formData.append('file', fileSource);
        }
        
        formData.append('upload_preset', uploadPreset);

        // PERUBAHAN PENTING DISINI:
        // Ganti '/image/upload' menjadi '/auto/upload'
        // 'auto' artinya Cloudinary akan mendeteksi apakah ini Gambar, Video, atau File (HTML/PDF)
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
        
        console.log(`⏳ Uploading ke ${cloudName}...`);

        const res = await axios.post(url, formData, { 
            headers: formData.getHeaders ? formData.getHeaders() : {},
            timeout: 30000 // Naikkan timeout buat jaga-jaga file besar
        });
        
        console.log("✅ Sukses:", res.data.secure_url);
        return res.data.secure_url;

    } catch (error) {
        console.error("❌ Gagal Upload:", error.message);
        if (error.response) console.error("Detail:", JSON.stringify(error.response.data));
        return null;
    }
}

module.exports = { removeBackground, uploadToCloudinary };
