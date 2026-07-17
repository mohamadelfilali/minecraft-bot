# 🤖 NONETWORK Minecraft Bot API

سيرفر API لتشغيل بوتات ماين كرافت — مدعوم من منصة NONETWORK.
يدعم مستخدمين متعددين في نفس الوقت، كل مستخدم له جلسة مستقلة.

---

## 📁 هيكل الملفات

```
minecraft-bot/
├── index.js        ← السيرفر الرئيسي
├── package.json    ← المكتبات
├── Procfile        ← إعداد Railway
├── .env.example    ← نموذج المتغيرات
└── README.md
```

---

## 🚀 خطوات النشر على Railway

### 1. ارفع الملفات على GitHub
- اذهب لـ github.com
- اضغط New Repository
- سمّه: nonetwork-minecraft-bot
- ارفع كل الملفات

### 2. انشر على Railway
- اذهب لـ railway.app
- سجّل دخول بـ GitHub
- New Project ← Deploy from GitHub Repo
- اختر: nonetwork-minecraft-bot
- Railway سيشغّله تلقائياً ✅

### 3. احصل على الرابط
- من داخل المشروع اضغط Settings
- انسخ رابط الـ Domain (مثال: xyz.up.railway.app)
- هذا الرابط ستضعه في واجهة المدونة

---

## 🔌 API Endpoints

| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| GET | `/` | حالة السيرفر |
| GET | `/api/versions` | قائمة الإصدارات |
| POST | `/api/start` | تشغيل بوت جديد |
| GET | `/api/status` | حالة البوت |
| GET | `/api/chat` | سجل الشات |
| POST | `/api/chat` | إرسال رسالة |
| POST | `/api/stop` | إيقاف البوت |

---

## 📋 تفاصيل الـ API

### تشغيل بوت جديد
```
POST /api/start
Content-Type: application/json

{
  "host":     "play.example.com",
  "port":     25565,
  "username": "MyBot",
  "version":  "1.20.1"
}

← الرد:
{
  "ok": true,
  "sessionId": "abc123...",
  "message": "البوت يحاول الاتصال..."
}
```

### حالة البوت
```
GET /api/status
x-session-id: abc123...

← الرد:
{
  "ok": true,
  "status": "online",
  "players": 5,
  "pos": { "x": 100, "y": 64, "z": -200 }
}
```

### إرسال رسالة
```
POST /api/chat
x-session-id: abc123...
Content-Type: application/json

{ "message": "مرحباً!" }
```

### إيقاف البوت
```
POST /api/stop
x-session-id: abc123...
```

---

## 💬 أوامر الشات داخل ماين كرافت

| الأمر | الرد |
|-------|------|
| `!ping` | Pong! |
| `!info` | معلومات البوت |
| `!pos` | موقع البوت |
| `!players` | عدد اللاعبين |

---

## 🔒 الأمان

- الـ API يقبل طلبات فقط من: `nonetworkofficial.blogspot.com`
- كل مستخدم له Session ID عشوائي فريد
- الجلسات تُحذف تلقائياً بعد ساعتين
- الحد الأقصى للبوتات المتزامنة: 20 بوت
