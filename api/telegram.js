const TelegramBot = require('node-telegram-bot-api');
const { MongoClient, ObjectId } = require('mongodb');
const { removeBackground, uploadToCloudinary } = require('./utils');

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;
const adminId = process.env.ADMIN_TELEGRAM_ID;

const bot = new TelegramBot(token);
const client = new MongoClient(mongoUri);

// --- KEYBOARDS ---
const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📰 Tambah Berita', '🎥 Tambah Video'],
            ['✏️ Edit/Hapus Konten', '🖼️ Atur Hero/Profil'],
            ['📸 Upload Tools', '❓ Bantuan']
        ],
        resize_keyboard: true
    }
};

const cancelMenu = {
    reply_markup: {
        keyboard: [['❌ Batal']],
        resize_keyboard: true
    }
};

// Helper untuk membuat tombol list (Edit/Hapus)
const createListKeyboard = (items, type) => {
    // type: 'n' (news), 'v' (video)
    return {
        inline_keyboard: items.map(item => {
            const label = (item.title || item.judul || "Tanpa Judul").substring(0, 30);
            return [{ text: label, callback_data: `sel_${type}_${item._id}` }];
        })
    };
};

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const update = req.body;
        if (!update.message && !update.callback_query) return res.send('ok');

        const msg = update.message || update.callback_query.message;
        const chatId = msg.chat.id;
        const text = update.message ? update.message.text : null;
        const fromId = update.message ? update.message.from.id : update.callback_query.from.id;

        // 1. Security Check
        if (String(fromId) !== String(adminId)) {
            await bot.sendMessage(chatId, "⛔ Maaf, Anda bukan Admin.");
            return res.send('ok');
        }

        await client.connect();
        const db = client.db('school_db');
        const stateCol = db.collection('bot_state');
        const newsCol = db.collection('news');
        const videoCol = db.collection('videos');
        const configCol = db.collection('config');
        const cloudCol = db.collection('cloudinary_accounts');

        let userState = await stateCol.findOne({ _id: chatId }) || {};

        // --- 2. HANDLER BATAL / START ---
        if (text === '❌ Batal' || text === '/start') {
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "Kembali ke menu utama.", mainMenu);
            return res.send('ok');
        }

        // --- 3. CALLBACK QUERY (Logic Klik Tombol Inline) ---
        if (update.callback_query) {
            const data = update.callback_query.data;
            await bot.answerCallbackQuery(update.callback_query.id);

            // A. MENU EDIT LIST
            if (data === 'list_news') {
                const items = await newsCol.find({}).sort({_id:-1}).limit(5).toArray();
                if(items.length === 0) await bot.sendMessage(chatId, "Belum ada berita.");
                else await bot.sendMessage(chatId, "Pilih Berita:", { reply_markup: createListKeyboard(items, 'n') });
            }
            if (data === 'list_videos') {
                const items = await videoCol.find({}).sort({_id:-1}).limit(5).toArray();
                if(items.length === 0) await bot.sendMessage(chatId, "Belum ada video.");
                else await bot.sendMessage(chatId, "Pilih Video:", { reply_markup: createListKeyboard(items, 'v') });
            }

            // B. SELECT ITEM
            if (data.startsWith('sel_')) {
                const [_, type, id] = data.split('_');
                await stateCol.updateOne({ _id: chatId }, { $set: { targetId: id, targetType: type } }, { upsert: true });
                
                const opts = {
                    reply_markup: { inline_keyboard: [
                        [{ text: '✏️ Edit Judul', callback_data: 'do_edit_title' }],
                        [{ text: '📝 Edit Artikel/Deskripsi', callback_data: 'do_edit_content' }],
                        [{ text: '🗑️ HAPUS PERMANEN', callback_data: 'do_delete' }]
                    ]}
                };
                await bot.sendMessage(chatId, `Menu Edit (${type === 'n' ? 'Berita' : 'Video'}):`, opts);
            }

            // C. EKSEKUSI EDIT/DELETE
            if (data === 'do_delete') {
                const col = userState.targetType === 'n' ? newsCol : videoCol;
                await col.deleteOne({ _id: new ObjectId(userState.targetId) });
                await bot.sendMessage(chatId, "🗑️ Konten berhasil dihapus.", mainMenu);
                await stateCol.deleteOne({ _id: chatId });
            }
            if (data === 'do_edit_title') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_title' } });
                await bot.sendMessage(chatId, "Kirimkan **JUDUL BARU**:", cancelMenu);
            }
            if (data === 'do_edit_content') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_content' } });
                await bot.sendMessage(chatId, "Kirimkan **KONTEN BARU**:", cancelMenu);
            }

            // D. MENU HERO
            if (data === 'add_hero' || data === 'reset_hero' || data === 'add_profile') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'upload_config', mode: data } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirim Foto sekarang:", cancelMenu);
            }

            return res.send('ok');
        }

        // --- 4. STATE HANDLER (Input User) ---

        // A. PROSES EDITING
        if (userState.step === 'editing_title') {
            const col = userState.targetType === 'n' ? newsCol : videoCol;
            const field = userState.targetType === 'n' ? 'title' : 'judul';
            await col.updateOne({ _id: new ObjectId(userState.targetId) }, { $set: { [field]: text } });
            await bot.sendMessage(chatId, "✅ Judul diupdate!", mainMenu);
            await stateCol.deleteOne({ _id: chatId });
            return res.send('ok');
        }
        if (userState.step === 'editing_content') {
            const col = userState.targetType === 'n' ? newsCol : videoCol;
            const field = userState.targetType === 'n' ? 'content' : 'deskripsi';
            await col.updateOne({ _id: new ObjectId(userState.targetId) }, { $set: { [field]: text } });
            await bot.sendMessage(chatId, "✅ Konten diupdate!", mainMenu);
            await stateCol.deleteOne({ _id: chatId });
            return res.send('ok');
        }

        // B. WIZARD TAMBAH BERITA (Smart Link Generator)
        if (text === '📰 Tambah Berita') {
            await stateCol.updateOne({ _id: chatId }, { 
                $set: { step: 'news_photos', draft: { gallery: [], images: [] } } 
            }, { upsert: true });
            
            await bot.sendMessage(chatId, 
                "**Langkah 1: Upload Foto-Foto**\n\n" +
                "Kirim foto satu per satu. Setiap foto akan saya berikan **Kode Link**.\n" +
                "Ketik **'Selesai'** jika semua foto sudah diupload.", 
                cancelMenu
            );
            return res.send('ok');
        }

        if (userState.step === 'news_photos') {
            if (text && text.toLowerCase() === 'selesai') {
                if (userState.draft.gallery.length === 0) {
                    await bot.sendMessage(chatId, "⚠️ Minimal upload 1 foto."); return res.send('ok');
                }
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_title' } });
                await bot.sendMessage(chatId, "Langkah 2: Kirim **Judul Berita**:", cancelMenu);
            
            } else if (update.message.photo) {
                // Upload Foto
                const activeCloud = await cloudCol.findOne({ active: true });
                if (!activeCloud) {
                    await bot.sendMessage(chatId, "⚠️ Error: Belum ada akun Cloudinary aktif."); return res.send('ok');
                }
                
                await bot.sendChatAction(chatId, 'upload_photo');
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);

                if (url) {
                    const idFoto = `foto_${userState.draft.gallery.length + 1}`;
                    // Simpan ke draft
                    await stateCol.updateOne({ _id: chatId }, { 
                        $push: { 
                            "draft.gallery": { group: idFoto, type: 'image', src: url, caption: 'Dokumentasi' },
                            "draft.images": url 
                        }
                    });
                    
                    // Berikan Kode Link ke User
                    const codeToCopy = `<a onclick="openMediaViewer(0, '${idFoto}')" class="inline-link">[Lihat ${idFoto}]</a>`;
                    
                    await bot.sendMessage(chatId, 
                        `✅ Foto tersimpan! (ID: ${idFoto})\n\n` +
                        `Copy kode ini untuk ditaruh di artikel:\n` +
                        `\`${codeToCopy}\``, 
                        { parse_mode: 'Markdown' }
                    );
                } else {
                    await bot.sendMessage(chatId, "❌ Gagal upload.");
                }
            }
            return res.send('ok');
        }

        if (userState.step === 'news_title') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_date', "draft.title": text } });
            await bot.sendMessage(chatId, "Langkah 3: Kirim **Tanggal** (contoh: 20 Mei 2026):", cancelMenu);
            return res.send('ok');
        }

        if (userState.step === 'news_date') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_content', "draft.date": text } });
            await bot.sendMessage(chatId, 
                "Langkah 4: Kirim **Isi Artikel**.\n\n" +
                "Tips: Gunakan kode link foto tadi (misal `<a ...>`) di tengah kalimat agar pembaca bisa klik.",
                cancelMenu
            );
            return res.send('ok');
        }

        if (userState.step === 'news_content') {
            // Save Final
            const draft = userState.draft;
            draft.content = text;
            // Tambahkan link 'Lihat Semua' otomatis di akhir
            draft.content += `<br><br><p class='text-center text-sm text-gray-500'><a onclick="openMediaViewer(0, 'all')" class='inline-link'>[Lihat Semua Dokumentasi]</a></p>`;
            
            // Tambahkan group 'all' ke semua galeri
            const finalGallery = draft.gallery.flatMap(item => [item, { ...item, group: 'all' }]);
            draft.gallery = finalGallery;

            await newsCol.insertOne(draft);
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ **Berita Diterbitkan!** Website otomatis update.", mainMenu);
            return res.send('ok');
        }

        // C. WIZARD TAMBAH VIDEO
        if (text === '🎥 Tambah Video') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_title', draft: {} } }, { upsert: true });
            await bot.sendMessage(chatId, "Kirim **Judul Video**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_title') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_desc', "draft.judul": text } });
            await bot.sendMessage(chatId, "Kirim **Deskripsi Singkat**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_desc') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_url', "draft.deskripsi": text } });
            await bot.sendMessage(chatId, "Kirim **Link YouTube**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_url') {
            await videoCol.insertOne({
                judul: userState.draft.judul,
                deskripsi: userState.draft.deskripsi,
                url: text
            });
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ Video ditambahkan ke slider!", mainMenu);
            return res.send('ok');
        }

        // D. UPLOAD CONFIG (HERO/PROFIL/TOOLS)
        if (userState.step === 'upload_config' && update.message.photo) {
            const activeCloud = await cloudCol.findOne({ active: true });
            const fileId = update.message.photo[update.message.photo.length - 1].file_id;
            const fileLink = await bot.getFileLink(fileId);
            const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);

            if (url) {
                if (userState.mode === 'reset_hero') await configCol.updateOne({_id:'main'}, {$set: {heroImages: [url]}}, {upsert:true});
                if (userState.mode === 'add_hero') await configCol.updateOne({_id:'main'}, {$push: {heroImages: url}}, {upsert:true});
                if (userState.mode === 'add_profile') await configCol.updateOne({_id:'main'}, {$push: {profileImages: url}}, {upsert:true});
                
                await bot.sendMessage(chatId, "✅ Slide berhasil diupdate!", mainMenu);
                await stateCol.deleteOne({ _id: chatId });
            }
            return res.send('ok');
        }

        // E. UPLOAD TOOLS (Fitur Lama)
        if (text === '📸 Upload Tools') {
            await bot.sendMessage(chatId, "Kirim foto disini untuk dapat link URL (Tools bantu). Ketik /add_cloud untuk setting akun.", mainMenu);
            return res.send('ok');
        }
        // Logic /add_cloud dll (Copy dari kode sebelumnya jika perlu, atau cukup pakai wizard di atas)
        if (update.message.photo && !userState.step) {
             const activeCloud = await cloudCol.findOne({ active: true });
             if(activeCloud) {
                 const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                 const fileLink = await bot.getFileLink(fileId);
                 const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                 await bot.sendMessage(chatId, `Link: \`${url}\``, {parse_mode: 'Markdown'});
             }
        }

        // --- MENU NAVIGASI ---
        switch (text) {
            case '✏️ Edit/Hapus Konten':
                await bot.sendMessage(chatId, "Pilih yang mau diedit:", editTypeMenu);
                break;
            case '🖼️ Atur Hero/Profil':
                await bot.sendMessage(chatId, "Pilih opsi:", {
                    reply_markup: { inline_keyboard: [
                        [{text: '➕ Tambah Slide Hero', callback_data: 'add_hero'}],
                        [{text: '🔄 Reset Slide Hero', callback_data: 'reset_hero'}],
                        [{text: '➕ Tambah Slide Profil', callback_data: 'add_profile'}]
                    ]}
                });
                break;
        }

        await client.close();
        res.send('ok');
    } else {
        res.send('Bot Ready');
    }
}
