# 📱 Chatzz — Setup & Developer Guide

> A real-time chat app built with React Native (Expo) + Node.js + Socket.IO + MongoDB.
> **A product from P.S**

---

## 📁 Project Structure

```
chatzz/
├── chatzz-backend/      ← Node.js + Express + Socket.IO backend
└── chatzz-frontend/     ← React Native (Expo) mobile app
```

---

## 🚀 Backend Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account (or local MongoDB)
- Firebase project (for push notifications)

### 1. Install dependencies
```bash
cd chatzz-backend
npm install
```

### 2. Configure environment
Edit `.env` (already exists):
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/chatzz
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=90d

# Firebase service account (for push notifications)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
```

### 3. Start the server
```bash
npm start
# or for development with auto-restart:
npm run dev
```

The server runs at `http://localhost:5000`.

---

## 📱 Frontend Setup

### Prerequisites
- Node.js ≥ 18
- Expo CLI: `npm install -g expo-cli`
- Expo Go app (for testing) OR Expo Development Build (for calls)

### 1. Install dependencies
```bash
cd chatzz-frontend
npm install
```

### 2. Set your backend URL
Edit `src/services/api.js`:
```js
export const BASE_URL = 'https://your-backend-url.com';  // or http://192.168.x.x:5000
```

### 3. Start the app
```bash
npx expo start
```

Scan the QR code with Expo Go (Android/iOS).

---

## 🔔 Push Notifications Setup (Firebase)

### Step 1 — Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project → "Chatzz"
3. Add an Android app → package name: `com.yourname.chatzz`
4. Download `google-services.json` → place in `chatzz-frontend/`

### Step 2 — Get Service Account Key (Backend)
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" → download JSON
3. Copy values to your `.env`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`

### Step 3 — Configure Notification Channel
The app automatically creates the `chatzz_messages` channel on Android.
Notifications work for:
- ✅ New messages (even when app is in background)
- ✅ Chat requests
- ✅ Call incoming alerts

---

## 📞 Voice Call Feature Setup

The voice call feature uses **WebRTC** for peer-to-peer audio and **Socket.IO** for signaling.

> ⚠️ **Important:** `react-native-webrtc` does NOT work in Expo Go.  
> You need an **Expo Development Build** or **bare workflow**.

### Option A — Expo Development Build (Recommended)

#### Step 1 — Install react-native-webrtc
```bash
cd chatzz-frontend
npx expo install react-native-webrtc
```

#### Step 2 — Create development build
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build for Android (APK for testing)
eas build -p android --profile preview

# Or build for iOS
eas build -p ios
```

#### Step 3 — Install on device
- Download the APK from EAS dashboard
- Install it on your Android device
- The call button in the chat header will now work!

### Option B — Agora SDK (Alternative)

If you prefer a managed service:

```bash
npm install react-native-agora
```

Then replace the `CallScreen.js` WebRTC logic with Agora's `RtcEngine`. See [Agora React Native Docs](https://docs.agora.io/en/Video/start_call_react_native).

### How Calls Work
1. User A taps 📞 in ChatScreen → `CallScreen` opens → emits `call_offer` via Socket
2. Backend relays offer to User B
3. User B's `HomeScreen` receives `call_offer` → navigates to `CallScreen` (incoming mode)
4. User B taps Accept → `call_answer` is sent back
5. ICE candidates are exchanged → WebRTC peer connection established
6. Direct peer-to-peer audio streams

### STUN/TURN Servers
The app uses Google's public STUN servers by default. For production:
```js
// In CallScreen.js, update ICE_SERVERS:
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add a TURN server for NAT traversal:
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'your-username',
      credential: 'your-password',
    },
  ],
};
```

Free TURN server options: [Metered.ca](https://www.metered.ca/tools/openrelay/), [Twilio](https://www.twilio.com/docs/stun-turn)

---

## 💾 Profile Picture Persistence

Profile pictures are stored in **two places**:
1. **Server** — uploaded to `/uploads/images/` on your server
2. **Device** — cached locally at `FileSystem.documentDirectory + 'chatzz_profile.jpg'`

> ⚠️ **Render.com Free Tier**: The filesystem is ephemeral. Profile pictures uploaded to Render will be lost on server restart.

### Solution — Use Cloud Storage (Cloudinary)

#### Step 1 — Create Cloudinary account
Go to [cloudinary.com](https://cloudinary.com) (free tier available)

#### Step 2 — Install SDK
```bash
cd chatzz-backend
npm install cloudinary multer-storage-cloudinary
```

#### Step 3 — Update upload middleware (`middleware/upload.js`):
```js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chatzz/profiles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill' }],
  },
});

module.exports = multer({ storage });
```

#### Step 4 — Add to `.env`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🎨 Features Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Splash Screen (WhatsApp-style) | ✅ | No animation, clean brand |
| Get Started Screen | ✅ | Fixed logo bug |
| Theme Switching | ✅ | Fixed save error |
| Notification Toggles | ✅ | Properly wired to backend |
| Profile Picture Persistence | ✅ | Local + server cache |
| Real-time Messages | ✅ | Fixed socket reconnect |
| Message Notifications | ✅ | Local + push notifications |
| Voice Calls | ✅ | WebRTC (needs dev build) |
| Hidden Delete Account | ✅ | Tap "Developed by Praveen" 5× |
| Account Deletion Notification | ✅ | Connected users notified via socket |

---

## 🗑️ Delete Account (Hidden Feature)

In **Settings**, scroll to the bottom and tap **"Developed by Praveen"** watermark **5 times**.  
A "Danger Zone" section will appear with the Delete Account option.

When deleted:
- All messages and chats are permanently removed from the database
- All connected users receive a socket event `user_deleted` and are notified
- The account cannot be recovered

---

## 🛠️ Development Commands

### Backend
```bash
npm start          # Production
npm run dev        # Development (nodemon)
```

### Frontend
```bash
npx expo start             # Start dev server
npx expo start --clear     # Clear cache
npx expo start --android   # Open in Android emulator
eas build -p android --profile preview   # Build APK
```

---

## 🌐 Deployment

### Backend (Render.com)
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect your repo → `chatzz-backend` as root
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add environment variables in Render dashboard

### Frontend (Expo EAS)
1. `eas build -p android` for Play Store
2. `eas submit -p android` to submit to Play Store

---

## 📦 Dependencies

### Frontend
| Package | Purpose |
|---------|---------|
| `expo` | App framework |
| `socket.io-client` | Real-time communication |
| `expo-notifications` | Push & local notifications |
| `expo-file-system` | Persistent profile picture storage |
| `expo-secure-store` | Secure token storage |
| `expo-av` | Audio recording/playback |
| `react-native-webrtc` | Voice calls (dev build only) |

### Backend
| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `socket.io` | Real-time events |
| `mongoose` | MongoDB ODM |
| `firebase-admin` | Push notifications |
| `jsonwebtoken` | Authentication |
| `multer` | File uploads |

---

## 🐛 Common Issues

### "Socket not connecting"
- Make sure `BASE_URL` in `api.js` is correct
- Check that your backend is running and accessible
- For physical devices, use your PC's local IP (not `localhost`)

### "Profile picture not showing after restart"
- The local cache at `FileSystem.documentDirectory` persists between app restarts
- If server URL is broken, the local cache is used as fallback
- For permanent server storage, use Cloudinary (see above)

### "Call button not working"
- Voice calls require `react-native-webrtc` which needs a development build
- See the **Voice Call Setup** section above

### "Notifications not arriving"
- Physical device required (not simulator)
- Ensure FCM token is registered (`registerForPushNotifications` in AuthContext)
- Check Firebase service account credentials in `.env`

---

## 👨‍💻 Developer

**Developed by Praveen**  
A product from P.S

---

*Chatzz v1.0.0 — Production Ready*
