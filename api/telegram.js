const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const { removeBackground, uploadToCloudinary } = require('./utils');

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;
const adminId = process.env.ADMIN_TELEGRAM_ID;

const bot = new TelegramBot(token);
const client = new MongoClient(mongoUri);

// --- MENU KEYBOARD ---
const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📸 Upload Foto', '📰 Tulis Berita'],
            ['🎥 Tambah Video', '⚙️ Kelola Cloudinary'],
            ['🔄 Ganti Logo/Hero', '❓ Bantuan']
        ],
        resize_keyboard: true
    }
};

const cloudMenu = {
    reply_markup: {
        keyboard: [
            ['➕ Tambah Akun Cloud', 'list_cloud_accounts'],
            ['🔑 Set Remove.bg Key', '🔙 Kembali']
        ],
        resize_keyboard: true
    }
};

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const update = req.body;
        if (!update.message) return res.send('ok');

        const msg = update.message;
        const chatId = msg.chat.id;
        const text = msg.text;

        // Security Check
        if (String(msg.from.id) !== String(adminId)) {
            await bot.sendMessage(chatId, "⛔ Anda bukan Admin!");
            return res.send('ok');
        }

        await client.connect();
        const db = client.db('school_db');
        const stateCol = db.collection('bot_state');
        const configCol = db.collection('config');
        const cloudCol = db.collection('cloudinary_accounts');

        // Ambil state user saat ini
        let userState = await stateCol.findOne({ _id: chatId }) || {};

        // --- 1. LOGIC STATE HANDLER (Jika sedang menunggu input) ---
        
        // A. Menambah Akun Cloudinary
        if (userState.step === 'wait_cloud_name') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_preset', temp_name: text } });
            await bot.sendMessage(chatId, "Oke. Sekarang kirim **Upload Preset** (Unsigned) dari akun tersebut:");
            return res.send('ok');
        }
        if (userState.step === 'wait_cloud_preset') {
            await cloudCol.insertOne({
                name: userState.temp_name,
                preset: text,
                active: true, // Auto active
                date: new Date()
            });
            // Matikan akun lain
            await cloudCol.updateMany({ name: { $ne: userState.temp_name } }, { $set: { active: false } });
            
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, `✅ Akun Cloudinary **${userState.temp_name}** berhasil disimpan dan diaktifkan!`, mainMenu);
            return res.send('ok');
        }

        // B. Set Remove.bg Key
        if (userState.step === 'wait_removebg_key') {
            await configCol.updateOne({ _id: 'removebg' }, { $set: { key: text } }, { upsert: true });
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ API Key Remove.bg tersimpan!", cloudMenu);
            return res.send('ok');
        }

        // C. Proses Upload Foto (Menunggu Konfirmasi Remove BG)
        if (userState.step === 'wait_upload_confirm' && text) {
            // Cek akun aktif
            const activeCloud = await cloudCol.findOne({ active: true });
            if (!activeCloud) {
                await bot.sendMessage(chatId, "⚠️ Belum ada akun Cloudinary aktif. Masuk menu 'Kelola Cloudinary' dulu.", mainMenu);
                await stateCol.deleteOne({ _id: chatId });
                return res.send('ok');
            }

            let finalImageUrl = userState.file_url;
            await bot.sendMessage(chatId, "⏳ Memproses foto... (Mohon tunggu)");

            // Logic Remove Background
            if (text.toLowerCase() === 'ya' || text === '✅ Ya, Hapus BG') {
                const bgKey = await configCol.findOne({ _id: 'removebg' });
                if (!bgKey) {
                    await bot.sendMessage(chatId, "⚠️ API Key Remove.bg belum disetting. Upload original.");
                } else {
                    const base64Img = await removeBackground(userState.file_url, bgKey.key);
                    if (base64Img) {
                        // Upload Base64 ke Cloudinary
                        const resCloud = await uploadToCloudinary(base64Img, activeCloud.name, activeCloud.preset, true);
                        if (resCloud) finalImageUrl = resCloud;
                    } else {
                        await bot.sendMessage(chatId, "❌ Gagal hapus background. Upload original.");
                    }
                }
            } else {
                // Upload URL Biasa ke Cloudinary
                const resCloud = await uploadToCloudinary(userState.file_url, activeCloud.name, activeCloud.preset, false);
                if (resCloud) finalImageUrl = resCloud;
            }

            await bot.sendMessage(chatId, `✅ **SUKSES!**\n\nLink Foto:\n\`${finalImageUrl}\`\n\n(Salin link ini untuk berita/logo)`, { parse_mode: 'Markdown', ...mainMenu });
            await stateCol.deleteOne({ _id: chatId });
            return res.send('ok');
        }

        // --- 2. COMMAND HANDLER (Menu Utama) ---

        if (msg.photo) {
            const fileId = msg.photo[msg.photo.length - 1].file_id;
            const fileLink = await bot.getFileLink(fileId);
            
            // Simpan URL sementara di state
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_upload_confirm', file_url: fileLink } }, { upsert: true });
            
            const opts = {
                reply_markup: {
                    keyboard: [['✅ Ya, Hapus BG', '❌ Tidak, Original']],
                    one_time_keyboard: true,
                    resize_keyboard: true
                }
            };
            await bot.sendMessage(chatId, "📸 Foto diterima. Apakah ingin **Hapus Background** otomatis?", opts);
            return res.send('ok');
        }

        switch (text) {
            case '/start':
            case '🔙 Kembali':
                await bot.sendMessage(chatId, "👋 Hai Admin! Pilih menu:", mainMenu);
                break;

            case '⚙️ Kelola Cloudinary':
                const active = await cloudCol.findOne({ active: true });
                let msgInfo = active ? `🟢 Akun Aktif: *${active.name}*` : "🔴 Belum ada akun aktif.";
                await bot.sendMessage(chatId, msgInfo, { parse_mode: 'Markdown', ...cloudMenu });
                break;

            case '➕ Tambah Akun Cloud':
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_name' } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirimkan **Cloud Name** dari akun Cloudinary Anda:", { reply_markup: { remove_keyboard: true } });
                break;

            case '🔑 Set Remove.bg Key':
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_removebg_key' } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirimkan API Key dari remove.bg:", { reply_markup: { remove_keyboard: true } });
                break;
                
            case 'list_cloud_accounts':
                const accs = await cloudCol.find({}).toArray();
                if(accs.length === 0) {
                    await bot.sendMessage(chatId, "Belum ada akun.");
                } else {
                    let list = "daftar Akun:\n";
                    accs.forEach(a => list += `- ${a.name} (${a.active ? '✅ Aktif' : 'Pasif'})\n`);
                    await bot.sendMessage(chatId, list);
                }
                break;

            case '🎥 Tambah Video':
                await bot.sendMessage(chatId, "Gunakan format:\n`/video Judul | Deskripsi | Link_Youtube`", { parse_mode: 'Markdown' });
                break;
                
            case '📰 Tulis Berita':
                await bot.sendMessage(chatId, "Gunakan format:\n`/news Judul | Tanggal | Isi Berita | LinkFoto1,LinkFoto2`", { parse_mode: 'Markdown' });
                break;
                
            case '🔄 Ganti Logo/Hero':
                await bot.sendMessage(chatId, "Gunakan format:\n`/logo [Link_Foto]`\n`/hero [Link_Foto]`", { parse_mode: 'Markdown' });
                break;

            default:
                // Handle Command manual
                if (text.startsWith('/video ')) {
                    const args = text.replace('/video ', '').split('|');
                    if(args.length === 3) {
                        await db.collection('videos').insertOne({ judul: args[0].trim(), deskripsi: args[1].trim(), url: args[2].trim() });
                        await bot.sendMessage(chatId, "✅ Video disimpan!");
                    } else await bot.sendMessage(chatId, "❌ Format salah.");
                }
                else if (text.startsWith('/news ')) {
                    const args = text.replace('/news ', '').split('|');
                    if(args.length >= 4) {
                        const imgs = args[3].split(',').map(s => s.trim());
                        await db.collection('news').insertOne({
                            title: args[0].trim(), date: args[1].trim(), content: args[2].trim(), images: imgs,
                            gallery: imgs.map(img => ({ group: 'all', type: 'image', src: img, caption: 'Dokumentasi' }))
                        });
                        await bot.sendMessage(chatId, "✅ Berita diterbitkan!");
                    } else await bot.sendMessage(chatId, "❌ Format salah.");
                }
                else if (text.startsWith('/logo ')) {
                    await configCol.updateOne({ _id: 'main' }, { $set: { logoUrl: text.split(' ')[1] } }, { upsert: true });
                    await bot.sendMessage(chatId, "✅ Logo diupdate.");
                }
                else {
                    await bot.sendMessage(chatId, "Perintah tidak dikenali atau kirim foto untuk upload.");
                }
        }

        await client.close();
        res.send('ok');
    } else {
        res.send('Bot Ready');
    }
}