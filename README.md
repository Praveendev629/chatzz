# Chatzz — Instant Messenger

> **craft by p.s** | Production-ready real-time chat app

---

## 🚀 Tech Stack

| Layer | Tech |
|---|---|
| Mobile | Expo (React Native) + TypeScript |
| Navigation | React Navigation v6 |
| State | Context API + Zustand |
| Backend | Node.js + Express.js |
| Real-time | Socket.io |
| Database | MongoDB Atlas |
| File Storage | Cloudinary |
| Push Notifications | Firebase Cloud Messaging |
| Local Storage | Expo SecureStore |

---

## 📁 Folder Structure

```
chatzz/
├── backend/
│   ├── config/          # DB, Cloudinary, Firebase
│   ├── controllers/     # Business logic
│   ├── models/          # MongoDB schemas
│   ├── routes/          # Express routes
│   ├── socket/          # Socket.io handler
│   ├── server.js
│   └── .env.example
│
└── frontend/
    ├── app/
    │   ├── components/  # ChatBubble, TypingIndicator
    │   ├── context/     # AuthContext, SocketContext
    │   ├── navigation/  # AppNavigator
    │   ├── screens/     # Splash, Login, Chats, People, Profile, Chat
    │   ├── services/    # api.ts, socket.ts, notifications.ts
    │   └── utils/       # constants.ts, storage.ts
    ├── assets/          # logo.png, splash.png, chatzz_sound.mp3
    ├── App.tsx
    ├── app.json
    └── package.json
```

---

## ⚙️ Step-by-Step Setup

### 1. MongoDB Atlas
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create free cluster
2. Whitelist IP: `0.0.0.0/0` (or your server IP)
3. Create DB user → copy connection string
4. Paste as `MONGODB_URI` in backend `.env`

### 2. Cloudinary
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Dashboard → copy Cloud Name, API Key, API Secret
3. Paste in backend `.env`

### 3. Firebase (Push Notifications)
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project → Add Android app (package: `com.chatzz.app`)
3. Download `google-services.json` → place in `frontend/`
4. Project Settings → Service accounts → Generate new private key
5. Save as `backend/config/firebase-service-account.json`

### 4. Backend Setup (Local)
```bash
cd backend
cp .env.example .env
# Fill in .env values
npm install
npm run dev
```

### 5. Frontend Setup (Local)
```bash
cd frontend
npm install
# Update API_BASE_URL and SOCKET_URL in app/utils/constants.ts
npx expo start
```

---

## 🌐 Deployment

### Backend → Render.com
1. Push backend to GitHub
2. New Web Service on Render → Connect repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add all `.env` variables in Render dashboard
6. Upload `firebase-service-account.json` as a file (or use env var)
7. Get your service URL (e.g. `https://chatzz-api.onrender.com`)
8. Update `SOCKET_URL` and `API_BASE_URL` in frontend constants

### Backend → Railway.app
1. New project → Deploy from GitHub
2. Add environment variables in Variables tab
3. Get public URL from Settings

### Frontend → EAS (Expo Application Services)
```bash
npm install -g eas-cli
eas login
eas build:configure
# Update eas.json project ID from expo.dev
eas build --platform android   # .apk / .aab
eas build --platform ios       # .ipa
```

**Before building:**
- Replace `YOUR_EAS_PROJECT_ID` in `app.json`
- Ensure `google-services.json` is in root of `frontend/`
- Add custom sound: place `chatzz_sound.mp3` in `frontend/assets/`

---

## 🔔 Custom Notification Sound
1. Add `chatzz_sound.mp3` to `frontend/assets/`
2. `app.json` already configures this sound for both platforms
3. Android channel `chatzz_messages` uses this sound

---

## 🔐 Security Notes
- Only accepted chat connections can exchange messages
- Unauthorized socket events are ignored server-side
- File uploads validated by Cloudinary (format allowlist)
- User data stored in SecureStore (encrypted on device)

---

## 🎨 Theme
- **Primary:** `#ff0000` (Red)
- **Background:** `#000000` (Black)
- **Text:** White
- **Sent bubbles:** Red
- **Received bubbles:** Dark grey `#2a2a2a`
- **Online indicator:** `#00e676` (Green)
