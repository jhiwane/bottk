const TelegramBot = require('node-telegram-bot-api');
const { MongoClient, ObjectId } = require('mongodb');
const { removeBackground, uploadToCloudinary } = require('./utils');
const axios = require('axios'); // Tambahkan axios untuk download file text

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;
const adminId = process.env.ADMIN_TELEGRAM_ID;

const bot = new TelegramBot(token);
const client = new MongoClient(mongoUri);

// --- 1. DEFINISI MENU ---

const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📰 Buat Berita', '🎥 Tambah Video Slider'],
            ['🛠️ Kelola Tools', '🖼️ Atur Tampilan'],
            ['✏️ Edit/Hapus', '⚙️ Cloudinary'],
            ['📸 Quick Upload', '❓ Bantuan']
        ],
        resize_keyboard: true
    }
};

const cancelMenu = {
    reply_markup: { keyboard: [['❌ Batal / Selesai']], resize_keyboard: true }
};

const toolsMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Tool Baru', callback_data: 'add_tool' }],
            [{ text: '🗑️ Hapus Tool', callback_data: 'del_tool_list' }]
        ]
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
            [{ text: '🎬 Edit Video Slider', callback_data: 'list_videos' }],
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
            let label = (item.title || item.judul || item.name || "Item").substring(0, 30);
            if (type === 'h') label = `Slide ke-${item.id + 1}`;
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
        const text = (update.message && update.message.text) ? update.message.text : ''; 
        const fromId = update.message ? update.message.from.id : update.callback_query.from.id;

        if (String(fromId) !== String(adminId)) { await bot.sendMessage(chatId, "⛔ Akses Ditolak."); return res.send('ok'); }

        await client.connect();
        const db = client.db('school_db');
        const stateCol = db.collection('bot_state');
        const newsCol = db.collection('news');
        const videoCol = db.collection('videos');
        const toolsCol = db.collection('tools');
        const configCol = db.collection('config');
        const cloudCol = db.collection('cloudinary_accounts');

        let userState = await stateCol.findOne({ _id: chatId }) || {};

        // --- GLOBAL CANCEL ---
        if (text === '❌ Batal / Selesai' || text === '/start') {
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "Menu Utama:", mainMenu);
            return res.send('ok');
        }

        // --- CALLBACK QUERY ---
        if (update.callback_query) {
            const data = update.callback_query.data;
            await bot.answerCallbackQuery(update.callback_query.id);

            if(data === 'force_cancel') { await stateCol.deleteOne({ _id: chatId }); await bot.sendMessage(chatId, "Dibatalkan.", mainMenu); }

            // TOOLS HANDLER
            if (data === 'add_tool') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'tool_content' } }, { upsert: true });
                await bot.sendMessage(chatId, 
                    "Kirim Konten Tool:\n\n" +
                    "1. 📄 **Kirim File HTML** (Untuk Aplikasi Web/Game).\n" +
                    "2. 🔗 **Kirim Link URL** (Untuk Google Form/Drive).\n\n" +
                    "Silahkan kirim sekarang:", cancelMenu);
            }
            if (data === 'del_tool_list') {
                const items = await toolsCol.find({}).toArray();
                if(items.length===0) await bot.sendMessage(chatId, "Kosong.");
                else await bot.sendMessage(chatId, "Pilih Tool dihapus:", { reply_markup: createListKeyboard(items, 't') });
            }

            // VISUAL & OTHERS (SAMA SEPERTI SEBELUMNYA)
            if (['add_hero', 'reset_hero', 'add_profile', 'reset_profile', 'set_mascot'].includes(data)) { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'upload_visual', mode: data } }, { upsert: true }); await bot.sendMessage(chatId, "Kirim Foto/Link:", cancelMenu); }
            if (data === 'set_info_text') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'info_title' } }, { upsert: true }); await bot.sendMessage(chatId, "Kirim Judul Info:", cancelMenu); }
            if (data === 'add_cloud') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_name' } }, { upsert: true }); await bot.sendMessage(chatId, "Kirim Cloud Name:", cancelMenu); }
            if (data === 'list_cloud') { const accs = await cloudCol.find({}).toArray(); let m="Akun:\n"; accs.forEach(a=>m+=`- ${a.name}\n`); await bot.sendMessage(chatId, m, mainMenu); }
            
            // LISTING & ACTIONS
            if (data === 'list_news') { const i=await newsCol.find({}).sort({_id:-1}).limit(10).toArray(); await bot.sendMessage(chatId,"Pilih:",{reply_markup:createListKeyboard(i,'n')}); }
            if (data === 'list_videos') { const i=await videoCol.find({}).sort({_id:-1}).limit(10).toArray(); await bot.sendMessage(chatId,"Pilih:",{reply_markup:createListKeyboard(i,'v')}); }
            if (data === 'list_hero') { const c=await configCol.findOne({_id:'main'}); if(c&&c.heroImages){ const h=c.heroImages.map((u,i)=>({_id:i,id:i})); await bot.sendMessage(chatId,"Hapus:",{reply_markup:createListKeyboard(h,'h')}); }}

            if (data.startsWith('sel_')) {
                const [_, type, id] = data.split('_');
                if(type==='t') { await toolsCol.deleteOne({_id:new ObjectId(id)}); await bot.sendMessage(chatId,"🗑️ Tool Dihapus.",mainMenu); return res.send('ok'); }
                if(type==='h') { const c=await configCol.findOne({_id:'main'}); const nh=c.heroImages.filter((_,i)=>i!==parseInt(id)); await configCol.updateOne({_id:'main'},{$set:{heroImages:nh}}); await bot.sendMessage(chatId,"Terhapus.",mainMenu); return res.send('ok'); }
                await stateCol.updateOne({_id:chatId},{$set:{targetId:id, targetType:type}},{upsert:true});
                await bot.sendMessage(chatId,"Aksi:",{reply_markup:{inline_keyboard:[[{text:'Edit Judul',callback_data:'do_edit_title'}],[{text:'Edit Isi',callback_data:'do_edit_content'}],[{text:'Hapus',callback_data:'do_delete'}]]}});
            }

            if (data === 'do_delete') { const col=userState.targetType==='n'?newsCol:videoCol; await col.deleteOne({_id:new ObjectId(userState.targetId)}); await bot.sendMessage(chatId,"Dihapus.",mainMenu); await stateCol.deleteOne({_id:chatId}); }
            if (data === 'do_edit_title') { await stateCol.updateOne({_id:chatId},{$set:{step:'editing_title'}}); await bot.sendMessage(chatId,"Judul Baru:",cancelMenu); }
            if (data === 'do_edit_content') { await stateCol.updateOne({_id:chatId},{$set:{step:'editing_content'}}); await bot.sendMessage(chatId,"Isi Baru:",cancelMenu); }

            return res.send('ok');
        }

        // --- INPUT HANDLER ---

        // A. TOOLS WIZARD (LOGIKA BARU: HTML HOSTING DI MONGODB)
        if (text === '🛠️ Kelola Tools') {
            await bot.sendMessage(chatId, "Menu Tools:", toolsMenu);
            return res.send('ok');
        }
        if (userState.step === 'tool_content') {
            const waitMsg = await bot.sendMessage(chatId, "⏳ Memproses data...");
            let toolData = {};

            // 1. JIKA FILE HTML/TXT
            if (update.message.document) {
                try {
                    const fileId = update.message.document.file_id;
                    const fileName = update.message.document.file_name;
                    
                    // Khusus File HTML: Download isinya, simpan Text-nya ke DB
                    if (fileName.endsWith('.html') || fileName.endsWith('.htm') || fileName.endsWith('.txt')) {
                        const fileLink = await bot.getFileLink(fileId);
                        
                        // Download isi file menggunakan Axios
                        const response = await axios.get(fileLink, { responseType: 'text' });
                        const htmlContent = response.data;

                        // Simpan ke State Sementara
                        toolData = { type: 'html_code', content: htmlContent };
                        
                    } else {
                        // Jika PDF/APK/DOC -> Tetap Upload ke Cloudinary (Fallback)
                        const activeCloud = await cloudCol.findOne({ active: true });
                        if(!activeCloud) throw new Error("Cloudinary belum diset.");
                        
                        const fileLink = await bot.getFileLink(fileId);
                        const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                        if(!url) throw new Error("Gagal upload Cloudinary.");
                        
                        toolData = { type: 'url', content: url };
                    }
                } catch (e) {
                    await bot.deleteMessage(chatId, waitMsg.message_id);
                    await bot.sendMessage(chatId, `❌ Error: ${e.message}`);
                    return res.send('ok');
                }
            } 
            // 2. JIKA LINK URL
            else if (text.startsWith('http')) {
                toolData = { type: 'url', content: text.trim() };
            } 
            else {
                await bot.deleteMessage(chatId, waitMsg.message_id);
                await bot.sendMessage(chatId, "❌ Input salah. Kirim File HTML atau Link URL.");
                return res.send('ok');
            }

            await bot.deleteMessage(chatId, waitMsg.message_id);
            
            // Simpan Data Sementara & Lanjut ke Nama
            await stateCol.updateOne({ _id: chatId }, { 
                $set: { step: 'tool_name', tempTool: toolData } 
            });
            await bot.sendMessage(chatId, "✅ Data diterima!\n\nSekarang kirim **NAMA TOOL** (Contoh: Game Edukasi):", cancelMenu);
            return res.send('ok');
        }

        if (userState.step === 'tool_name') {
            const tData = userState.tempTool;
            
            await toolsCol.insertOne({
                name: text,
                type: tData.type, // 'html_code' atau 'url'
                content: tData.content, // Isi HTML atau URL Link
                url: (tData.type === 'url') ? tData.content : null, // Kompatibilitas
                date: new Date()
            });
            
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, `✅ Tool **"${text}"** berhasil ditambahkan dan siap digunakan!`, mainMenu);
            return res.send('ok');
        }

        // B. BERITA WIZARD
        if (text === '📰 Buat Berita') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_photos_upload', draft: { gallery: [], images: [] } } }, { upsert: true });
            await bot.sendMessage(chatId, "Upload Foto/Link Youtube. Ketik 'Selesai' jika beres.", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'news_photos_upload') {
            let finalUrl = null; let type = 'image';
            const waitMsg = await bot.sendMessage(chatId, "⏳...");

            if (update.message.photo) {
                const activeCloud = await cloudCol.findOne({ active: true });
                if(activeCloud) {
                    const fid = update.message.photo[update.message.photo.length - 1].file_id;
                    const flink = await bot.getFileLink(fid);
                    finalUrl = await uploadToCloudinary(flink, activeCloud.name, activeCloud.preset);
                }
            } else if (text && (text.includes('youtu') || text.startsWith('http'))) {
                finalUrl = text.trim();
                if(text.includes('youtu')) type = 'video';
            }

            await bot.deleteMessage(chatId, waitMsg.message_id);

            if (finalUrl) {
                const pid = `media_${userState.draft.gallery.length + 1}`;
                const pushData = { "draft.gallery": { group: pid, type: type, src: finalUrl, caption: 'Dokumentasi' } };
                if (type === 'image') pushData["draft.images"] = finalUrl; 

                await stateCol.updateOne({_id:chatId}, { $push: pushData });
                const code = type === 'video' ? `<a onclick="openMediaViewer(0, '${pid}')" class="inline-link video-link">[Lihat Video]</a>` : `<a onclick="openMediaViewer(0, '${pid}')" class="inline-link">[Lihat Foto]</a>`;
                await bot.sendMessage(chatId, `✅ Masuk.\nKode: \`${code}\``, {parse_mode:'Markdown'});
            
            } else if (text && text.toLowerCase().includes('selesai')) {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_title_input' } });
                await bot.sendMessage(chatId, "Judul Berita:", cancelMenu);
            }
            return res.send('ok');
        }
        if (userState.step === 'news_title_input') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_date_input', "draft.title": text } }); await bot.sendMessage(chatId, "Tanggal:", cancelMenu); return res.send('ok'); }
        if (userState.step === 'news_date_input') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_content_input', "draft.date": text } }); await bot.sendMessage(chatId, "Isi Berita:", cancelMenu); return res.send('ok'); }
        if (userState.step === 'news_content_input') { 
            const draft = userState.draft; draft.content = text; 
            const allGrp = draft.gallery.map(g => ({...g, group: 'all'})); draft.gallery = [...draft.gallery, ...allGrp];
            await newsCol.insertOne(draft); await stateCol.deleteOne({ _id: chatId }); await bot.sendMessage(chatId, "✅ Terbit!", mainMenu); return res.send('ok'); 
        }

        // C. VIDEO & VISUALS
        if (text === '🎥 Tambah Video Slider') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_title', draft: {} } }, { upsert: true }); await bot.sendMessage(chatId, "Judul Video:", cancelMenu); return res.send('ok'); }
        if (userState.step === 'vid_title') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_desc', "draft.judul": text } }); await bot.sendMessage(chatId, "Deskripsi:", cancelMenu); return res.send('ok'); }
        if (userState.step === 'vid_desc') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_url', "draft.deskripsi": text } }); await bot.sendMessage(chatId, "Link Youtube:", cancelMenu); return res.send('ok'); }
        if (userState.step === 'vid_url') { await videoCol.insertOne({ judul: userState.draft.judul, deskripsi: userState.draft.deskripsi, url: text }); await stateCol.deleteOne({ _id: chatId }); await bot.sendMessage(chatId, "✅ Video Ditambah!", mainMenu); return res.send('ok'); }

        if (userState.step === 'info_title') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'info_content', temp: text } }); await bot.sendMessage(chatId, "Isi Info:", cancelMenu); return res.send('ok'); }
        if (userState.step === 'info_content') { await configCol.updateOne({_id:'main'}, {$set: {infoTitle: userState.temp, infoContent: text}}, {upsert:true}); await stateCol.deleteOne({_id:chatId}); await bot.sendMessage(chatId, "✅ Info Update!", mainMenu); return res.send('ok'); }
        if (userState.step === 'wait_cloud_name') { await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_preset', temp: text } }); await bot.sendMessage(chatId, "Preset:", cancelMenu); return res.send('ok'); }
        if (userState.step === 'wait_cloud_preset') { await cloudCol.updateMany({}, {$set:{active:false}}); await cloudCol.insertOne({ name: userState.temp, preset: text, active: true, date: new Date() }); await stateCol.deleteOne({_id:chatId}); await bot.sendMessage(chatId, "✅ Cloudinary Aktif!", mainMenu); return res.send('ok'); }
        
        if (userState.step === 'editing_title' || userState.step === 'editing_content') {
            const col = userState.targetType === 'n' ? newsCol : videoCol;
            const field = (userState.step === 'editing_title') ? (userState.targetType === 'n' ? 'title':'judul') : (userState.targetType === 'n' ? 'content':'deskripsi');
            await col.updateOne({_id: new ObjectId(userState.targetId)}, {$set: {[field]: text}});
            await bot.sendMessage(chatId, "✅ Update Berhasil!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }
        if (userState.step === 'upload_visual' && (text.startsWith('http'))) {
             const finalUrl = text.trim();
             const field = userState.mode.includes('hero') ? 'heroImages' : 'profileImages';
             if (userState.mode === 'set_mascot') await configCol.updateOne({_id:'main'}, {$set: {mascotUrl: finalUrl}}, {upsert:true});
             else if (userState.mode.includes('reset')) await configCol.updateOne({_id:'main'}, {$set: {[field]: [finalUrl]}}, {upsert:true});
             else await configCol.updateOne({_id:'main'}, {$push: {[field]: finalUrl}}, {upsert:true});
             await bot.sendMessage(chatId, "✅ Visual Update.", cancelMenu);
             return res.send('ok');
        }

        // QUICK UPLOAD
        if (update.message.photo && !userState.step) {
            const activeCloud = await cloudCol.findOne({ active: true });
            if (activeCloud) {
                const waitMsg = await bot.sendMessage(chatId, "📸 Quick Upload...");
                const fid = update.message.photo[update.message.photo.length - 1].file_id;
                const flink = await bot.getFileLink(fid);
                const url = await uploadToCloudinary(flink, activeCloud.name, activeCloud.preset);
                await bot.deleteMessage(chatId, waitMsg.message_id);
                if(url) await bot.sendMessage(chatId, `🔗 Link: \`${url}\``, {parse_mode:'Markdown'});
            }
        }

        if (!userState.step) {
            switch (text) {
                case '✏️ Edit/Hapus': await bot.sendMessage(chatId, "Pilih Tipe:", editTypeMenu); break;
                case '🖼️ Atur Tampilan': await bot.sendMessage(chatId, "Pilih Tampilan:", visualMenu); break;
                case '⚙️ Cloudinary': await bot.sendMessage(chatId, "Menu Cloud:", cloudMenu); break;
                case '🛠️ Kelola Tools': await bot.sendMessage(chatId, "Menu Tools:", toolsMenu); break;
                case '📸 Quick Upload': await bot.sendMessage(chatId, "Kirim foto untuk dapat Link.", mainMenu); break;
                case '❓ Bantuan': await bot.sendMessage(chatId, "Gunakan tombol.", mainMenu); break;
            }
        }

        await client.close();
        res.send('ok');
    } else {
        res.send('Bot V15 Final');
    }
}
