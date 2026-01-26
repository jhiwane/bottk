const TelegramBot = require('node-telegram-bot-api');
const { MongoClient, ObjectId } = require('mongodb');
const { removeBackground, uploadToCloudinary } = require('./utils');

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;
const adminId = process.env.ADMIN_TELEGRAM_ID;

const bot = new TelegramBot(token);
const client = new MongoClient(mongoUri);

// --- 1. DEFINISI MENU (DITARUH DI ATAS AGAR TIDAK ERROR) ---

const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📰 Buat Berita', '🎥 Tambah Video'],
            ['✏️ Edit/Hapus', '🖼️ Atur Tampilan'],
            ['⚙️ Cloudinary', '❓ Bantuan']
        ],
        resize_keyboard: true
    }
};

const cancelMenu = {
    reply_markup: {
        keyboard: [['❌ Batal / Selesai']],
        resize_keyboard: true
    }
};

const visualMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Slide Hero', callback_data: 'add_hero' }, { text: '🔄 Reset Hero', callback_data: 'reset_hero' }],
            [{ text: '➕ Tambah Slide Profil', callback_data: 'add_profile' }, { text: '🔄 Reset Profil', callback_data: 'reset_profile' }],
            [{ text: '🤖 Ganti Mascot', callback_data: 'set_mascot' }],
            [{ text: '📝 Edit Teks Info', callback_data: 'set_info_text' }]
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

// Helper untuk membuat list tombol
const createListKeyboard = (items, type) => {
    return {
        inline_keyboard: items.map(item => {
            let label = (item.title || item.judul || "Item").substring(0, 30);
            if (type === 'h') label = `Slide ${item.id + 1}`;
            return [{ text: label, callback_data: `sel_${type}_${item._id}` }];
        })
    };
};

// --- 2. MAIN HANDLER ---

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

        // --- HANDLER GLOBAL: BATAL / START ---
        if (text === '❌ Batal / Selesai' || text === '/start') {
            // Khusus jika sedang upload berita, cek dulu apakah mau selesai atau batal
            if (userState.step === 'news_photos_upload' && text === '❌ Batal / Selesai') {
                // Cek apakah sudah ada foto?
                if (userState.draft && userState.draft.gallery && userState.draft.gallery.length > 0) {
                    await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_title_input' } });
                    await bot.sendMessage(chatId, "✅ Upload Foto Selesai.\n\nSekarang Masukkan **JUDUL BERITA**:", cancelMenu);
                    return res.send('ok');
                } else {
                    await bot.sendMessage(chatId, "⚠️ Belum ada foto. Batalkan pembuatan berita?", {
                        reply_markup: { inline_keyboard: [[{text:'Ya, Batalkan', callback_data:'force_cancel'}]] }
                    });
                    return res.send('ok');
                }
            }
            
            // Default Cancel
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "Kembali ke menu utama.", mainMenu);
            return res.send('ok');
        }

        // --- 3. CALLBACK QUERY (Tombol Inline) ---
        if (update.callback_query) {
            const data = update.callback_query.data;
            await bot.answerCallbackQuery(update.callback_query.id);

            // Force Cancel
            if (data === 'force_cancel') {
                await stateCol.deleteOne({ _id: chatId });
                await bot.sendMessage(chatId, "Dibatalkan.", mainMenu);
            }

            // A. VISUAL & INFO
            if (['add_hero', 'reset_hero', 'add_profile', 'reset_profile', 'set_mascot'].includes(data)) {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'upload_visual', mode: data } }, { upsert: true });
                let m = "Kirim Foto (Bisa Banyak). Ketik tombol Selesai jika sudah.";
                if(data.includes('reset')) m = "Kirim 1 Foto untuk RESET slide (Hapus yang lama).";
                await bot.sendMessage(chatId, m, cancelMenu);
            }
            if (data === 'set_info_text') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'info_title' } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirim **Judul Info Popup**:", cancelMenu);
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

            // C. LISTING UNTUK EDIT/HAPUS
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
                    await bot.sendMessage(chatId, "Pilih Slide Hapus:", { reply_markup: createListKeyboard(heroItems, 'h') });
                } else await bot.sendMessage(chatId, "Slide kosong.");
            }

            // D. SELEKSI ITEM & AKSI
            if (data.startsWith('sel_')) {
                const [_, type, id] = data.split('_');
                
                if (type === 'h') { // Hapus Hero Langsung
                    const conf = await configCol.findOne({_id: 'main'});
                    const newHero = conf.heroImages.filter((_, idx) => idx !== parseInt(id));
                    await configCol.updateOne({_id: 'main'}, {$set: {heroImages: newHero}});
                    await bot.sendMessage(chatId, "🗑️ Slide dihapus.", mainMenu);
                    return res.send('ok');
                }

                await stateCol.updateOne({ _id: chatId }, { $set: { targetId: id, targetType: type } }, { upsert: true });
                await bot.sendMessage(chatId, "Mau diapakan?", {
                    reply_markup: { inline_keyboard: [
                        [{ text: '✏️ Edit Judul', callback_data: 'do_edit_title' }],
                        [{ text: '📝 Edit Konten', callback_data: 'do_edit_content' }],
                        [{ text: '🗑️ HAPUS', callback_data: 'do_delete' }]
                    ]}
                });
            }

            // E. EKSEKUSI EDIT/DELETE
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

        // --- 4. INPUT USER (TEXT/PHOTO) ---

        // A. WIZARD BERITA (Logika: Foto -> Selesai -> Judul -> Tanggal -> Konten)
        if (text === '📰 Buat Berita') {
            await stateCol.updateOne({ _id: chatId }, { 
                $set: { step: 'news_photos_upload', draft: { gallery: [], images: [] } } 
            }, { upsert: true });
            
            await bot.sendMessage(chatId, 
                "**Langkah 1: Upload Foto & Video**\n\n" +
                "Kirim semua foto/video satu per satu.\n" +
                "Bot akan menyimpannya.\n\n" +
                "➡️ **Ketik tombol 'Selesai / Kembali' jika semua foto sudah terkirim.**", 
                cancelMenu
            );
            return res.send('ok');
        }

        if (userState.step === 'news_photos_upload' && update.message.photo) {
            // 1. Upload ke Cloudinary
            const activeCloud = await cloudCol.findOne({ active: true });
            if(!activeCloud) { await bot.sendMessage(chatId, "⚠️ Error: Cloudinary belum diset."); return res.send('ok'); }
            
            // Silent upload (biar cepet)
            const fileId = update.message.photo[update.message.photo.length - 1].file_id;
            const fileLink = await bot.getFileLink(fileId);
            const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
            
            if (url) {
                const pid = `foto_${Math.floor(Math.random() * 9000) + 1000}`; // ID Random 4 digit
                // 2. Push ke DB State
                await stateCol.updateOne({_id:chatId}, {
                    $push: { 
                        "draft.gallery": { group: pid, type: 'image', src: url, caption: 'Dokumentasi' },
                        "draft.images": url 
                    }
                });
                const code = `<a onclick="openMediaViewer(0, '${pid}')" class="inline-link">[Lihat Foto]</a>`;
                await bot.sendMessage(chatId, `✅ Foto Masuk.\nKode: \`${code}\``, {parse_mode:'Markdown'});
            }
            return res.send('ok');
        }

        if (userState.step === 'news_title_input') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_date_input', "draft.title": text } });
            await bot.sendMessage(chatId, "Langkah 3: Kirim **TANGGAL** (Contoh: 20 Mei 2026):", cancelMenu);
            return res.send('ok');
        }

        if (userState.step === 'news_date_input') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_content_input', "draft.date": text } });
            await bot.sendMessage(chatId, 
                "Langkah 4: Kirim **ISI BERITA**.\n\n" +
                "Gunakan kode link foto tadi di tengah kalimat agar interaktif.", 
                cancelMenu
            );
            return res.send('ok');
        }

        if (userState.step === 'news_content_input') {
            const draft = userState.draft;
            draft.content = text;
            
            // Auto add 'Lihat Semua' link
            draft.content += `<br><br><p class='text-center text-sm text-gray-500'><a onclick="openMediaViewer(0, 'all')" class='inline-link'>[Lihat Semua Dokumentasi]</a></p>`;
            
            // Add 'all' group to gallery
            const allGrp = draft.gallery.map(g => ({...g, group: 'all'}));
            draft.gallery = [...draft.gallery, ...allGrp];

            await newsCol.insertOne(draft);
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ **BERITA TERBIT!**", mainMenu);
            return res.send('ok');
        }

        // B. WIZARD VIDEO
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
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ Video Ditambah!", mainMenu);
            return res.send('ok');
        }

        // C. UPLOAD VISUAL (HERO/PROFIL - LOOPING)
        if (userState.step === 'upload_visual' && update.message.photo) {
            const activeCloud = await cloudCol.findOne({ active: true });
            if (!activeCloud) { await bot.sendMessage(chatId, "⚠️ Set Cloudinary dulu."); return res.send('ok'); }
            
            const fileId = update.message.photo[update.message.photo.length - 1].file_id;
            const fileLink = await bot.getFileLink(fileId);
            const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
            
            if (url) {
                if (userState.mode === 'set_mascot') {
                    await configCol.updateOne({_id:'main'}, {$set: {mascotUrl: url}}, {upsert:true});
                    await bot.sendMessage(chatId, "✅ Mascot ganti!", mainMenu);
                    await stateCol.deleteOne({_id:chatId});
                    return res.send('ok');
                }
                else if (userState.mode.includes('reset')) {
                    // Reset: Hapus semua, isi 1. Lalu ubah mode jadi 'add'
                    const field = userState.mode.includes('hero') ? 'heroImages' : 'profileImages';
                    await configCol.updateOne({_id:'main'}, {$set: {[field]: [url]}}, {upsert:true});
                    
                    const nextMode = userState.mode.includes('hero') ? 'add_hero' : 'add_profile';
                    await stateCol.updateOne({_id:chatId}, {$set: {mode: nextMode}}); // Switch to Add Mode
                    
                    await bot.sendMessage(chatId, "✅ Reset Berhasil. Kirim foto lagi untuk menambah slide.", cancelMenu);
                }
                else {
                    // Add: Push
                    const field = userState.mode.includes('hero') ? 'heroImages' : 'profileImages';
                    await configCol.updateOne({_id:'main'}, {$push: {[field]: url}}, {upsert:true});
                    await bot.sendMessage(chatId, "✅ Foto Ditambah ke Slide.", cancelMenu);
                }
            }
            return res.send('ok');
        }

        // D. EDIT TEXT INFO
        if (userState.step === 'info_title') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'info_content', temp: text } });
            await bot.sendMessage(chatId, "Kirim **Isi Info**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'info_content') {
            await configCol.updateOne({_id:'main'}, {$set: {infoTitle: userState.temp, infoContent: text}}, {upsert:true});
            await stateCol.deleteOne({_id:chatId});
            await bot.sendMessage(chatId, "✅ Info Update!", mainMenu);
            return res.send('ok');
        }

        // E. SETUP CLOUDINARY
        if (userState.step === 'wait_cloud_name') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_preset', temp: text } });
            await bot.sendMessage(chatId, "Kirim **Preset**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'wait_cloud_preset') {
            await cloudCol.updateMany({}, {$set:{active:false}});
            await cloudCol.insertOne({ name: userState.temp, preset: text, active: true, date: new Date() });
            await stateCol.deleteOne({_id:chatId});
            await bot.sendMessage(chatId, "✅ Akun Aktif!", mainMenu);
            return res.send('ok');
        }

        // F. SAVE EDITING
        if (userState.step === 'editing_title' || userState.step === 'editing_content') {
            const col = userState.targetType === 'n' ? newsCol : videoCol;
            const field = (userState.step === 'editing_title') ? (userState.targetType === 'n' ? 'title':'judul') : (userState.targetType === 'n' ? 'content':'deskripsi');
            await col.updateOne({_id: new ObjectId(userState.targetId)}, {$set: {[field]: text}});
            await bot.sendMessage(chatId, "✅ Update Berhasil!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }

        // --- MENU NAVIGATION ---
        switch (text) {
            case '✏️ Edit/Hapus': await bot.sendMessage(chatId, "Apa yang mau diedit?", editTypeMenu); break;
            case '🖼️ Atur Tampilan': await bot.sendMessage(chatId, "Pilih Tampilan:", visualMenu); break;
            case '⚙️ Cloudinary': await bot.sendMessage(chatId, "Menu Cloud:", cloudMenu); break;
            case '❓ Bantuan': await bot.sendMessage(chatId, "Gunakan tombol menu.", mainMenu); break;
        }

        await client.close();
        res.send('ok');
    } else {
        res.send('Bot V9 Final Ready');
    }
}
