require('dotenv').config();
const mineflayer = require('mineflayer');
const express    = require('express');
const cors       = require('cors');
const crypto     = require('crypto');

const app = express();

// ═══════════════════════════════════════════════════
//  CORS — يقبل فقط من مدونة NONETWORK
// ═══════════════════════════════════════════════════
const ALLOWED_ORIGINS = [
    'https://nonetworkofficial.blogspot.com',
    'http://localhost'   // للتطوير المحلي فقط
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS: طلب مرفوض من ' + origin));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-session-id']
}));

app.use(express.json());

// ═══════════════════════════════════════════════════
//  جميع إصدارات ماين كرافت المدعومة
// ═══════════════════════════════════════════════════
const MC_VERSIONS = [
    '1.8.9',
    '1.9','1.9.1','1.9.2','1.9.3','1.9.4',
    '1.10','1.10.1','1.10.2',
    '1.11','1.11.1','1.11.2',
    '1.12','1.12.1','1.12.2',
    '1.13','1.13.1','1.13.2',
    '1.14','1.14.1','1.14.2','1.14.3','1.14.4',
    '1.15','1.15.1','1.15.2',
    '1.16','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5',
    '1.17','1.17.1',
    '1.18','1.18.1','1.18.2',
    '1.19','1.19.1','1.19.2','1.19.3','1.19.4',
    '1.20','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.6',
    '1.21','1.21.1','1.21.2','1.21.3','1.21.4',
    '1.21.5','1.21.6','1.21.7','1.21.8','1.21.9',
    '1.21.10','1.21.11',
    '26.1','26.1.1','26.1.2','26.2'
];

// ═══════════════════════════════════════════════════
//  تخزين البوتات — كل مستخدم له session_id خاص
// ═══════════════════════════════════════════════════
const sessions = new Map();
// sessions[id] = { bot, status, host, port, username, version, chatLog, createdAt }

const MAX_BOTS = 20; // حد أقصى للبوتات المتزامنة
const SESSION_TTL = 1000 * 60 * 60 * 2; // ساعتان ثم يُحذف تلقائياً

// تنظيف السيشنز القديمة كل 30 دقيقة
setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions.entries()) {
        if (now - s.createdAt > SESSION_TTL) {
            if (s.bot) { try { s.bot.quit('Session expired'); } catch(e){} }
            sessions.delete(id);
            console.log('🧹 حُذفت سيشن منتهية:', id);
        }
    }
}, 1000 * 60 * 30);

// ═══════════════════════════════════════════════════
//  دوال مساعدة
// ═══════════════════════════════════════════════════
function newSessionId() {
    return crypto.randomBytes(12).toString('hex');
}

function getSession(req, res) {
    const id = req.headers['x-session-id'];
    if (!id || !sessions.has(id)) {
        res.status(404).json({ ok: false, error: 'سيشن غير موجودة، شغّل البوت أولاً.' });
        return null;
    }
    return sessions.get(id);
}

function pushLog(s, msg) {
    s.chatLog.push({ time: new Date().toISOString(), text: msg });
    if (s.chatLog.length > 100) s.chatLog.shift();
}

// ═══════════════════════════════════════════════════
//  تشغيل البوت
// ═══════════════════════════════════════════════════
function launchBot(s) {
    s.status = 'connecting';

    const botOpts = {
        host:     s.host,
        port:     s.port,
        username: s.username,
        auth:     'offline'
    };
    if (s.version) botOpts.version = s.version;

    let b;
    try {
        b = mineflayer.createBot(botOpts);
    } catch (err) {
        s.status = 'error';
        pushLog(s, '❌ فشل إنشاء البوت: ' + err.message);
        return;
    }

    s.bot = b;

    b.on('spawn', () => {
        s.status = 'online';
        pushLog(s, '✅ البوت دخل السيرفر بنجاح!');
    });

    b.on('chat', (username, message) => {
        pushLog(s, `[${username}]: ${message}`);
        // ردود تلقائية
        if (message === '!ping')  b.chat('🏓 Pong! | NONETWORK Bot');
        if (message === '!info')  b.chat('🤖 NONETWORK Bot يعمل 24/7 | nonetworkofficial.blogspot.com');
        if (message === '!pos' && b.entity) {
            const p = b.entity.position;
            b.chat(`📍 X:${Math.floor(p.x)} Y:${Math.floor(p.y)} Z:${Math.floor(p.z)}`);
        }
        if (message === '!players') {
            const players = Object.keys(b.players).join(', ');
            b.chat('👥 اللاعبون: ' + (players || 'لا أحد'));
        }
    });

    b.on('kicked', (reason) => {
        s.status = 'kicked';
        pushLog(s, '⚠️ طُرد البوت: ' + reason);
        // إعادة الاتصال بعد 15 ثانية
        setTimeout(() => { if (s.status === 'kicked') launchBot(s); }, 15000);
    });

    b.on('error', (err) => {
        s.status = 'error';
        pushLog(s, '❌ خطأ: ' + err.message);
    });

    b.on('end', () => {
        if (s.status !== 'stopped') {
            s.status = 'offline';
            pushLog(s, '🔌 انقطع الاتصال');
        }
    });
}

// ═══════════════════════════════════════════════════
//  API Endpoints
// ═══════════════════════════════════════════════════

// ✅ قائمة الإصدارات
app.get('/api/versions', (req, res) => {
    res.json({ ok: true, versions: MC_VERSIONS });
});

// ✅ تشغيل البوت — يُنشئ سيشن جديدة
app.post('/api/start', (req, res) => {
    const { host, port, username, version } = req.body;

    if (!host)     return res.status(400).json({ ok: false, error: 'IP السيرفر مطلوب.' });
    if (!username) return res.status(400).json({ ok: false, error: 'اسم البوت مطلوب.' });
    if (version && !MC_VERSIONS.includes(version))
        return res.status(400).json({ ok: false, error: 'إصدار غير مدعوم.' });

    if (sessions.size >= MAX_BOTS)
        return res.status(503).json({ ok: false, error: 'السيرفر مشغول، حاول لاحقاً.' });

    const id = newSessionId();
    const s = {
        bot:       null,
        status:    'connecting',
        host:      host.trim(),
        port:      parseInt(port) || 25565,
        username:  username.trim(),
        version:   version || null,
        chatLog:   [],
        createdAt: Date.now()
    };
    sessions.set(id, s);
    launchBot(s);

    res.json({ ok: true, sessionId: id, message: 'البوت يحاول الاتصال...' });
});

// ✅ حالة البوت
app.get('/api/status', (req, res) => {
    const s = getSession(req, res);
    if (!s) return;

    const pos = (s.bot && s.bot.entity) ? s.bot.entity.position : null;
    res.json({
        ok:       true,
        status:   s.status,
        host:     s.host,
        port:     s.port,
        username: s.username,
        version:  s.version,
        players:  s.bot && s.bot.players ? Object.keys(s.bot.players).length : 0,
        pos:      pos ? { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) } : null
    });
});

// ✅ سجل الشات
app.get('/api/chat', (req, res) => {
    const s = getSession(req, res);
    if (!s) return;
    res.json({ ok: true, log: s.chatLog.slice(-50) });
});

// ✅ إرسال رسالة
app.post('/api/chat', (req, res) => {
    const s = getSession(req, res);
    if (!s) return;
    if (s.status !== 'online')
        return res.status(400).json({ ok: false, error: 'البوت غير متصل حالياً.' });

    const { message } = req.body;
    if (!message || message.trim().length === 0)
        return res.status(400).json({ ok: false, error: 'الرسالة فارغة.' });
    if (message.length > 200)
        return res.status(400).json({ ok: false, error: 'الرسالة طويلة جداً (200 حرف كحد أقصى).' });

    try {
        s.bot.chat(message.trim());
        pushLog(s, `[أنت]: ${message.trim()}`);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false, error: 'فشل الإرسال.' });
    }
});

// ✅ إيقاف البوت
app.post('/api/stop', (req, res) => {
    const s = getSession(req, res);
    if (!s) return;

    try {
        if (s.bot) s.bot.quit('Stopped by user');
    } catch (e) {}

    s.status = 'stopped';
    s.bot    = null;
    const id = req.headers['x-session-id'];
    sessions.delete(id);

    res.json({ ok: true, message: 'تم إيقاف البوت وحذف الجلسة.' });
});

// ✅ Healthcheck لـ Railway
app.get('/', (req, res) => {
    res.json({
        ok:      true,
        service: 'NONETWORK Minecraft Bot API',
        bots:    sessions.size,
        max:     MAX_BOTS,
        uptime:  Math.floor(process.uptime()) + 's'
    });
});

// ═══════════════════════════════════════════════════
//  تشغيل السيرفر
// ═══════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ NONETWORK Bot API يعمل على منفذ ${PORT}`);
    console.log(`🔒 CORS مفعّل لـ: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`🤖 حد البوتات المتزامنة: ${MAX_BOTS}`);
});
