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
            ['📰 Buat Berita Baru', '🎥 Tambah Video'],
            ['✏️ Edit/Hapus', '🖼️ Ganti Hero/Profil'],
            ['⚙️ Kelola Cloudinary', '❓ Bantuan']
        ],
        resize_keyboard: true
    }
};

const cancelMenu = {
    reply_markup: { keyboard: [['✅ Selesai / Kembali']], resize_keyboard: true }
};

// Menu Visual
const visualMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Slide Hero', callback_data: 'add_hero' }, { text: '🔄 Reset Hero (Hapus Lama)', callback_data: 'reset_hero' }],
            [{ text: '➕ Tambah Slide Profil', callback_data: 'add_profile' }, { text: '🔄 Reset Profil (Hapus Lama)', callback_data: 'reset_profile' }],
            [{ text: '🤖 Ganti Mascot', callback_data: 'set_mascot' }],
            [{ text: '📝 Edit Teks Info', callback_data: 'set_info_text' }]
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
            await bot.sendMessage(chatId, "⛔ Anda bukan Admin.");
            return res.send('ok');
        }

        await client.connect();
        const db = client.db('school_db');
        const stateCol = db.collection('bot_state');
        const newsCol = db.collection('news');
        const videoCol = db.collection('videos');
        const configCol = db.collection('config');
        const cloudCol = db.collection('cloudinary_accounts');

        // Ambil State
        let userState = await stateCol.findOne({ _id: chatId }) || {};

        // --- 1. HANDLER BATAL / SELESAI ---
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
            if (['add_hero', 'reset_hero', 'add_profile', 'reset_profile', 'set_mascot'].includes(data)) {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'upload_visual', mode: data } }, { upsert: true });
                let msg = "📸 **Mode Upload Aktif**\n\nSilahkan kirim foto sebanyak-banyaknya.\nBot akan memproses satu per satu.\n\nKetik **'Selesai'** jika sudah semua.";
                if(data === 'set_mascot') msg = "Kirim 1 Foto Mascot (GIF/PNG Transparan).";
                if(data.includes('reset')) msg = "⚠️ **PERINGATAN RESET**\nKirim 1 foto pertama. Foto ini akan MENGHAPUS semua slide lama dan menjadi slide pertama.";
                await bot.sendMessage(chatId, msg, cancelMenu);
            }
            if (data === 'set_info_text') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'info_title' } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirim **Judul Info** (misal: Pengumuman Penting):", cancelMenu);
            }

            // B. CLOUDINARY
            if (data === 'add_cloud') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_name' } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirim **Cloud Name**:", cancelMenu);
            }
            if (data === 'list_cloud') {
                const accs = await cloudCol.find({}).toArray();
                let msg = "📋 **Akun Cloud:**\n";
                accs.forEach(a => msg += `- ${a.name} (${a.active ? '✅' : '❌'})\n`);
                await bot.sendMessage(chatId, msg || "Belum ada akun.", mainMenu);
            }

            // C. EDIT LIST
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

            // D. ACTION SELECT
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
                await bot.sendMessage(chatId, "Pilih Aksi:", {
                    reply_markup: { inline_keyboard: [
                        [{ text: '✏️ Edit Judul', callback_data: 'do_edit_title' }],
                        [{ text: '📝 Edit Konten', callback_data: 'do_edit_content' }],
                        [{ text: '🗑️ HAPUS', callback_data: 'do_delete' }]
                    ]}
                });
            }

            // E. EXECUTE EDIT/DELETE
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
                await bot.sendMessage(chatId, "Kirim Konten Baru:", cancelMenu);
            }

            return res.send('ok');
        }

        // --- 3. INPUT USER HANDLER ---

        // A. WIZARD BERITA
        if (text === '📰 Buat Berita Baru') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_title_input', draft: { gallery: [], images: [] } } }, { upsert: true });
            await bot.sendMessage(chatId, "Langkah 1: Kirim **JUDUL BERITA**:", cancelMenu);
            return res.send('ok');
        }

        if (userState.step === 'news_title_input') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_photos_upload', "draft.title": text } });
            await bot.sendMessage(chatId, 
                `Judul: "${text}"\n\n` +
                "Langkah 2: **Kirim SEMUA FOTO**\n\n" +
                "👉 Kirim foto sebanyak-banyaknya.\n" +
                "👉 Bot akan menyimpannya satu per satu.\n" +
                "👉 Setelah semua foto terkirim, KETIK **'Selesai'**.", 
                cancelMenu
            );
            return res.send('ok');
        }

        if (userState.step === 'news_photos_upload') {
            if (update.message.photo) {
                // Upload
                const activeCloud = await cloudCol.findOne({ active: true });
                if(!activeCloud) { await bot.sendMessage(chatId, "⚠️ Error: Cloudinary belum diset."); return res.send('ok'); }
                
                // Jangan pakai await bot.sendChatAction (biar ngebut di background)
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                
                if (url) {
                    const pid = `foto_${Math.floor(Math.random() * 9000) + 1000}`; // Random ID 4 digit
                    
                    // PUSH ATOMIC KE DATABASE (Kunci Perbaikan!)
                    await stateCol.updateOne({_id:chatId}, {
                        $push: { 
                            "draft.gallery": { group: pid, type: 'image', src: url, caption: 'Dokumentasi' },
                            "draft.images": url 
                        }
                    });
                    
                    const code = `<a onclick="openMediaViewer(0, '${pid}')" class="inline-link">[Lihat Foto]</a>`;
                    await bot.sendMessage(chatId, `✅ Foto tersimpan. Kode: \`${code}\``, {parse_mode:'Markdown'});
                }
            } 
            else if (text && text.toLowerCase().includes('selesai')) {
                // FETCH ULANG STATE DARI DB (Kunci Perbaikan!)
                const freshState = await stateCol.findOne({ _id: chatId });
                
                if (!freshState.draft.gallery || freshState.draft.gallery.length === 0) {
                    await bot.sendMessage(chatId, "⚠️ Galeri masih kosong! Kirim foto dulu, baru ketik Selesai.");
                    return res.send('ok');
                }

                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_date_input' } });
                await bot.sendMessage(chatId, "Langkah 3: Kirim **TANGGAL** (contoh: 20 Mei 2026):", cancelMenu);
            }
            return res.send('ok');
        }

        if (userState.step === 'news_date_input') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_content_input', "draft.date": text } });
            await bot.sendMessage(chatId, "Langkah 4: Kirim **ISI BERITA** (HTML OK, Link OK):", cancelMenu);
            return res.send('ok');
        }

        if (userState.step === 'news_content_input') {
            const draft = userState.draft;
            draft.content = text;
            draft.content += `<br><br><p class='text-center text-sm text-gray-500'><a onclick="openMediaViewer(0, 'all')" class='inline-link'>[Lihat Semua Dokumentasi]</a></p>`;
            
            // Add 'all' group
            const allGrp = draft.gallery.map(g => ({...g, group: 'all'}));
            draft.gallery = [...draft.gallery, ...allGrp];

            await newsCol.insertOne(draft);
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ **BERITA TERBIT!**", mainMenu);
            return res.send('ok');
        }

        // B. UPLOAD VISUAL (HERO/PROFIL/MASCOT) - VERSI LOOPING
        if (userState.step === 'upload_visual') {
            if (update.message.photo) {
                const activeCloud = await cloudCol.findOne({ active: true });
                if(!activeCloud) { await bot.sendMessage(chatId, "⚠️ Set Cloudinary dulu."); return res.send('ok'); }
                
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
                        // Reset = Replace All
                        const field = userState.mode.includes('hero') ? 'heroImages' : 'profileImages';
                        await configCol.updateOne({_id:'main'}, {$set: {[field]: [url]}}, {upsert:true});
                        
                        // Switch mode ke 'add' supaya foto berikutnya menambah
                        const nextMode = userState.mode.includes('hero') ? 'add_hero' : 'add_profile';
                        await stateCol.updateOne({_id:chatId}, {$set: {mode: nextMode}});
                        
                        await bot.sendMessage(chatId, "✅ Slide Direset & Foto 1 masuk. Kirim foto lagi untuk menambah.", cancelMenu);
                    }
                    else {
                        // Add = Push
                        const field = userState.mode.includes('hero') ? 'heroImages' : 'profileImages';
                        await configCol.updateOne({_id:'main'}, {$push: {[field]: url}}, {upsert:true});
                        await bot.sendMessage(chatId, "✅ Foto ditambahkan ke Slide.", cancelMenu);
                    }
                }
            } 
            else if (text && text.toLowerCase().includes('selesai')) {
                await stateCol.deleteOne({_id:chatId});
                await bot.sendMessage(chatId, "✅ Selesai mengatur slide.", mainMenu);
            }
            return res.send('ok');
        }

        // ... Sisa logika Video, Cloudinary, Edit Text Info sama seperti sebelumnya ...
        // (Saya singkat agar muat, tapi bagian Upload & Berita di atas adalah kuncinya)

        // C. WIZARD VIDEO
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

        // D. INFO TEKS
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

        // E. CLOUDINARY
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

        // F. EDIT SAVE
        if (userState.step === 'editing_title' || userState.step === 'editing_content') {
            const col = userState.targetType === 'n' ? newsCol : videoCol;
            const field = (userState.step === 'editing_title') ? (userState.targetType === 'n' ? 'title':'judul') : (userState.targetType === 'n' ? 'content':'deskripsi');
            await col.updateOne({_id: new ObjectId(userState.targetId)}, {$set: {[field]: text}});
            await bot.sendMessage(chatId, "✅ Update Berhasil!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }

        switch (text) {
            case '🖼️ Ganti Hero/Profil': await bot.sendMessage(chatId, "Pilih Tampilan:", visualMenu); break;
            case '✏️ Edit/Hapus': await bot.sendMessage(chatId, "Pilih Tipe:", editTypeMenu); break;
            case '⚙️ Kelola Cloudinary': await bot.sendMessage(chatId, "Cloudinary:", cloudMenu); break;
            case '❓ Bantuan': await bot.sendMessage(chatId, "Gunakan tombol menu.", mainMenu); break;
        }

        await client.close();
        res.send('ok');
    } else {
        res.send('Bot V8 Ready');
    }
}
