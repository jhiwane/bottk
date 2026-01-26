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

// Menu Visual
const visualMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Slide Hero', callback_data: 'add_hero' }, { text: '🔄 Ganti Total Hero (Reset)', callback_data: 'reset_hero' }],
            [{ text: '➕ Tambah Slide Profil', callback_data: 'add_profile' }, { text: '🔄 Ganti Total Profil (Reset)', callback_data: 'reset_profile' }],
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

        // --- GLOBAL CANCEL ---
        if (text === '❌ Batal / Selesai' || text === '/start') {
            // Khusus News Upload: Cek minimal 1 foto sebelum keluar
            if (userState.step === 'news_photos_upload' && text === '❌ Batal / Selesai') {
                if (userState.draft && userState.draft.gallery && userState.draft.gallery.length > 0) {
                    await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_title_input' } });
                    await bot.sendMessage(chatId, "✅ Foto tersimpan.\n\nSekarang kirim **JUDUL BERITA**:", cancelMenu);
                    return res.send('ok');
                } else {
                    await bot.sendMessage(chatId, "⚠️ Belum ada foto! Upload dulu atau batalkan total.", {
                        reply_markup: { inline_keyboard: [[{text:'Batalkan Semua', callback_data:'force_cancel'}]] }
                    });
                    return res.send('ok');
                }
            }
            
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "Reset. Menu Utama:", mainMenu);
            return res.send('ok');
        }

        // --- CALLBACK QUERY ---
        if (update.callback_query) {
            const data = update.callback_query.data;
            await bot.answerCallbackQuery(update.callback_query.id);

            if(data === 'force_cancel') {
                await stateCol.deleteOne({ _id: chatId });
                await bot.sendMessage(chatId, "Dibatalkan.", mainMenu);
            }

            // A. VISUAL
            if (['add_hero', 'reset_hero', 'add_profile', 'reset_profile', 'set_mascot'].includes(data)) {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'upload_visual', mode: data } }, { upsert: true });
                let m = "📸 **Kirim FOTO** (Upload Baru)\n🔗 **Atau Kirim LINK** (Pakai Foto Lama)\n\nBisa kirim banyak sekaligus. Ketik tombol Selesai jika sudah.";
                if(data.includes('reset')) m = "⚠️ **RESET MODE**\nKirim 1 Foto/Link. Data lama akan DIHAPUS PERMANEN dan diganti ini.";
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

            // C. EDIT/HAPUS
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

            // D. ACTIONS
            if (data.startsWith('sel_')) {
                const [_, type, id] = data.split('_');
                
                if (type === 'h') { 
                    const conf = await configCol.findOne({_id: 'main'});
                    const newHero = conf.heroImages.filter((_, idx) => idx !== parseInt(id));
                    // $set akan menghapus array lama dan mengganti dgn yg baru (Data lama hilang permanen)
                    await configCol.updateOne({_id: 'main'}, {$set: {heroImages: newHero}});
                    await bot.sendMessage(chatId, "🗑️ Slide dihapus permanen.", mainMenu);
                    return res.send('ok');
                }

                await stateCol.updateOne({ _id: chatId }, { $set: { targetId: id, targetType: type } }, { upsert: true });
                await bot.sendMessage(chatId, "Pilih Aksi:", {
                    reply_markup: { inline_keyboard: [
                        [{ text: '✏️ Edit Judul', callback_data: 'do_edit_title' }],
                        [{ text: '📝 Edit Isi', callback_data: 'do_edit_content' }],
                        [{ text: '🗑️ HAPUS PERMANEN', callback_data: 'do_delete' }]
                    ]}
                });
            }

            if (data === 'do_delete') {
                const col = userState.targetType === 'n' ? newsCol : videoCol;
                await col.deleteOne({ _id: new ObjectId(userState.targetId) }); // Hapus permanen
                await bot.sendMessage(chatId, "🗑️ Data terhapus permanen dari database.", mainMenu);
                await stateCol.deleteOne({_id:chatId});
            }
            if (data === 'do_edit_title') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_title' } });
                await bot.sendMessage(chatId, "Kirim Judul Baru:", cancelMenu);
            }
            if (data === 'do_edit_content') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_content' } });
                await bot.sendMessage(chatId, "Kirim Isi Baru:", cancelMenu);
            }

            return res.send('ok');
        }

        // --- 4. INPUT HANDLER ---

        // A. WIZARD BERITA (Step 1: Upload Foto/Link)
        if (text === '📰 Buat Berita') {
            await stateCol.updateOne({ _id: chatId }, { 
                $set: { step: 'news_photos_upload', draft: { gallery: [], images: [] } } 
            }, { upsert: true });
            
            await bot.sendMessage(chatId, 
                "**Langkah 1: Upload Dokumentasi**\n\n" +
                "Kirim FOTO satu per satu, ATAU kirim LINK gambar (jika sudah ada).\n" +
                "Bot akan memberi kode link untuk setiap foto.\n\n" +
                "➡️ **Ketik tombol 'Selesai' jika semua foto masuk.**", 
                cancelMenu
            );
            return res.send('ok');
        }

        if (userState.step === 'news_photos_upload') {
            let finalUrl = null;

            // STATUS: UPLOADING
            const waitMsg = await bot.sendMessage(chatId, "⏳ Memproses...");

            // Cek Input: Foto atau Link?
            if (update.message.photo) {
                const activeCloud = await cloudCol.findOne({ active: true });
                if(!activeCloud) { 
                    await bot.deleteMessage(chatId, waitMsg.message_id);
                    await bot.sendMessage(chatId, "⚠️ Cloudinary belum diset! Tidak bisa upload."); 
                    return res.send('ok'); 
                }
                
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                // Upload ke Cloudinary
                finalUrl = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
            
            } else if (text && text.startsWith('http')) {
                // Jika user kirim Link (Reuse link lama)
                finalUrl = text;
            }

            // Hapus pesan loading
            await bot.deleteMessage(chatId, waitMsg.message_id);

            if (finalUrl) {
                const pid = `foto_${Math.floor(Math.random() * 9000) + 1000}`;
                await stateCol.updateOne({_id:chatId}, {
                    $push: { 
                        "draft.gallery": { group: pid, type: 'image', src: finalUrl, caption: 'Dokumentasi' },
                        "draft.images": finalUrl 
                    }
                });
                
                // BERI LINK FALLBACK KE USER
                const code = `<a onclick="openMediaViewer(0, '${pid}')" class="inline-link">[Lihat Foto]</a>`;
                await bot.sendMessage(chatId, 
                    `✅ **Berhasil!**\n\n` +
                    `Link Url: \`${finalUrl}\` (Salin ini jika mau dipakai lagi nanti)\n` +
                    `Kode Artikel: \`${code}\` (Copy untuk taruh di tulisan)`, 
                    {parse_mode:'Markdown'}
                );
            } else if (!text.includes('Selesai')) {
                await bot.sendMessage(chatId, "❌ Gagal memproses. Kirim foto atau link yang valid.");
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
            await bot.sendMessage(chatId, "Langkah 4: Kirim **ISI BERITA** (Paste kode foto tadi disini):", cancelMenu);
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

        // B. UPLOAD VISUAL (HERO/PROFIL) - SUPPORT LINK & FOTO
        if (userState.step === 'upload_visual') {
            let finalUrl = null;
            const waitMsg = await bot.sendMessage(chatId, "⏳ Memproses...");

            if (update.message.photo) {
                const activeCloud = await cloudCol.findOne({ active: true });
                if(!activeCloud) { 
                    await bot.deleteMessage(chatId, waitMsg.message_id);
                    await bot.sendMessage(chatId, "⚠️ Set Cloudinary dulu."); return res.send('ok'); 
                }
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                finalUrl = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
            } else if (text && text.startsWith('http')) {
                finalUrl = text;
            }

            await bot.deleteMessage(chatId, waitMsg.message_id);

            if (finalUrl) {
                if (userState.mode === 'set_mascot') {
                    await configCol.updateOne({_id:'main'}, {$set: {mascotUrl: finalUrl}}, {upsert:true});
                    await bot.sendMessage(chatId, "✅ Mascot ganti!", mainMenu);
                    await stateCol.deleteOne({_id:chatId});
                }
                else if (userState.mode.includes('reset')) {
                    // RESET = TIMPA ($set)
                    const field = userState.mode.includes('hero') ? 'heroImages' : 'profileImages';
                    await configCol.updateOne({_id:'main'}, {$set: {[field]: [finalUrl]}}, {upsert:true});
                    
                    const nextMode = userState.mode.includes('hero') ? 'add_hero' : 'add_profile';
                    await stateCol.updateOne({_id:chatId}, {$set: {mode: nextMode}});
                    await bot.sendMessage(chatId, `✅ Reset Sukses! Data lama terhapus.\nLink: \`${finalUrl}\`\nKirim lagi untuk menambah.`, {parse_mode:'Markdown', ...cancelMenu});
                }
                else {
                    // ADD = TAMBAH ($push)
                    const field = userState.mode.includes('hero') ? 'heroImages' : 'profileImages';
                    await configCol.updateOne({_id:'main'}, {$push: {[field]: finalUrl}}, {upsert:true});
                    await bot.sendMessage(chatId, `✅ Ditambahkan.\nLink: \`${finalUrl}\``, {parse_mode:'Markdown', ...cancelMenu});
                }
            } else if (!text.includes('Selesai')) {
                await bot.sendMessage(chatId, "❌ Input tidak valid (Kirim Foto atau Link).");
            }
            return res.send('ok');
        }

        // C. INFO TEKS
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
            await bot.sendMessage(chatId, "Kirim **Link YouTube**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_url') {
            await videoCol.insertOne({ judul: userState.draft.judul, deskripsi: userState.draft.deskripsi, url: text });
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ Video Ditambah!", mainMenu);
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

        // F. SAVE EDIT
        if (userState.step === 'editing_title' || userState.step === 'editing_content') {
            const col = userState.targetType === 'n' ? newsCol : videoCol;
            const field = (userState.step === 'editing_title') ? (userState.targetType === 'n' ? 'title':'judul') : (userState.targetType === 'n' ? 'content':'deskripsi');
            await col.updateOne({_id: new ObjectId(userState.targetId)}, {$set: {[field]: text}});
            await bot.sendMessage(chatId, "✅ Update Berhasil!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }

        // MENU NAVIGASI
        switch (text) {
            case '✏️ Edit/Hapus': await bot.sendMessage(chatId, "Pilih Tipe:", editTypeMenu); break;
            case '🖼️ Atur Tampilan': await bot.sendMessage(chatId, "Pilih Tampilan:", visualMenu); break;
            case '⚙️ Cloudinary': await bot.sendMessage(chatId, "Cloudinary:", cloudMenu); break;
            case '❓ Bantuan': await bot.sendMessage(chatId, "Gunakan tombol menu.", mainMenu); break;
        }

        await client.close();
        res.send('ok');
    } else {
        res.send('Bot V10 Final Fixed');
    }
}
