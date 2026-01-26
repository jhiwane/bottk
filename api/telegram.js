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
            ['✏️ Edit/Hapus', '🖼️ Hero/Profil/Info'],
            ['⚙️ Kelola Cloudinary', '❓ Bantuan']
        ],
        resize_keyboard: true
    }
};

const cancelMenu = {
    reply_markup: { keyboard: [['✅ Selesai / Kembali']], resize_keyboard: true }
};

// Menu Visual (Update Info Teks ada di sini)
const visualMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Slide Hero', callback_data: 'add_hero' }, { text: '🔄 Reset Hero', callback_data: 'reset_hero' }],
            [{ text: '➕ Tambah Slide Profil', callback_data: 'add_profile' }, { text: '🔄 Reset Profil', callback_data: 'reset_profile' }],
            [{ text: '🤖 Ganti Gambar Mascot', callback_data: 'set_mascot' }],
            [{ text: '📝 Ubah Teks Info Popup', callback_data: 'set_info_text' }] // FITUR BARU
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

        // Security Check
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

        // --- 1. HANDLER TOMBOL SELESAI / BATAL ---
        if (text === '✅ Selesai / Kembali' || text === '/start' || text === '❌ Batal') {
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "Kembali ke menu utama.", mainMenu);
            return res.send('ok');
        }

        // --- 2. CALLBACK QUERY (Menu Inline) ---
        if (update.callback_query) {
            const data = update.callback_query.data;
            await bot.answerCallbackQuery(update.callback_query.id);

            // A. VISUAL & INFO
            if (['add_hero', 'reset_hero', 'add_profile', 'set_mascot'].includes(data)) {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'upload_visual', mode: data } }, { upsert: true });
                let msg = "Kirim Foto (Bisa banyak sekaligus). Ketik 'Selesai' jika sudah.";
                if(data === 'set_mascot') msg = "Kirim 1 Foto Mascot (GIF/PNG Transparan).";
                if(data.includes('reset')) msg = "Kirim 1 Foto untuk mengganti semua slide lama.";
                await bot.sendMessage(chatId, msg, cancelMenu);
            }
            if (data === 'set_info_text') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'info_title' } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirim **JUDUL Info** (misal: Info Terbaru):", cancelMenu);
            }

            // B. CLOUDINARY
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

            // C. EDIT & DELETE LISTING
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

            // D. ACTION SELECT
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
                        [{ text: '📝 Edit Isi/Konten', callback_data: 'do_edit_content' }],
                        [{ text: '🗑️ HAPUS', callback_data: 'do_delete' }]
                    ]}
                });
            }

            // E. EXECUTE EDIT/DELETE
            if (data === 'do_delete') {
                const col = userState.targetType === 'n' ? newsCol : videoCol;
                await col.deleteOne({ _id: new ObjectId(userState.targetId) });
                await bot.sendMessage(chatId, "🗑️ Terhapus.", mainMenu);
                await stateCol.deleteOne({_id:chatId});
            }
            if (data === 'do_edit_title') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_title' } });
                await bot.sendMessage(chatId, "Kirim Judul Baru:", cancelMenu);
            }
            if (data === 'do_edit_content') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_content' } });
                await bot.sendMessage(chatId, "Kirim Konten Baru:", cancelMenu);
            }

            return res.send('ok');
        }

        // --- 3. STATE HANDLER (Input User) ---

        // A. UPLOAD VISUAL (HERO/PROFIL/MASCOT) - SUPPORT LOOPING
        if (userState.step === 'upload_visual' && update.message.photo) {
            const activeCloud = await cloudCol.findOne({ active: true });
            if (!activeCloud) { await bot.sendMessage(chatId, "⚠️ Set Cloudinary dulu."); return res.send('ok'); }
            
            const fileId = update.message.photo[update.message.photo.length - 1].file_id;
            const fileLink = await bot.getFileLink(fileId);
            // Optimasi Foto
            const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);

            if (url) {
                if (userState.mode === 'reset_hero') {
                    await configCol.updateOne({_id:'main'}, {$set: {heroImages: [url]}}, {upsert:true});
                    // Ubah mode jadi add agar foto berikutnya menambah, bukan reset lagi
                    await stateCol.updateOne({_id:chatId}, {$set: {mode: 'add_hero'}});
                    await bot.sendMessage(chatId, "✅ Slide di-reset & foto pertama masuk. Kirim foto lagi untuk menambah.", cancelMenu);
                }
                else if (userState.mode === 'reset_profile') {
                    await configCol.updateOne({_id:'main'}, {$set: {profileImages: [url]}}, {upsert:true});
                    await stateCol.updateOne({_id:chatId}, {$set: {mode: 'add_profile'}});
                    await bot.sendMessage(chatId, "✅ Slide Profil di-reset. Kirim lagi untuk menambah.", cancelMenu);
                }
                else if (userState.mode === 'add_hero') {
                    await configCol.updateOne({_id:'main'}, {$push: {heroImages: url}}, {upsert:true});
                    // Jangan delete state, biarkan looping
                }
                else if (userState.mode === 'add_profile') {
                    await configCol.updateOne({_id:'main'}, {$push: {profileImages: url}}, {upsert:true});
                }
                else if (userState.mode === 'set_mascot') {
                    await configCol.updateOne({_id:'main'}, {$set: {mascotUrl: url}}, {upsert:true});
                    await bot.sendMessage(chatId, "✅ Mascot diganti!", mainMenu);
                    await stateCol.deleteOne({_id:chatId});
                    return res.send('ok');
                }
            }
            return res.send('ok');
        }

        // B. UPDATE INFO TEKS
        if (userState.step === 'info_title') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'info_content', temp_title: text } });
            await bot.sendMessage(chatId, "Sekarang kirim **Isi Pesan/Pengumuman**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'info_content') {
            await configCol.updateOne({_id:'main'}, { $set: { infoTitle: userState.temp_title, infoContent: text } }, {upsert:true});
            await stateCol.deleteOne({_id:chatId});
            await bot.sendMessage(chatId, "✅ Info Popup Diupdate!", mainMenu);
            return res.send('ok');
        }

        // C. WIZARD BERITA (DENGAN SLIDESHOW HEADER OTOMATIS)
        if (text === '📰 Tambah Berita') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_photos', draft: { gallery: [], images: [] } } }, { upsert: true });
            await bot.sendMessage(chatId, 
                "**Langkah 1: Upload Semua Foto**\n\n" +
                "Kirim semua foto kegiatan. Foto-foto ini otomatis akan:\n" +
                "1. Menjadi Slideshow Header Berita (Ganti-ganti).\n" +
                "2. Bisa dijadikan link di dalam teks.\n\n" +
                "**Kirim Foto Sekarang (Bisa Banyak). Ketik 'Selesai' jika beres.**", 
                cancelMenu
            );
            return res.send('ok');
        }
        if (userState.step === 'news_photos') {
            if (update.message.photo) {
                const activeCloud = await cloudCol.findOne({ active: true });
                if(!activeCloud) { await bot.sendMessage(chatId, "⚠️ Cloudinary belum diset."); return res.send('ok'); }
                
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                
                if(url) {
                    const pid = `foto_${userState.draft.gallery.length + 1}`;
                    await stateCol.updateOne({_id:chatId}, {
                        // Masukkan ke images (untuk header) DAN gallery (untuk inline)
                        $push: { 
                            "draft.gallery": { group: pid, type: 'image', src: url, caption: 'Dokumentasi' }, 
                            "draft.images": url 
                        }
                    });
                    const code = `<a onclick="openMediaViewer(0, '${pid}')" class="inline-link">[Lihat ${pid}]</a>`;
                    await bot.sendMessage(chatId, `✅ Foto Masuk. Kode: \`${code}\``, {parse_mode:'Markdown'});
                }
            } else if (text && text.toLowerCase().includes('selesai')) {
                if (userState.draft.gallery.length === 0) {
                    await bot.sendMessage(chatId, "⚠️ Minimal upload 1 foto."); return res.send('ok');
                }
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_title' } });
                await bot.sendMessage(chatId, "Langkah 2: Kirim **Judul Berita**:", cancelMenu);
            }
            return res.send('ok');
        }
        // ... (Langkah Judul -> Tanggal -> Konten sama seperti sebelumnya) ...
        if (userState.step === 'news_title') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_date', "draft.title": text } });
            await bot.sendMessage(chatId, "Langkah 3: Kirim **Tanggal**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'news_date') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_content', "draft.date": text } });
            await bot.sendMessage(chatId, "Langkah 4: Kirim **Isi Artikel**.\n\nTips: Gunakan kode link foto tadi di tengah kalimat.", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'news_content') {
            const draft = userState.draft;
            draft.content = text;
            // Auto add 'all' group
            const allGrp = draft.gallery.map(g => ({...g, group: 'all'}));
            draft.gallery = [...draft.gallery, ...allGrp];
            
            await newsCol.insertOne(draft);
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ **Berita Terbit!** Slideshow header otomatis aktif.", mainMenu);
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
            await bot.sendMessage(chatId, "Kirim **Deskripsi Singkat**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_desc') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_url', "draft.deskripsi": text } });
            await bot.sendMessage(chatId, "Kirim **Link YouTube**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_url') {
            const draft = userState.draft;
            draft.url = text;
            await videoCol.insertOne(draft);
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ Video Ditambah!", mainMenu);
            return res.send('ok');
        }

        // E. SETUP CLOUDINARY
        if (userState.step === 'wait_cloud_name') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_preset', temp_name: text } });
            await bot.sendMessage(chatId, "Kirim **Upload Preset**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'wait_cloud_preset') {
            await cloudCol.updateMany({}, {$set:{active:false}});
            await cloudCol.insertOne({ name: userState.temp_name, preset: text, active: true, date: new Date() });
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ Akun Tersimpan!", mainMenu);
            return res.send('ok');
        }

        // EDITING SAVE
        if (userState.step === 'editing_title' || userState.step === 'editing_content') {
            const col = userState.targetType === 'n' ? newsCol : videoCol;
            const map = { 'editing_title': userState.targetType === 'n' ? 'title':'judul', 'editing_content': userState.targetType === 'n'?'content':'deskripsi' };
            await col.updateOne({_id: new ObjectId(userState.targetId)}, {$set: {[map[userState.step]]: text}});
            await bot.sendMessage(chatId, "✅ Terupdate!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }

        // NAVIGASI UTAMA
        switch (text) {
            case '🖼️ Hero/Profil/Info': await bot.sendMessage(chatId, "Pilih Tampilan:", visualMenu); break;
            case '✏️ Edit/Hapus': await bot.sendMessage(chatId, "Pilih Tipe:", editTypeMenu); break;
            case '⚙️ Kelola Cloudinary': await bot.sendMessage(chatId, "Cloudinary:", cloudMenu); break;
            case '❓ Bantuan': await bot.sendMessage(chatId, "Gunakan menu.", mainMenu); break;
        }

        await client.close();
        res.send('ok');
    } else {
        res.send('Bot V6 Ready');
    }
}
