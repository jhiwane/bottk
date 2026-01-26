const TelegramBot = require('node-telegram-bot-api');
const { MongoClient, ObjectId } = require('mongodb');
const { removeBackground, uploadToCloudinary } = require('./utils');

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;
const adminId = process.env.ADMIN_TELEGRAM_ID;

const bot = new TelegramBot(token);
const client = new MongoClient(mongoUri);

// --- DEFINISI SEMUA MENU (Supaya Tidak Error Reference) ---

const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📰 Tambah Berita', '🎥 Tambah Video'],
            ['✏️ Edit/Hapus Konten', '🖼️ Atur Hero/Profil'],
            ['⚙️ Kelola Cloudinary', '❓ Bantuan']
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

// Menu Edit Tipe (Yang tadi Error)
const editTypeMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '📝 Edit Berita', callback_data: 'list_news' }],
            [{ text: '🎬 Edit Video', callback_data: 'list_videos' }],
            [{ text: '🖼️ Hapus Slide Hero', callback_data: 'list_hero' }]
        ]
    }
};

// Menu Cloudinary (Yang Hilang)
const cloudMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Akun Baru', callback_data: 'add_cloud' }],
            [{ text: '📋 Lihat Daftar Akun', callback_data: 'list_cloud' }]
        ]
    }
};

// Menu Hero
const heroMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Slide Hero', callback_data: 'add_hero' }],
            [{ text: '🔄 Reset Semua Hero', callback_data: 'reset_hero' }],
            [{ text: '➕ Tambah Slide Profil', callback_data: 'add_profile' }]
        ]
    }
};

// Helper List
const createListKeyboard = (items, type) => {
    return {
        inline_keyboard: items.map(item => {
            let label = (item.title || item.judul || "Item").substring(0, 30);
            if (type === 'h') label = `Slide ${item.id + 1}`;
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

        // Security
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

        // --- 1. HANDLER BATAL ---
        if (text === '❌ Batal' || text === '/start') {
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "Kembali ke menu utama.", mainMenu);
            return res.send('ok');
        }

        // --- 2. CALLBACK QUERY (Tombol Inline) ---
        if (update.callback_query) {
            const data = update.callback_query.data;
            await bot.answerCallbackQuery(update.callback_query.id);

            // A. CLOUDINARY ACTIONS
            if (data === 'add_cloud') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_name' } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirimkan **Cloud Name** akun Cloudinary:", cancelMenu);
            }
            if (data === 'list_cloud') {
                const accs = await cloudCol.find({}).toArray();
                let msg = "📋 **Daftar Akun Cloudinary:**\n";
                if(accs.length === 0) msg += "(Kosong)";
                else accs.forEach(a => msg += `- ${a.name} (${a.active ? '✅ Aktif' : 'Pasif'})\n`);
                await bot.sendMessage(chatId, msg, mainMenu);
            }

            // B. MENU EDIT/HAPUS (LISTING)
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
            if (data === 'list_hero') {
                const conf = await configCol.findOne({_id: 'main'});
                if(!conf || !conf.heroImages) await bot.sendMessage(chatId, "Slide kosong.");
                else {
                    const heroItems = conf.heroImages.map((u, i) => ({ _id: i, id: i })); // Fake ID for array index
                    await bot.sendMessage(chatId, "Pilih Slide untuk DIHAPUS:", { reply_markup: createListKeyboard(heroItems, 'h') });
                }
            }

            // C. SELECT ITEM (DETIL)
            if (data.startsWith('sel_')) {
                const [_, type, id] = data.split('_');
                
                // Khusus Hapus Hero (Array Index)
                if (type === 'h') {
                    const conf = await configCol.findOne({_id: 'main'});
                    const newHero = conf.heroImages.filter((_, idx) => idx !== parseInt(id));
                    await configCol.updateOne({_id: 'main'}, {$set: {heroImages: newHero}});
                    await bot.sendMessage(chatId, "🗑️ Slide dihapus.", mainMenu);
                    return res.send('ok');
                }

                // Untuk News/Video
                await stateCol.updateOne({ _id: chatId }, { $set: { targetId: id, targetType: type } }, { upsert: true });
                const opts = {
                    reply_markup: { inline_keyboard: [
                        [{ text: '✏️ Edit Judul', callback_data: 'do_edit_title' }],
                        [{ text: '📝 Edit Isi/Konten', callback_data: 'do_edit_content' }],
                        [{ text: '🗑️ HAPUS PERMANEN', callback_data: 'do_delete' }]
                    ]}
                };
                await bot.sendMessage(chatId, `Menu Edit (${type==='n'?'Berita':'Video'}):`, opts);
            }

            // D. EKSEKUSI EDIT/DELETE
            if (data === 'do_delete') {
                const col = userState.targetType === 'n' ? newsCol : videoCol;
                await col.deleteOne({ _id: new ObjectId(userState.targetId) });
                await bot.sendMessage(chatId, "🗑️ Terhapus.", mainMenu);
                await stateCol.deleteOne({_id:chatId});
            }
            if (data === 'do_edit_title') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_title' } });
                await bot.sendMessage(chatId, "Kirim **JUDUL BARU**:", cancelMenu);
            }
            if (data === 'do_edit_content') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_content' } });
                await bot.sendMessage(chatId, "Kirim **KONTEN BARU**:", cancelMenu);
            }

            // E. MENU UPLOAD HERO
            if (['add_hero', 'reset_hero', 'add_profile'].includes(data)) {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'upload_config', mode: data } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirim Fotonya sekarang:", cancelMenu);
            }

            return res.send('ok');
        }

        // --- 3. STATE HANDLER (Input User) ---

        // A. SETTING CLOUDINARY
        if (userState.step === 'wait_cloud_name') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_preset', temp_name: text } });
            await bot.sendMessage(chatId, "Oke. Sekarang kirim **Upload Preset** (Unsigned):", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'wait_cloud_preset') {
            await cloudCol.insertOne({ name: userState.temp_name, preset: text, active: true, date: new Date() });
            // Nonaktifkan yg lain
            await cloudCol.updateMany({ name: { $ne: userState.temp_name } }, { $set: { active: false } });
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, `✅ Akun **${userState.temp_name}** aktif!`, mainMenu);
            return res.send('ok');
        }

        // B. PROSES EDITING
        if (userState.step === 'editing_title') {
            const col = userState.targetType === 'n' ? newsCol : videoCol;
            const field = userState.targetType === 'n' ? 'title' : 'judul';
            await col.updateOne({ _id: new ObjectId(userState.targetId) }, { $set: { [field]: text } });
            await bot.sendMessage(chatId, "✅ Judul Update!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }
        if (userState.step === 'editing_content') {
            const col = userState.targetType === 'n' ? newsCol : videoCol;
            const field = userState.targetType === 'n' ? 'content' : 'deskripsi';
            await col.updateOne({ _id: new ObjectId(userState.targetId) }, { $set: { [field]: text } });
            await bot.sendMessage(chatId, "✅ Konten Update!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }

        // C. WIZARD BERITA
        if (text === '📰 Tambah Berita') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_photos', draft: { gallery: [], images: [] } } }, { upsert: true });
            await bot.sendMessage(chatId, "Langkah 1: **Upload Foto**.\nKirim foto satu per satu. Ketik 'Selesai' jika sudah.", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'news_photos') {
            if (text && text.toLowerCase() === 'selesai') {
                if(userState.draft.gallery.length === 0) {
                    await bot.sendMessage(chatId, "⚠️ Upload foto minimal 1."); return res.send('ok');
                }
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_title' } });
                await bot.sendMessage(chatId, "Langkah 2: Kirim **Judul Berita**:", cancelMenu);
            } else if (update.message.photo) {
                // Upload
                const activeCloud = await cloudCol.findOne({ active: true });
                if(!activeCloud) { await bot.sendMessage(chatId, "⚠️ Set Cloudinary dulu di menu Kelola Cloudinary."); return res.send('ok'); }
                
                await bot.sendChatAction(chatId, 'upload_photo');
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                
                if(url) {
                    const pid = `foto_${userState.draft.gallery.length + 1}`;
                    await stateCol.updateOne({_id:chatId}, {
                        $push: { "draft.gallery": { group: pid, type: 'image', src: url, caption: 'Dokumentasi' }, "draft.images": url }
                    });
                    const code = `<a onclick="openMediaViewer(0, '${pid}')" class="inline-link">[Lihat ${pid}]</a>`;
                    await bot.sendMessage(chatId, `✅ Foto OK. Copy kode ini:\n\`${code}\``, {parse_mode:'Markdown'});
                }
            }
            return res.send('ok');
        }
        if (userState.step === 'news_title') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_date', "draft.title": text } });
            await bot.sendMessage(chatId, "Langkah 3: Kirim **Tanggal**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'news_date') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_content', "draft.date": text } });
            await bot.sendMessage(chatId, "Langkah 4: Kirim **Artikel** (Gunakan kode link foto tadi di sini):", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'news_content') {
            const draft = userState.draft;
            draft.content = text;
            // Add 'All' group logic
            const allGroup = draft.gallery.map(g => ({...g, group: 'all'}));
            draft.gallery = [...draft.gallery, ...allGroup];
            
            await newsCol.insertOne(draft);
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ **Berita Terbit!**", mainMenu);
            return res.send('ok');
        }

        // D. WIZARD VIDEO
        if (text === '🎥 Tambah Video') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_title', draft: {} } }, { upsert: true });
            await bot.sendMessage(chatId, "Kirim **Judul Video**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_title') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_desc', "draft.judul": text } });
            await bot.sendMessage(chatId, "Kirim **Deskripsi**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_desc') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_url', "draft.deskripsi": text } });
            await bot.sendMessage(chatId, "Kirim **Link Youtube**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_url') {
            const draft = userState.draft;
            draft.url = text;
            await videoCol.insertOne(draft);
            await stateCol.deleteOne({_id:chatId});
            await bot.sendMessage(chatId, "✅ Video Ditambah!", mainMenu);
            return res.send('ok');
        }

        // E. UPLOAD CONFIG (HERO)
        if (userState.step === 'upload_config' && update.message.photo) {
            const activeCloud = await cloudCol.findOne({ active: true });
            if(!activeCloud) { await bot.sendMessage(chatId, "⚠️ Set Cloudinary dulu."); return res.send('ok'); }
            
            const fileId = update.message.photo[update.message.photo.length - 1].file_id;
            const fileLink = await bot.getFileLink(fileId);
            const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
            
            if(url) {
                if(userState.mode === 'reset_hero') await configCol.updateOne({_id:'main'}, {$set: {heroImages: [url]}}, {upsert:true});
                if(userState.mode === 'add_hero') await configCol.updateOne({_id:'main'}, {$push: {heroImages: url}}, {upsert:true});
                if(userState.mode === 'add_profile') await configCol.updateOne({_id:'main'}, {$push: {profileImages: url}}, {upsert:true});
                
                await bot.sendMessage(chatId, "✅ Slide Update!", mainMenu);
                await stateCol.deleteOne({_id:chatId});
            }
            return res.send('ok');
        }

        // --- 4. MENU NAVIGASI ---
        switch (text) {
            case '✏️ Edit/Hapus Konten':
                await bot.sendMessage(chatId, "Apa yang mau diedit?", editTypeMenu);
                break;
            case '⚙️ Kelola Cloudinary':
                await bot.sendMessage(chatId, "Menu Cloudinary:", cloudMenu);
                break;
            case '🖼️ Atur Hero/Profil':
                await bot.sendMessage(chatId, "Pilih Slide:", heroMenu);
                break;
            case '📸 Upload Tools':
                await bot.sendMessage(chatId, "Kirim foto disini, saya akan beri link URL-nya saja (tanpa simpan ke berita).", mainMenu);
                break;
            case '❓ Bantuan':
                await bot.sendMessage(chatId, "Gunakan tombol menu untuk navigasi. Pastikan Akun Cloudinary sudah diset pertama kali.", mainMenu);
                break;
        }
        
        // Fallback Upload Tools (Tanpa state)
        if(update.message.photo && !userState.step) {
             const activeCloud = await cloudCol.findOne({ active: true });
             if(activeCloud) {
                 const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                 const fileLink = await bot.getFileLink(fileId);
                 const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                 await bot.sendMessage(chatId, `Link Foto:\n\`${url}\``, {parse_mode:'Markdown'});
             }
        }

        await client.close();
        res.send('ok');
    } else {
        res.send('Bot Active v4');
    }
}
