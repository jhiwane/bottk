const axios = require('axios');
const FormData = require('form-data');

// Fungsi Remove Background (Pakai remove.bg)
async function removeBackground(imageUrl, apiKey) {
    try {
        const formData = new FormData();
        formData.append('image_url', imageUrl);
        formData.append('size', 'auto');

        const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
            headers: { 'X-Api-Key': apiKey, ...formData.getHeaders() },
            responseType: 'arraybuffer'
        });
        
        // Return base64 agar bisa diupload ke Cloudinary
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
        console.error("Remove BG Error:", error.response?.data?.toString());
        return null;
    }
}

// Fungsi Upload ke Cloudinary (Metode Unsigned / Tanpa Login API)
async function uploadToCloudinary(fileSource, cloudName, uploadPreset, isBase64 = false) {
    try {
        const formData = new FormData();
        if (isBase64) {
            formData.append('file', `data:image/png;base64,${fileSource}`);
        } else {
            formData.append('file', fileSource); // URL
        }
        formData.append('upload_preset', uploadPreset);

        const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        const res = await axios.post(url, formData, { headers: formData.getHeaders ? formData.getHeaders() : {} });
        
        return res.data.secure_url;
    } catch (error) {
        console.error("Cloudinary Error:", error.response?.data);
        return null;
    }
}

module.exports = { removeBackground, uploadToCloudinary };