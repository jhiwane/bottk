const TelegramBot = require('node-telegram-bot-api');
const { MongoClient, ObjectId } = require('mongodb');
const { removeBackground, uploadToCloudinary } = require('./utils');

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;
const adminId = process.env.ADMIN_TELEGRAM_ID;

const bot = new TelegramBot(token);
const client = new MongoClient(mongoUri);

// --- MENU UTAMA ---
const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📰 Buat Berita', '🎥 Tambah Video Slider'],
            ['✏️ Edit/Hapus', '🖼️ Atur Tampilan'],
            ['⚙️ Cloudinary', '❓ Bantuan']
        ],
        resize_keyboard: true
    }
};

const cancelMenu = {
    reply_markup: { keyboard: [['❌ Batal / Selesai']], resize_keyboard: true }
};

// ... (Menu Visual, Cloud, EditType, CreateList SAMA SEPERTI SEBELUMNYA - Copy dari kode lama atau biarkan jika sudah ada) ...
// Agar tidak kepanjangan, saya fokus ke LOGIKA UTAMA di bawah ini:

// ... (Definisi visualMenu, editTypeMenu, cloudMenu, createListKeyboard taruh disini) ...
const visualMenu = { reply_markup: { inline_keyboard: [ [{ text: '➕ Tambah Slide Hero', callback_data: 'add_hero' }, { text: '🔄 Reset Hero', callback_data: 'reset_hero' }], [{ text: '➕ Tambah Slide Profil', callback_data: 'add_profile' }, { text: '🔄 Reset Profil', callback_data: 'reset_profile' }], [{ text: '🤖 Ganti Mascot', callback_data: 'set_mascot' }], [{ text: '📝 Edit Teks Info', callback_data: 'set_info_text' }] ] } };
const editTypeMenu = { reply_markup: { inline_keyboard: [ [{ text: '📝 Edit Berita', callback_data: 'list_news' }], [{ text: '🎬 Edit Video', callback_data: 'list_videos' }], [{ text: '🖼️ Hapus Slide Hero', callback_data: 'list_hero' }] ] } };
const cloudMenu = { reply_markup: { inline_keyboard: [ [{ text: '➕ Tambah Akun', callback_data: 'add_cloud' }], [{ text: '📋 List Akun', callback_data: 'list_cloud' }] ] } };
const createListKeyboard = (items, type) => { return { inline_keyboard: items.map(item => { let label = (item.title || item.judul || "Item").substring(0, 30); if (type === 'h') label = `Slide ${item.id + 1}`; return [{ text: label, callback_data: `sel_${type}_${item._id}` }]; }) }; };


export default async function handler(req, res) {
    if (req.method === 'POST') {
        const update = req.body;
        if (!update.message && !update.callback_query) return res.send('ok');

        const msg = update.message || update.callback_query.message;
        const chatId = msg.chat.id;
        const text = update.message ? update.message.text : null;
        const fromId = update.message ? update.message.from.id : update.callback_query.from.id;

        if (String(fromId) !== String(adminId)) { await bot.sendMessage(chatId, "⛔ Ditolak."); return res.send('ok'); }

        await client.connect();
        const db = client.db('school_db');
        const stateCol = db.collection('bot_state');
        const newsCol = db.collection('news');
        const videoCol = db.collection('videos');
        const configCol = db.collection('config');
        const cloudCol = db.collection('cloudinary_accounts');

        let userState = await stateCol.findOne({ _id: chatId }) || {};

        // --- GLOBAL CANCEL ---
        if (text === '❌ Batal / Selesai' || text === '/start') {
            if (userState.step === 'news_photos_upload' && text === '❌ Batal / Selesai') {
                if (userState.draft && userState.draft.gallery && userState.draft.gallery.length > 0) {
                    await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_title_input' } });
                    await bot.sendMessage(chatId, "✅ Media tersimpan.\n\nLanjut: Kirim **JUDUL BERITA**:", cancelMenu);
                    return res.send('ok');
                } else {
                    await bot.sendMessage(chatId, "⚠️ Belum ada media. Batalkan?", { reply_markup: { inline_keyboard: [[{text:'Ya, Batalkan', callback_data:'force_cancel'}]] } });
                    return res.send('ok');
                }
            }
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "Menu Utama:", mainMenu);
            return res.send('ok');
        }

        // --- CALLBACK QUERY ---
        if (update.callback_query) {
            const data = update.callback_query.data;
            await bot.answerCallbackQuery(update.callback_query.id);

            if(data === 'force_cancel') {
                await stateCol.deleteOne({ _id: chatId });
                await bot.sendMessage(chatId, "Batal.", mainMenu);
            }
            // ... (Logika Callback Visual, Cloud, Edit SAMA PERSIS KODE SEBELUMNYA) ...
            if (['add_hero', 'reset_hero', 'add_profile', 'reset_profile', 'set_mascot'].includes(data)) { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'upload_visual', mode: data } }, { upsert: true }); await bot.sendMessage(chatId, "Kirim Foto/Link:", cancelMenu); }
            if (data === 'set_info_text') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'info_title' } }, { upsert: true }); await bot.sendMessage(chatId, "Kirim Judul Info:", cancelMenu); }
            if (data === 'add_cloud') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_name' } }, { upsert: true }); await bot.sendMessage(chatId, "Kirim Cloud Name:", cancelMenu); }
            if (data === 'list_cloud') { const accs = await cloudCol.find({}).toArray(); let msg = "Akun:\n"; accs.forEach(a => msg += `- ${a.name}\n`); await bot.sendMessage(chatId, msg, mainMenu); }
            if (data === 'list_news') { const items = await newsCol.find({}).sort({_id:-1}).limit(5).toArray(); await bot.sendMessage(chatId, "Pilih:", { reply_markup: createListKeyboard(items, 'n') }); }
            if (data === 'list_videos') { const items = await videoCol.find({}).sort({_id:-1}).limit(5).toArray(); await bot.sendMessage(chatId, "Pilih:", { reply_markup: createListKeyboard(items, 'v') }); }
            if (data === 'list_hero') { const conf = await configCol.findOne({_id: 'main'}); if(conf && conf.heroImages) { const heroItems = conf.heroImages.map((u, i) => ({ _id: i, id: i })); await bot.sendMessage(chatId, "Hapus Slide:", { reply_markup: createListKeyboard(heroItems, 'h') }); } }
            
            if (data.startsWith('sel_')) {
                const [_, type, id] = data.split('_');
                if (type === 'h') { 
                    const conf = await configCol.findOne({_id: 'main'}); const newHero = conf.heroImages.filter((_, idx) => idx !== parseInt(id)); await configCol.updateOne({_id: 'main'}, {$set: {heroImages: newHero}}); await bot.sendMessage(chatId, "Terhapus.", mainMenu); return res.send('ok');
                }
                await stateCol.updateOne({ _id: chatId }, { $set: { targetId: id, targetType: type } }, { upsert: true });
                await bot.sendMessage(chatId, "Aksi:", { reply_markup: { inline_keyboard: [ [{ text: '✏️ Edit Judul', callback_data: 'do_edit_title' }], [{ text: '📝 Edit Isi', callback_data: 'do_edit_content' }], [{ text: '🗑️ HAPUS', callback_data: 'do_delete' }] ]} });
            }
            if (data === 'do_delete') { const col = userState.targetType === 'n' ? newsCol : videoCol; await col.deleteOne({ _id: new ObjectId(userState.targetId) }); await bot.sendMessage(chatId, "Dihapus.", mainMenu); await stateCol.deleteOne({_id:chatId}); }
            if (data === 'do_edit_title') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_title' } }); await bot.sendMessage(chatId, "Judul Baru:", cancelMenu); }
            if (data === 'do_edit_content') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_content' } }); await bot.sendMessage(chatId, "Isi Baru:", cancelMenu); }

            return res.send('ok');
        }

        // --- INPUT HANDLER ---

        // A. WIZARD BERITA (LOGIKA FIX: GAMBAR vs YOUTUBE)
        if (text === '📰 Buat Berita') {
            await stateCol.updateOne({ _id: chatId }, { 
                $set: { step: 'news_photos_upload', draft: { gallery: [], images: [] } } 
            }, { upsert: true });
            
            await bot.sendMessage(chatId, 
                "**Langkah 1: Upload Media (Foto/Video)**\n\n" +
                "1. **Kirim FOTO** (Upload Langsung) -> Masuk Header & Galeri.\n" +
                "2. **Kirim URL Gambar** (Cloudinary) -> Masuk Header & Galeri.\n" +
                "3. **Kirim URL YouTube** -> HANYA masuk Galeri (Video Inline).\n\n" +
                "Bot akan memberi **Kode Unik** untuk setiap media.\n" +
                "Ketik **'Selesai'** jika sudah.", 
                cancelMenu
            );
            return res.send('ok');
        }

        if (userState.step === 'news_photos_upload') {
            let finalUrl = null;
            let type = 'image'; // Default image
            const waitMsg = await bot.sendMessage(chatId, "⏳ Memproses...");

            // 1. Cek Upload Foto
            if (update.message.photo) {
                const activeCloud = await cloudCol.findOne({ active: true });
                if(!activeCloud) { await bot.deleteMessage(chatId, waitMsg.message_id); await bot.sendMessage(chatId, "⚠️ Set Cloudinary dulu."); return res.send('ok'); }
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                finalUrl = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
            
            } else if (text) {
                // 2. Cek Apakah Youtube?
                if (text.includes('youtu.be') || text.includes('youtube.com')) {
                    finalUrl = text.trim();
                    type = 'video';
                } 
                // 3. Cek Apakah Link Gambar?
                else if (text.startsWith('http')) {
                    finalUrl = text.trim();
                    type = 'image';
                }
            }

            await bot.deleteMessage(chatId, waitMsg.message_id);

            if (finalUrl) {
                // Buat ID unik (media_1, media_2) berdasarkan index saat ini
                const currentIndex = userState.draft.gallery.length + 1;
                const pid = `media_${currentIndex}`; 
                
                // LOGIKA PEMISAHAN HEADER vs GALERI
                const updateQuery = { 
                    $push: { 
                        "draft.gallery": { group: pid, type: type, src: finalUrl, caption: 'Dokumentasi' }
                    }
                };

                // Hanya FOTO yang masuk ke Header (Slideshow Atas)
                if (type === 'image') {
                    if (!updateQuery.$push["draft.images"]) updateQuery.$push["draft.images"] = finalUrl;
                    else updateQuery.$push["draft.images"] = finalUrl; // MongoDB syntax might vary, but logic is: push to both
                    // Koreksi syntax mongo native:
                    await stateCol.updateOne({_id:chatId}, {
                        $push: {
                            "draft.gallery": { group: pid, type: type, src: finalUrl, caption: 'Dokumentasi' },
                            "draft.images": finalUrl
                        }
                    });
                } else {
                    // Video cuma masuk galeri
                    await stateCol.updateOne({_id:chatId}, {
                        $push: {
                            "draft.gallery": { group: pid, type: type, src: finalUrl, caption: 'Dokumentasi' }
                        }
                    });
                }
                
                // BERI KODE LINK KE USER
                let linkCode = "";
                if(type === 'video') {
                    linkCode = `<a onclick="openMediaViewer(0, '${pid}')" class="inline-link video-link">[Lihat Video]</a>`;
                } else {
                    linkCode = `<a onclick="openMediaViewer(0, '${pid}')" class="inline-link">[Lihat Foto]</a>`;
                }

                await bot.sendMessage(chatId, 
                    `✅ **${type.toUpperCase()} Tersimpan!**\nID: ${pid}\n\n` +
                    `👇 **Salin Kode Ini untuk Artikel:**\n\`${linkCode}\``, 
                    {parse_mode:'Markdown'}
                );

            } else if (!text.includes('Selesai')) {
                await bot.sendMessage(chatId, "❌ Input tidak dikenali. Kirim Foto, Link Gambar, atau Link YouTube.");
            }
            
            return res.send('ok');
        }

        if (userState.step === 'news_title_input') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_date_input', "draft.title": text } });
            await bot.sendMessage(chatId, "Langkah 3: Kirim **TANGGAL**:", cancelMenu);
            return res.send('ok');
        }

        if (userState.step === 'news_date_input') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_content_input', "draft.date": text } });
            await bot.sendMessage(chatId, 
                "Langkah 4: Kirim **ISI BERITA**.\n\n" +
                "Paste kode link (contoh: `<a ...>`) yang tadi diberikan bot di tengah kalimat.", 
                cancelMenu
            );
            return res.send('ok');
        }

        if (userState.step === 'news_content_input') {
            const draft = userState.draft;
            draft.content = text;
            
            // Link 'Lihat Semua'
            draft.content += `<br><br><p class='text-center text-sm text-gray-500'><a onclick="openMediaViewer(0, 'all')" class='inline-link'>[Lihat Semua Dokumentasi]</a></p>`;
            
            // Tambahkan group 'all'
            const allGrp = draft.gallery.map(g => ({...g, group: 'all'}));
            draft.gallery = [...draft.gallery, ...allGrp];

            await newsCol.insertOne(draft);
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ **BERITA TERBIT!**", mainMenu);
            return res.send('ok');
        }

        // ... (LOGIKA VIDEO SLIDER, UPLOAD VISUAL, EDITING -> SAMA PERSIS KODE SEBELUMNYA) ...
        // Agar tidak duplikat, gunakan logika 'upload_visual' dari jawaban saya sebelumnya untuk fitur Hero/Profil.
        
        // PENTING: Paste sisa handler (Video Slider, Visual Upload, Edit Text) disini.
        
        // CONTOH SINGKAT HANDLER LAIN (Pastikan Anda menyalin versi lengkap dari kode V10 sebelumnya untuk bagian ini):
        if (text === '🎥 Tambah Video Slider') { /* ...Logika Video Slider... */ }
        if (userState.step === 'vid_title') { /* ... */ }
        // ... dst ...

        await client.close();
        res.send('ok');
    } else {
        res.send('Bot V11 Fixed Logic');
    }
}
