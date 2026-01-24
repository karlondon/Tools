# Using an Old Android Phone as Your Smart Doorbell

## 🎉 Perfect Solution: Repurpose Your Old Android!

An old Android smartphone makes an **ideal smart doorbell device** because it has:
- ✅ Camera (front + rear)
- ✅ WiFi connectivity
- ✅ Battery backup
- ✅ Microphone & Speaker
- ✅ Touch screen for testing
- ✅ Motion sensors
- ✅ All hardware you need!

**Cost: $0** (using phone you already have)

## 📱 Requirements

### Minimum Android Phone Specs:
- **Android Version**: 8.0+ (Oreo or newer)
- **Camera**: Any working camera
- **WiFi**: Working WiFi connection
- **Battery**: Functional (will stay plugged in)
- **Storage**: 2GB+ free space

### Recommended (but not required):
- Android 10+ for better performance
- 3GB+ RAM for smoother face recognition
- Good camera quality for better detection

## 🚀 Quick Setup (30 Minutes)

### Phase 1: Backend Setup (10 minutes)

#### On Your Computer:
```bash
# 1. Navigate to project
cd Smart_Doorbell_System/backend

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate  # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup environment
cp .env.example .env

# 5. Generate keys and edit .env
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"

# 6. Edit .env file - IMPORTANT: Set your computer's local IP
# Find your IP: ifconfig (Mac/Linux) or ipconfig (Windows)
# Example: 192.168.1.100
```

#### Edit `.env` file:
```bash
# Change this line:
HOST=0.0.0.0

# Add your local IP for phone to connect
# Example: Your computer IP is 192.168.1.100
# Phone will connect to: http://192.168.1.100:8000
```

#### Complete the backend:
```bash
# 7. Add remaining models (copy from QUICK_START.md)
# Create: activity.py, doorbell.py, consent.py in app/models/

# 8. Create main.py (copy from QUICK_START.md)

# 9. Run the server
python app/main.py

# 10. Test - should see:
# INFO: Uvicorn running on http://0.0.0.0:8000
```

### Phase 2: Android App (20 minutes)

#### Option A: Use Expo Go (Fastest - No Build Required)

**On Your Computer:**
```bash
# 1. Install Expo CLI
npm install -g expo-cli

# 2. Create project
npx create-expo-app SmartDoorbellPhone
cd SmartDoorbellPhone

# 3. Install dependencies
npm install axios @react-navigation/native @react-navigation/native-stack
npx expo install expo-camera expo-media-library expo-permissions
npx expo install @react-native-async-storage/async-storage

# 4. Replace App.js with the code below
```

**On Your Old Android Phone:**
```bash
# 1. Download "Expo Go" app from Google Play Store
# 2. Connect to same WiFi as your computer
# 3. Open Expo Go app
```

**Back on Computer:**
```bash
# Start the app
npx expo start

# You'll see a QR code
# Scan it with Expo Go app on your phone
# App will load instantly!
```

#### Option B: Build APK (More Professional)

```bash
# 1. Create React Native app
npx react-native init SmartDoorbellPhone
cd SmartDoorbellPhone

# 2. Install dependencies
npm install axios @react-navigation/native @react-navigation/native-stack
npm install react-native-camera react-native-permissions

# 3. Build APK
cd android
./gradlew assembleRelease

# 4. Install APK on phone
# APK will be at: android/app/build/outputs/apk/release/app-release.apk
# Transfer to phone and install
```

## 📱 Simple Test App Code

### Option 1: Expo App (Recommended for Testing)

Create this as your main `App.js`:

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Image, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import axios from 'axios';

// CHANGE THIS TO YOUR COMPUTER'S IP ADDRESS
const API_URL = 'http://192.168.1.100:8000';  // ← Change this!

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [lastPhoto, setLastPhoto] = useState(null);
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const cameraRef = useRef(null);

  useEffect(() => {
    // Request camera permission
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    // Check backend connection
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      const response = await axios.get(`${API_URL}/health`);
      setBackendStatus(`✅ Connected: ${response.data.status}`);
    } catch (error) {
      setBackendStatus('❌ Backend not reachable');
      Alert.alert('Connection Error', 
        `Cannot connect to ${API_URL}\n\nMake sure:\n1. Backend is running\n2. Phone and computer on same WiFi\n3. IP address is correct`);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && cameraReady) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        
        setLastPhoto(photo.uri);
        Alert.alert('Photo Taken!', 'Photo captured successfully');
        
        // Here you would send photo to backend for face recognition
        // await sendPhotoToBackend(photo.base64);
        
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  };

  const sendPhotoToBackend = async (base64Image) => {
    try {
      const response = await axios.post(`${API_URL}/api/v1/doorbell/detect`, {
        image: base64Image,
      });
      Alert.alert('Detection Result', response.data.message);
    } catch (error) {
      Alert.alert('Error', 'Failed to send photo to backend');
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No camera access!</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📱 Smart Doorbell</Text>
      <Text style={styles.status}>{backendStatus}</Text>
      
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.front}
        onCameraReady={() => setCameraReady(true)}
      />
      
      <View style={styles.controls}>
        <Button title="📸 Take Photo" onPress={takePicture} />
        <Button title="🔄 Check Backend" onPress={checkBackend} />
      </View>
      
      {lastPhoto && (
        <View style={styles.preview}>
          <Text style={styles.previewText}>Last Photo:</Text>
          <Image source={{ uri: lastPhoto }} style={styles.image} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 20,
  },
  camera: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  preview: {
    alignItems: 'center',
    marginTop: 10,
  },
  previewText: {
    color: '#fff',
    marginBottom: 10,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
});
```

### Option 2: Even Simpler Test (No Camera Yet)

For initial testing, use this minimal version:

```javascript
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, TextInput, Alert } from 'react-native';
import axios from 'axios';

export default function App() {
  const [apiUrl, setApiUrl] = useState('http://192.168.1.100:8000');
  const [status, setStatus] = useState('Not connected');
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');

  const testConnection = async () => {
    try {
      const response = await axios.get(`${apiUrl}/health`);
      setStatus(`✅ Connected! Version: ${response.data.version}`);
      Alert.alert('Success!', 'Backend is reachable');
    } catch (error) {
      setStatus('❌ Connection failed');
      Alert.alert('Error', 'Cannot reach backend\n\nCheck:\n1. Backend running?\n2. Correct IP?\n3. Same WiFi?');
    }
  };

  const testRegister = async () => {
    try {
      const response = await axios.post(`${apiUrl}/api/v1/auth/register`, {
        email,
        password,
        username: 'testuser',
      });
      Alert.alert('Success!', 'User registered');
    } catch (error) {
      Alert.alert('Info', 'User might already exist or endpoint not ready');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚪 Smart Doorbell Test</Text>
      
      <Text style={styles.label}>Backend URL:</Text>
      <TextInput
        style={styles.input}
        value={apiUrl}
        onChangeText={setApiUrl}
        placeholder="http://192.168.1.100:8000"
      />
      
      <Text style={styles.status}>{status}</Text>
      
      <Button title="🔌 Test Connection" onPress={testConnection} />
      
      <View style={styles.spacer} />
      
      <Text style={styles.label}>Test Registration:</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      
      <Button title="👤 Test Register" onPress={testRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  label: {
    color: '#fff',
    marginTop: 20,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  status: {
    color: '#4CAF50',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
  },
  spacer: {
    height: 30,
  },
});
```

## 🔧 Step-by-Step Testing

### Step 1: Find Your Computer's IP (2 minutes)

**macOS/Linux:**
```bash
ifconfig | grep "inet "
# Look for 192.168.x.x or 10.0.x.x
```

**Windows:**
```bash
ipconfig
# Look for IPv4 Address under your WiFi adapter
```

Example: `192.168.1.100`

### Step 2: Start Backend (2 minutes)

```bash
cd Smart_Doorbell_System/backend
source venv/bin/activate
python app/main.py

# Should see:
# INFO: Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Test from Phone Browser (1 minute)

On your old Android phone:
1. Open Chrome/browser
2. Navigate to: `http://192.168.1.100:8000` (your IP)
3. You should see: `{"message":"Smart Doorbell API",...}`
4. Try: `http://192.168.1.100:8000/docs` for API docs

### Step 4: Run the App (5 minutes)

```bash
# On computer
cd SmartDoorbellPhone
npx expo start

# On phone
# 1. Open Expo Go app
# 2. Scan QR code
# 3. App loads!
```

### Step 5: Test Features

1. **Connection Test**: Tap "Test Connection" button
2. **Camera Test**: Tap "Take Photo" button
3. **API Test**: Register a user

## 📦 Physical Mounting

### DIY Phone Holder:
1. **Phone case mount**: $5-10 on Amazon
2. **3D printed holder**: Free designs on Thingiverse
3. **Simple solution**: Tape/velcro to door frame temporarily

### Power:
- Use long USB cable to keep phone plugged in
- Or use power bank attached to door frame
- Phone battery acts as UPS (uninterrupted power)

### Waterproofing (if outdoor):
- Waterproof phone case/pouch
- Or mount inside, camera facing through window

## 🎯 Testing Scenarios

### 1. Face Detection Test
```javascript
// In your app, add:
const testFaceDetection = async () => {
  const photo = await takePicture();
  const response = await axios.post(`${API_URL}/api/v1/doorbell/detect`, {
    image: photo.base64
  });
  Alert.alert('Detection', response.data.message);
};
```

### 2. Add Known Person
```javascript
const addPerson = async (name, photoBase64) => {
  await axios.post(`${API_URL}/api/v1/people`, {
    name: name,
    photo: photoBase64,
    relationship_type: 'family'
  });
};
```

### 3. View Activity Log
```javascript
const getActivity = async () => {
  const response = await axios.get(`${API_URL}/api/v1/activity`);
  console.log(response.data);
};
```

## 💡 Pro Tips

### Performance:
- Use phone's **rear camera** for better quality
- Enable **"Keep screen on"** in developer options
- Disable **auto-sleep** while testing
- Close other apps to save RAM

### Network:
- Use **static IP** on phone for reliability
- Keep phone and computer on **same WiFi**
- Disable **mobile data** on phone to force WiFi

### Testing:
- Start with **simple connection test**
- Add **camera** once API works
- Add **face recognition** last
- Test **one feature** at a time

## 🔍 Troubleshooting

### "Cannot connect to backend"
```bash
# Check these:
1. Backend running? → python app/main.py
2. Correct IP? → ifconfig/ipconfig
3. Same WiFi? → Check WiFi name on both devices
4. Firewall? → Temporarily disable to test
```

### "Camera not working"
```bash
# Fix:
1. Grant camera permission in phone settings
2. Close and restart app
3. Try rear camera instead of front
4. Check if camera works in other apps
```

### "Expo Go not connecting"
```bash
# Fix:
1. Update Expo Go app
2. Update Expo CLI: npm install -g expo-cli
3. Clear Expo cache: expo start -c
4. Restart phone
```

## 📊 What You Can Test

With old Android phone setup:
- ✅ Camera capture
- ✅ API connectivity
- ✅ User registration/login
- ✅ Photo upload
- ✅ Face detection (when implemented)
- ✅ Push notifications
- ✅ Activity logging
- ✅ People management

## 🎉 Benefits of Using Old Phone

1. **Zero Hardware Cost** - Already have it
2. **Fast Prototyping** - Test ideas instantly
3. **Real Device Testing** - Actual Android experience
4. **Battery Backup** - Built-in UPS
5. **WiFi + 4G** - Redundant connectivity
6. **Touch Screen** - Easy debugging
7. **Familiar** - You know how to use it!

## 🚀 Next Level

Once testing works, you can:
1. **Keep using the phone** - It works!
2. **Upgrade to newer phone** - Better camera
3. **Switch to Raspberry Pi** - More customizable
4. **Build custom hardware** - Ultimate control

---

**Perfect for testing without spending money!** Your old Android phone is an ideal development/testing device for this project. Once everything works, decide if you want to upgrade hardware or just keep using the phone! 📱✅