const axios = require('axios');
const FormData = require('form-data');

// Fungsi Remove Background (Pakai remove.bg)
async function removeBackground(imageUrl, apiKey) {
    if (!apiKey) {
        console.error("❌ RemoveBG Error: API Key belum disetting.");
        return null;
    }
    try {
        const formData = new FormData();
        formData.append('image_url', imageUrl);
        formData.append('size', 'auto');

        const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
            headers: { 'X-Api-Key': apiKey, ...formData.getHeaders() },
            responseType: 'arraybuffer',
            timeout: 15000 // Naikkan ke 15 detik untuk aman
        });
        
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
        const msg = error.response ? error.response.data.toString() : error.message;
        console.error("❌ RemoveBG Gagal:", msg);
        return null;
    }
}

// Fungsi Upload ke Cloudinary (VERSI FIX: TANPA TRANSFORMATION)
async function uploadToCloudinary(fileSource, cloudName, uploadPreset, isBase64 = false) {
    // 1. Validasi Akun
    if (!cloudName || !uploadPreset) {
        console.error("❌ Cloudinary Error: Nama Cloud atau Preset belum diisi.");
        return null;
    }

    try {
        const formData = new FormData();
        if (isBase64) {
            formData.append('file', `data:image/png;base64,${fileSource}`);
        } else {
            formData.append('file', fileSource);
        }
        
        // PENTING: Preset harus BENAR-BENAR ada di dashboard Cloudinary
        formData.append('upload_preset', uploadPreset); 

        // ❌ SAYA HAPUS BAGIAN INI KARENA DITOLAK CLOUDINARY UNSIGNED:
        // formData.append("transformation", "w_1000,q_auto,f_auto,c_limit"); 

        const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        
        console.log(`⏳ Uploading ke: ${cloudName} dengan preset: ${uploadPreset}...`);

        const res = await axios.post(url, formData, { 
            headers: formData.getHeaders ? formData.getHeaders() : {},
            timeout: 20000 // 20 Detik (Internet lambat aman)
        });
        
        console.log("✅ Sukses:", res.data.secure_url);
        return res.data.secure_url;

    } catch (error) {
        // Log Error Lengkap
        if (error.response) {
            // Ini pesan error ASLI dari Cloudinary (Penting dibaca di Logs Vercel)
            console.error("❌ CLOUDINARY REJECT:", JSON.stringify(error.response.data));
        } else if (error.code === 'ECONNABORTED') {
            console.error("❌ TIMEOUT: Koneksi terlalu lambat.");
        } else {
            console.error("❌ ERROR LAIN:", error.message);
        }
        return null;
    }
}

module.exports = { removeBackground, uploadToCloudinary };
