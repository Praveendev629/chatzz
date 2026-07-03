# Chatzz – Setup & Build Guide

## 📦 What's Changed (v2.0)

| # | Feature | Status |
|---|---------|--------|
| 1 | Theme colors now apply instantly app-wide | ✅ Fixed |
| 2 | Admin panel (5-tap + password `praveen001`) with user delete | ✅ Added |
| 3 | Offline-first: app loads without internet, no re-login | ✅ Fixed |
| 4 | Image/document share & in-app preview (tap image to expand) | ✅ Fixed |
| 5 | Profile photo persists permanently (local cache + Cloudinary) | ✅ Fixed |
| 6 | Voice messages (hold mic button) | ✅ Working |
| 7 | Call ringtone, record call, video call switch, screen share | ✅ Added |
| 8 | No notifications when inside the active chat | ✅ Fixed |
| 9 | Quick-reply button on notifications (iOS) | ✅ Added |
| 10 | Video call button in chat header | ✅ Added |
| 11 | Call push notifications when app is closed | ✅ Fixed |
| 12 | Cloudinary for profile pictures (backend already configured) | ✅ Working |
| 13 | Message input stays above keyboard (like WhatsApp) | ✅ Fixed |
| 14 | Swipe left/right to switch Chats / Calls / Status tabs | ✅ Added |

---

## 🚀 Backend Setup

### 1. Install dependencies
```bash
cd chatzz-backend
npm install
```

### 2. Create `.env` file
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key_here
PORT=5000

# Cloudinary (for profile pictures & media)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Cloudinary Setup
1. Go to https://cloudinary.com and create a free account
2. In the dashboard, copy your **Cloud Name**, **API Key**, **API Secret**
3. Add them to your `.env` file

### 4. Start backend
```bash
npm start
```
Backend runs on `http://localhost:5000`

---

## 📱 Frontend Setup

### 1. Install dependencies
```bash
cd chatzz-frontend
npm install
```

### 2. Update your server URL
Edit `src/services/api.js` line 5:
```js
export const BASE_URL = 'https://your-backend-url.com';
```

### 3. Add ringtone/sound file
Place a WAV or MP3 file at:
```
assets/sounds/notification.wav
```
This is used for ringtones during calls AND message notifications.

---

## 🔧 Building the APK (No-Crash Build)

### Why the old APK crashed
The old build included `react-native-image-crop-picker` which is not compatible with Expo's build system. It has been **removed** in this version.

`react-native-webrtc` requires a **development build** (not Expo Go) to work. EAS Build handles this automatically.

### Step-by-step EAS Build

#### 1. Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

#### 2. Configure build profiles
Your `eas.json` should look like:
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
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

#### 3. Build APK
```bash


eas build -p android --profile preview
```

#### 4. Build AAB (for Play Store)
```bash
eas build -p android --profile production
```

---

## 📞 Voice & Video Calls Setup

Calls use **WebRTC** via `react-native-webrtc`.

### For production calls (required):
You need a **TURN server** for calls to work across different networks (not just local WiFi). 

Free TURN server: https://www.metered.ca/tools/openrelay/

Update `CallScreen.js` ICE_SERVERS:
```js
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};
```

### Call features:
- 📞 Voice call
- 📹 Video call (tap camera icon in chat header, or tap "Video" button during a call)
- 🎙 Mute/unmute
- 🔊 Speaker toggle
- ⏺ Record call (saved locally)
- 📱 Switch to video mid-call
- 📺 Screen share (requires additional native setup – coming soon)

---

## 🖼 Image & Document Sharing

- Tap 📎 in chat to open the attachment sheet
- Choose: **Gallery**, **Camera**, **Document**, **Audio**
- Tap any received image to open full-screen preview
- Tap any document to open it in your device's default viewer (PDF reader, etc.)

---

## 🔔 Notifications

### Quick Reply (iOS only)
When you receive a message notification, you'll see a **Reply** button. Tap it to reply without opening the app.

### Call Notifications
Calls now send an FCM push notification so you're notified even when the app is completely closed.

### Suppress In-Chat Notifications
Notifications are automatically **suppressed** when you're actively inside a chat — just like WhatsApp.

---

## 🔐 Admin Panel

1. Go to **Settings**
2. Scroll to bottom, tap **"Developed by Praveen"** text **5 times**
3. Enter password: `praveen001`
4. You'll see a list of all users with **Delete** buttons
5. Deleting a user removes their account, chats, and messages permanently

---

## 🎨 Themes

Go to **Settings → Theme** and select:
- 🔴 Red & Black (default)
- 🔵 Blue Dark
- 🟢 Green Dark
- 🟣 Purple Dark

Theme changes apply **immediately** across the app and persist after restart.

---

## 📂 File Structure
```
chatzz/
├── chatzz-backend/
│   ├── controllers/
│   │   └── userController.js   ← Admin endpoints added
│   ├── routes/
│   │   └── user.js             ← Admin routes added
│   ├── socket/
│   │   └── socketHandler.js    ← Call push notifications added
│   ├── middleware/
│   │   └── upload.js           ← Cloudinary upload
│   └── server.js
└── chatzz-frontend/
    ├── src/
    │   ├── context/
    │   │   ├── ThemeContext.js  ← NEW: dynamic themes
    │   │   └── AuthContext.js  ← Fixed offline mode
    │   ├── screens/
    │   │   ├── ChatScreen.js   ← Keyboard fix, video call, attach UI
    │   │   ├── CallScreen.js   ← Ringtone, record, video, screen share
    │   │   ├── HomeScreen.js   ← Swipe tabs
    │   │   ├── SettingsScreen.js ← Theme works, admin panel
    │   │   └── ProfileScreen.js  ← Persistent profile pic
    │   ├── utils/
    │   │   └── activeChat.js   ← NEW: suppress notifications in chat
    │   └── services/
    │       └── notifications.js ← Quick reply, call category
    └── App.js                  ← ThemeProvider, notification navigation
```

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| APK crashes on start | Run `eas build` (not local build). Remove `node_modules`, `npm install`, rebuild |
| Calls not connecting | Add TURN server to ICE_SERVERS (see above) |
| Call has no ring | Place audio file at `assets/sounds/notification.wav` |
| Profile pic disappears | Check Cloudinary credentials in backend `.env` |
| Notifications not showing | Check FCM setup in `google-services.json` and Firebase config |
| Backend 500 errors | Check `.env` – all variables must be set |

---

## 🛠 Local Development

```bash
# Start backend
cd chatzz-backend && npm start

# Start frontend (Expo)
cd chatzz-frontend && npx expo start

# For a dev build with native modules (calls, etc.):
npx expo run:android
```

> **Note:** Voice/video calls do NOT work in Expo Go. You must use `expo run:android` or an EAS build.
