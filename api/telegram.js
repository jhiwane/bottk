const TelegramBot = require('node-telegram-bot-api');
const { MongoClient, ObjectId } = require('mongodb');
const { removeBackground, uploadToCloudinary } = require('./utils');

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;
const adminId = process.env.ADMIN_TELEGRAM_ID;

const bot = new TelegramBot(token);
const client = new MongoClient(mongoUri);

// --- MENU ---
const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📰 Tambah Berita', '🎥 Tambah Video'],
            ['✏️ Edit/Hapus', '🖼️ Hero/Profil/Mascot'],
            ['⚙️ Kelola Cloudinary', '❓ Bantuan']
        ],
        resize_keyboard: true
    }
};

const cancelMenu = {
    reply_markup: { keyboard: [['❌ Batal']], resize_keyboard: true }
};

const visualMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Slide Hero', callback_data: 'add_hero' }],
            [{ text: '🔄 Reset Slide Hero', callback_data: 'reset_hero' }],
            [{ text: '➕ Tambah Slide Profil', callback_data: 'add_profile' }],
            [{ text: '🤖 Ganti Mascot (Info)', callback_data: 'set_mascot' }]
        ]
    }
};

const editTypeMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '📝 Edit Berita', callback_data: 'list_news' }],
            [{ text: '🎬 Edit Video', callback_data: 'list_videos' }],
            [{ text: '🖼️ Hapus Slide Hero', callback_data: 'list_hero' }]
        ]
    }
};

const cloudMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Akun Baru', callback_data: 'add_cloud' }],
            [{ text: '📋 Lihat Daftar Akun', callback_data: 'list_cloud' }]
        ]
    }
};

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

        if (String(fromId) !== String(adminId)) {
            await bot.sendMessage(chatId, "⛔ Akses Ditolak.");
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

        // 1. HANDLER BATAL
        if (text === '❌ Batal' || text === '/start') {
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "Menu Utama:", mainMenu);
            return res.send('ok');
        }

        // 2. CALLBACK QUERY
        if (update.callback_query) {
            const data = update.callback_query.data;
            await bot.answerCallbackQuery(update.callback_query.id);

            // Menu Visual
            if (['add_hero', 'reset_hero', 'add_profile', 'set_mascot'].includes(data)) {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'upload_visual', mode: data } }, { upsert: true });
                await bot.sendMessage(chatId, "📸 Kirim Fotonya sekarang:", cancelMenu);
            }

            // Cloudinary
            if (data === 'add_cloud') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_name' } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirim **Cloud Name**:", cancelMenu);
            }
            if (data === 'list_cloud') {
                const accs = await cloudCol.find({}).toArray();
                let msg = "📋 **Akun Cloudinary:**\n";
                accs.forEach(a => msg += `- ${a.name} (${a.active ? '✅' : '❌'})\n`);
                await bot.sendMessage(chatId, msg || "Kosong.", mainMenu);
            }

            // Edit List
            if (data === 'list_news') {
                const items = await newsCol.find({}).sort({_id:-1}).limit(5).toArray();
                await bot.sendMessage(chatId, "Pilih Berita:", { reply_markup: createListKeyboard(items, 'n') });
            }
            if (data === 'list_videos') {
                const items = await videoCol.find({}).sort({_id:-1}).limit(5).toArray();
                await bot.sendMessage(chatId, "Pilih Video:", { reply_markup: createListKeyboard(items, 'v') });
            }
            if (data === 'list_hero') {
                const conf = await configCol.findOne({_id: 'main'});
                if(conf && conf.heroImages) {
                    const heroItems = conf.heroImages.map((u, i) => ({ _id: i, id: i }));
                    await bot.sendMessage(chatId, "Pilih Slide untuk DIHAPUS:", { reply_markup: createListKeyboard(heroItems, 'h') });
                } else await bot.sendMessage(chatId, "Slide kosong.");
            }

            // Select & Action
            if (data.startsWith('sel_')) {
                const [_, type, id] = data.split('_');
                
                if (type === 'h') { // Hapus Hero
                    const conf = await configCol.findOne({_id: 'main'});
                    const newHero = conf.heroImages.filter((_, idx) => idx !== parseInt(id));
                    await configCol.updateOne({_id: 'main'}, {$set: {heroImages: newHero}});
                    await bot.sendMessage(chatId, "🗑️ Slide dihapus.", mainMenu);
                    return res.send('ok');
                }

                await stateCol.updateOne({ _id: chatId }, { $set: { targetId: id, targetType: type } }, { upsert: true });
                await bot.sendMessage(chatId, "Pilih Aksi:", {
                    reply_markup: { inline_keyboard: [
                        [{ text: '✏️ Edit Judul', callback_data: 'do_edit_title' }],
                        [{ text: '📝 Edit Isi/Deskripsi', callback_data: 'do_edit_content' }],
                        [{ text: '🗑️ HAPUS', callback_data: 'do_delete' }]
                    ]}
                });
            }

            if (data === 'do_delete') {
                const col = userState.targetType === 'n' ? newsCol : videoCol;
                await col.deleteOne({ _id: new ObjectId(userState.targetId) });
                await bot.sendMessage(chatId, "🗑️ Dihapus.", mainMenu);
                await stateCol.deleteOne({_id:chatId});
            }
            if (data === 'do_edit_title') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_title' } });
                await bot.sendMessage(chatId, "Kirim Judul Baru:", cancelMenu);
            }
            if (data === 'do_edit_content') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_content' } });
                await bot.sendMessage(chatId, "Kirim Konten/Deskripsi Baru:", cancelMenu);
            }

            return res.send('ok');
        }

        // 3. INPUT TEXT USER
        if (userState.step === 'wait_cloud_name') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_preset', temp_name: text } });
            await bot.sendMessage(chatId, "Kirim **Upload Preset**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'wait_cloud_preset') {
            await cloudCol.updateMany({}, { $set: { active: false } });
            await cloudCol.insertOne({ name: userState.temp_name, preset: text, active: true });
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ Akun Cloudinary Aktif!", mainMenu);
            return res.send('ok');
        }

        // Upload Visual (Hero/Profil/Mascot)
        if (userState.step === 'upload_visual' && update.message.photo) {
            const activeCloud = await cloudCol.findOne({ active: true });
            if (!activeCloud) { await bot.sendMessage(chatId, "⚠️ Set Cloudinary dulu."); return res.send('ok'); }
            
            const fileId = update.message.photo[update.message.photo.length - 1].file_id;
            const fileLink = await bot.getFileLink(fileId);
            const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset); // Auto optimized

            if (url) {
                if (userState.mode === 'reset_hero') await configCol.updateOne({_id:'main'}, {$set: {heroImages: [url]}}, {upsert:true});
                if (userState.mode === 'add_hero') await configCol.updateOne({_id:'main'}, {$push: {heroImages: url}}, {upsert:true});
                if (userState.mode === 'add_profile') await configCol.updateOne({_id:'main'}, {$push: {profileImages: url}}, {upsert:true});
                if (userState.mode === 'set_mascot') await configCol.updateOne({_id:'main'}, {$set: {mascotUrl: url}}, {upsert:true});
                
                await bot.sendMessage(chatId, "✅ Gambar berhasil diupdate!", mainMenu);
                await stateCol.deleteOne({_id:chatId});
            } else {
                await bot.sendMessage(chatId, "❌ Gagal upload.");
            }
            return res.send('ok');
        }

        // Video Wizard (Title -> Desc -> URL)
        if (text === '🎥 Tambah Video') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_title', draft: {} } }, { upsert: true });
            await bot.sendMessage(chatId, "1. Kirim **Judul Video**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_title') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_desc', "draft.judul": text } });
            await bot.sendMessage(chatId, "2. Kirim **Deskripsi Singkat**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_desc') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_url', "draft.deskripsi": text } });
            await bot.sendMessage(chatId, "3. Kirim **Link YouTube**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_url') {
            const draft = userState.draft;
            draft.url = text;
            await videoCol.insertOne(draft);
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ Video berhasil ditambahkan!", mainMenu);
            return res.send('ok');
        }

        // News Wizard (Sama seperti sebelumnya)
        if (text === '📰 Tambah Berita') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_photos', draft: { gallery: [], images: [] } } }, { upsert: true });
            await bot.sendMessage(chatId, "1. **Upload Foto** (Ketik 'Selesai' jika sudah):", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'news_photos') {
            if (text && text.toLowerCase() === 'selesai') {
                if (userState.draft.gallery.length === 0) { await bot.sendMessage(chatId, "⚠️ Minimal 1 foto."); return res.send('ok'); }
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_title' } });
                await bot.sendMessage(chatId, "2. Kirim **Judul Berita**:", cancelMenu);
            } else if (update.message.photo) {
                const activeCloud = await cloudCol.findOne({ active: true });
                if(!activeCloud) { await bot.sendMessage(chatId, "Set Cloudinary dulu."); return res.send('ok'); }
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                
                if(url) {
                    const pid = `foto_${userState.draft.gallery.length + 1}`;
                    await stateCol.updateOne({_id:chatId}, {
                        $push: { "draft.gallery": { group: pid, type: 'image', src: url, caption: 'Dokumentasi' }, "draft.images": url }
                    });
                    await bot.sendMessage(chatId, `✅ Foto OK. Link: \`<a onclick="openMediaViewer(0, '${pid}')" class="inline-link">[Lihat ${pid}]</a>\``, {parse_mode:'Markdown'});
                }
            }
            return res.send('ok');
        }
        if (userState.step === 'news_title') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_date', "draft.title": text } });
            await bot.sendMessage(chatId, "3. Kirim **Tanggal**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'news_date') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_content', "draft.date": text } });
            await bot.sendMessage(chatId, "4. Kirim **Artikel** (Gunakan kode link foto tadi):", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'news_content') {
            const draft = userState.draft;
            draft.content = text;
            draft.content += `<br><br><p class='text-center'><a onclick="openMediaViewer(0, 'all')" class='inline-link'>[Lihat Semua Dokumentasi]</a></p>`;
            // Add 'all' group
            const allGrp = draft.gallery.map(g => ({...g, group: 'all'}));
            draft.gallery = [...draft.gallery, ...allGrp];
            
            await newsCol.insertOne(draft);
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ Berita Terbit!", mainMenu);
            return res.send('ok');
        }

        // Editing Save
        if (userState.step === 'editing_title' || userState.step === 'editing_content') {
            const col = userState.targetType === 'n' ? newsCol : videoCol;
            const fieldMap = {
                'editing_title': userState.targetType === 'n' ? 'title' : 'judul',
                'editing_content': userState.targetType === 'n' ? 'content' : 'deskripsi'
            };
            await col.updateOne({ _id: new ObjectId(userState.targetId) }, { $set: { [fieldMap[userState.step]]: text } });
            await bot.sendMessage(chatId, "✅ Updated!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }

        // Main Menu Switch
        switch (text) {
            case '✏️ Edit/Hapus': await bot.sendMessage(chatId, "Menu Edit:", editTypeMenu); break;
            case '🖼️ Hero/Profil/Mascot': await bot.sendMessage(chatId, "Menu Tampilan:", visualMenu); break;
            case '⚙️ Kelola Cloudinary': await bot.sendMessage(chatId, "Menu Cloud:", cloudMenu); break;
            case '📸 Upload Tools': await bot.sendMessage(chatId, "Kirim foto untuk dapat URL.", mainMenu); break;
            case '❓ Bantuan': await bot.sendMessage(chatId, "Gunakan tombol menu.", mainMenu); break;
        }

        // Fallback Upload Tools
        if (update.message.photo && !userState.step) {
            const activeCloud = await cloudCol.findOne({ active: true });
            if (activeCloud) {
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                await bot.sendMessage(chatId, `URL: \`${url}\``, {parse_mode:'Markdown'});
            }
        }

        await client.close();
        res.send('ok');
    } else {
        res.send('Bot V5 Ready');
    }
}
