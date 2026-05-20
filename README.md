# 🔴 Chatzz — Real-time Chat Application

> WhatsApp-like chat app built with Expo React Native + Node.js + MongoDB + Socket.io

---

## 📁 Project Structure

```
chatzz/
├── chatzz-backend/      ← Node.js + Express + MongoDB + Socket.io
└── chatzz-frontend/     ← Expo React Native (Android APK)
```

---

## 🖥️ BACKEND SETUP

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Firebase project (for push notifications)

### Step 1 — Install dependencies
```bash
cd chatzz-backend
npm install
```

### Step 2 — Configure environment
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/chatzz
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=30d

# Firebase (get from Firebase Console > Project Settings > Service Accounts > Generate new private key)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
```

### Step 3 — Start the server
```bash
# Development
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

---

## ☁️ BACKEND DEPLOYMENT (Render.com — Free)

1. Push `chatzz-backend/` to a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
   - **Environment:** Node
5. Add all `.env` variables in Render's "Environment" tab
6. Deploy → Copy your server URL e.g. `https://chatzz-backend.onrender.com`

---

## 📱 FRONTEND SETUP

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli eas-cli`
- Expo account: [expo.dev](https://expo.dev)

### Step 1 — Install dependencies
```bash
cd chatzz-frontend
npm install
```

### Step 2 — Configure API URL
Edit `src/services/api.js`:
```js
export const BASE_URL = 'https://your-backend-url.onrender.com';
```

### Step 3 — Run on device (Expo Go)
```bash
npx expo start
```
Scan QR code with Expo Go app.

---

## 📦 BUILD APK

### Step 1 — Login to Expo
```bash
eas login
```

### Step 2 — Configure EAS
```bash
eas build:configure
```

This creates `eas.json`. Add a preview profile:
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Step 3 — Build APK
```bash
# APK (for direct install)
eas build -p android --profile preview

# AAB (for Play Store)
eas build -p android --profile production
```

Build takes ~10 minutes. Download link provided when complete.

---

## 🔔 PUSH NOTIFICATIONS SETUP

### Step 1 — Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create new project → "Chatzz"
3. Add Android app with package: `com.chatzz.app`
4. Download `google-services.json` → place in `chatzz-frontend/`

### Step 2 — Get Service Account Key
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Add the values to your backend `.env`

### Step 3 — Configure Notification Channel (Android)
Already configured in `src/services/notifications.js` with channel ID `chatzz_messages`

### Step 4 — Add Custom Notification Sound
1. Place your sound file as `chatzz-frontend/assets/sounds/notification.wav`
2. Already referenced in `app.json` and notification channel config

---

## 🔒 MONGODB SETUP

### Atlas (Cloud — Recommended)
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create free cluster
2. Database Access → Add user with password
3. Network Access → Allow `0.0.0.0/0`
4. Connect → Driver → Copy connection string
5. Paste in `.env` as `MONGODB_URI`

---

## 🗂️ API ENDPOINTS

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/check-device` | Check if device registered |
| PUT | `/api/auth/fcm-token` | Update FCM token |
| GET | `/api/users` | Search all users |
| GET | `/api/users/requests` | Get pending requests |
| PUT | `/api/users/profile` | Update profile |
| POST | `/api/users/:id/request` | Send chat request |
| PUT | `/api/users/request/:userId/respond` | Accept/reject request |
| POST | `/api/users/:id/block` | Block user |
| GET | `/api/chats` | Get all chats |
| POST | `/api/chats` | Get or create chat |
| DELETE | `/api/chats/:id` | Delete chat |
| GET | `/api/messages/:chatId` | Get messages |
| POST | `/api/messages` | Send message |
| PUT | `/api/messages/:chatId/seen` | Mark as seen |
| DELETE | `/api/messages/:id` | Delete message |

---

## 🔌 SOCKET.IO EVENTS

| Event | Direction | Description |
|-------|-----------|-------------|
| `send_message` | Client → Server | Send a message |
| `new_message` | Server → Client | Receive a message |
| `message_sent` | Server → Client | Confirm message sent |
| `typing` | Client → Server | Start typing |
| `stop_typing` | Client → Server | Stop typing |
| `user_typing` | Server → Client | Someone is typing |
| `user_stop_typing` | Server → Client | Stop typing |
| `mark_seen` | Client → Server | Mark messages seen |
| `messages_seen` | Server → Client | Messages read |
| `message_delivered` | Server → Client | Message delivered |
| `delete_message` | Client → Server | Delete a message |
| `chat_request` | Server → Client | Incoming request |
| `request_accepted` | Server → Client | Request accepted |
| `user_online` | Server → Client | User came online |
| `user_offline` | Server → Client | User went offline |

---

## 🎨 Theme Colors

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#E53935` | Main red — buttons, accents |
| `primaryDark` | `#B71C1C` | Dark red |
| `background` | `#0A0A0A` | App background |
| `surface` | `#1A1A1A` | Cards, headers |
| `text` | `#FFFFFF` | Main text |
| `online` | `#4CAF50` | Online indicator |

---

## 🚀 Production Checklist

- [ ] Set `NODE_ENV=production` in backend `.env`
- [ ] Use strong `JWT_SECRET` (32+ random chars)
- [ ] Configure MongoDB Atlas IP whitelist
- [ ] Enable Firebase Authentication
- [ ] Set `BASE_URL` to production server in `src/services/api.js`
- [ ] Update `app.json` with real EAS project ID
- [ ] Add `google-services.json` to frontend root
- [ ] Build APK with `eas build -p android --profile preview`

---

## 📞 Support

Built for Chatzz by the development team.
Logo © Chatzz 2025. All rights reserved.
