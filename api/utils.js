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
            timeout: 9000 // Batas waktu 9 detik agar tidak hang
        });
        
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
        // Cek error detail dari Remove.bg
        const msg = error.response ? error.response.data.toString() : error.message;
        console.error("❌ RemoveBG Gagal:", msg);
        return null;
    }
}

// Fungsi Upload ke Cloudinary (Versi Anti-Hang)
async function uploadToCloudinary(fileSource, cloudName, uploadPreset, isBase64 = false) {
    // 1. Validasi Akun Dulu
    if (!cloudName || !uploadPreset) {
        console.error("❌ Cloudinary Error: Nama Cloud atau Preset belum diisi di Database.");
        return null;
    }

    try {
        const formData = new FormData();
        if (isBase64) {
            formData.append('file', `data:image/png;base64,${fileSource}`);
        } else {
            formData.append('file', fileSource);
        }
        formData.append('upload_preset', uploadPreset);
        
        // Optimasi Gambar: Resize ke lebar 1000px, Kualitas Auto (Biar enteng & cepat upload)
        formData.append("transformation", "w_1000,q_auto,f_auto,c_limit"); 

        const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        
        console.log(`⏳ Memulai upload ke akun: ${cloudName}...`);

        const res = await axios.post(url, formData, { 
            headers: formData.getHeaders ? formData.getHeaders() : {},
            timeout: 9000 // PENTING: Batas waktu 9 detik. Jika internet lambat, dia akan error (bukan hang).
        });
        
        console.log("✅ Upload Sukses:", res.data.secure_url);
        return res.data.secure_url;

    } catch (error) {
        // 2. Tangkap Error Spesifik Cloudinary
        let errorMsg = "Unknown Error";
        
        if (error.response) {
            // Error dari Cloudinary (Misal: Limit habis, Preset salah)
            console.error("❌ Cloudinary Menolak:", JSON.stringify(error.response.data));
            errorMsg = error.response.data.error.message; 
        } else if (error.code === 'ECONNABORTED') {
            // Error Timeout (Internet lambat / File terlalu besar)
            console.error("❌ Upload Timeout (Lebih dari 9 detik)");
            errorMsg = "Koneksi Timeout (Gambar terlalu besar/Internet lambat)";
        } else {
            console.error("❌ Error Jaringan:", error.message);
            errorMsg = error.message;
        }
        
        return null;
    }
}

module.exports = { removeBackground, uploadToCloudinary };
