# Smart Doorbell Mobile App - Architecture & Implementation Guide

Complete architecture for Android and iOS mobile applications using React Native.

## 📱 Overview

Cross-platform mobile application for the Smart Doorbell System, providing real-time monitoring, face recognition management, and smart home integration.

## 🏗️ Application Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Mobile App (React Native)           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │            Presentation Layer                │  │
│  │  - Screens / Components                      │  │
│  │  - Navigation                                │  │
│  │  - UI/UX                                     │  │
│  └──────────────────────────────────────────────┘  │
│                        ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │          Business Logic Layer                │  │
│  │  - State Management (Redux)                  │  │
│  │  - Actions & Reducers                        │  │
│  │  - Middleware (Saga/Thunk)                   │  │
│  └──────────────────────────────────────────────┘  │
│                        ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │           Data/Service Layer                 │  │
│  │  - API Client                                │  │
│  │  - WebRTC Client                             │  │
│  │  - Local Storage                             │  │
│  │  - Push Notifications                        │  │
│  └──────────────────────────────────────────────┘  │
│                        ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │            Native Modules Layer              │  │
│  │  - Camera                                    │  │
│  │  - Audio                                     │  │
│  │  - Biometrics                                │  │
│  │  - File System                               │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              Backend API / WebSocket                 │
└─────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
mobile-app/
├── android/                      # Android native code
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/
│   │   │   ├── res/
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── gradle/
│
├── ios/                          # iOS native code
│   ├── SmartDoorbell/
│   │   ├── AppDelegate.h
│   │   ├── AppDelegate.m
│   │   ├── Info.plist
│   │   └── Images.xcassets/
│   ├── SmartDoorbell.xcodeproj/
│   └── Podfile
│
├── src/                          # React Native source
│   ├── components/              # Reusable components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── video/
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── VideoControls.tsx
│   │   │   └── VideoStream.tsx
│   │   └── person/
│   │       ├── PersonCard.tsx
│   │       ├── PersonList.tsx
│   │       └── AddPersonForm.tsx
│   │
│   ├── screens/                 # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── LiveViewScreen.tsx
│   │   ├── PeopleScreen.tsx
│   │   ├── ActivityScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── AddPersonScreen.tsx
│   │   └── ConsentScreen.tsx
│   │
│   ├── navigation/              # Navigation setup
│   │   ├── AppNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   └── StackNavigator.tsx
│   │
│   ├── redux/                   # State management
│   │   ├── store.ts
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── doorbellSlice.ts
│   │   │   ├── peopleSlice.ts
│   │   │   ├── activitySlice.ts
│   │   │   └── settingsSlice.ts
│   │   └── middleware/
│   │       ├── apiMiddleware.ts
│   │       └── websocketMiddleware.ts
│   │
│   ├── services/                # External services
│   │   ├── api/
│   │   │   ├── auth.ts
│   │   │   ├── doorbell.ts
│   │   │   ├── people.ts
│   │   │   └── activity.ts
│   │   ├── webrtc/
│   │   │   ├── WebRTCService.ts
│   │   │   └── StreamManager.ts
│   │   ├── storage/
│   │   │   ├── SecureStorage.ts
│   │   │   └── AsyncStorage.ts
│   │   ├── notifications/
│   │   │   └── PushNotificationService.ts
│   │   └── socket/
│   │       └── SocketService.ts
│   │
│   ├── utils/                   # Utility functions
│   │   ├── encryption.ts
│   │   ├── validation.ts
│   │   ├── dateTime.ts
│   │   └── permissions.ts
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useWebRTC.ts
│   │   ├── useNotifications.ts
│   │   ├── useCamera.ts
│   │   └── usePermissions.ts
│   │
│   ├── constants/               # App constants
│   │   ├── colors.ts
│   │   ├── dimensions.ts
│   │   ├── api.ts
│   │   └── config.ts
│   │
│   ├── types/                   # TypeScript types
│   │   ├── doorbell.ts
│   │   ├── person.ts
│   │   ├── activity.ts
│   │   └── api.ts
│   │
│   └── assets/                  # Static assets
│       ├── images/
│       ├── fonts/
│       └── sounds/
│
├── __tests__/                   # Test files
│   ├── components/
│   ├── screens/
│   └── services/
│
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── app.json
```

## 🎨 Screen Designs

### 1. Home Screen

**Purpose:** Main dashboard showing live feed and recent activity

**Components:**
```tsx
interface HomeScreenProps {
  navigation: NavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const doorbell = useSelector(selectDoorbell);
  const recentActivity = useSelector(selectRecentActivity);
  
  return (
    <Container>
      {/* Live Video Feed */}
      <VideoStream
        streamUrl={doorbell.streamUrl}
        isLive={doorbell.isOnline}
      />
      
      {/* Quick Stats */}
      <StatsCard>
        <Stat label="Today's Visitors" value={doorbell.todayVisitors} />
        <Stat label="Known Faces" value={doorbell.knownFaces} />
      </StatsCard>
      
      {/* Recent Activity */}
      <ActivityList
        activities={recentActivity}
        onActivityPress={handleActivityPress}
      />
      
      {/* Quick Actions */}
      <QuickActions>
        <ActionButton icon="person-add" onPress={navigateToAddPerson} />
        <ActionButton icon="settings" onPress={navigateToSettings} />
      </QuickActions>
    </Container>
  );
};
```

### 2. Live View Screen

**Purpose:** Full-screen live video with controls

**Features:**
- Real-time video streaming
- Two-way audio
- Take snapshot
- Record clip
- Smart lock control
- Emergency call

```tsx
const LiveViewScreen: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const webrtc = useWebRTC();
  
  return (
    <FullScreenContainer>
      <WebRTCView stream={webrtc.stream} />
      
      <ControlOverlay>
        {/* Video Controls */}
        <ControlButton
          icon="mic"
          active={audioEnabled}
          onPress={toggleAudio}
        />
        <ControlButton
          icon="record"
          active={isRecording}
          onPress={toggleRecording}
        />
        <ControlButton
          icon="camera"
          onPress={takeSnapshot}
        />
        
        {/* Smart Lock Control */}
        {hasSmartLock && (
          <ControlButton
            icon="lock-open"
            onPress={unlockDoor}
          />
        )}
      </ControlOverlay>
      
      {/* Current Visitor Info */}
      {currentVisitor && (
        <VisitorCard visitor={currentVisitor} />
      )}
    </FullScreenContainer>
  );
};
```

### 3. People Management Screen

**Purpose:** Manage known faces database

**Features:**
- List of all known people
- Search and filter
- Add new person
- Edit/delete person
- Manage consent

```tsx
const PeopleScreen: React.FC = () => {
  const people = useSelector(selectPeople);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <Container>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search people..."
      />
      
      <PersonList>
        {filteredPeople.map(person => (
          <PersonCard
            key={person.id}
            person={person}
            onPress={() => navigateToPersonDetails(person)}
            onEdit={() => handleEdit(person)}
            onDelete={() => handleDelete(person)}
          />
        ))}
      </PersonList>
      
      <FAB
        icon="person-add"
        onPress={navigateToAddPerson}
      />
    </Container>
  );
};
```

### 4. Add Person Screen

**Purpose:** Add new person to database with consent

**Workflow:**
1. Take/upload photos (3-5)
2. Enter person details
3. Record consent
4. Save to database

```tsx
const AddPersonScreen: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [consent, setConsent] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  
  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchCamera({
      mediaType: 'photo',
      quality: 0.8,
    });
    
    if (result.assets) {
      setPhotos([...photos, result.assets[0]]);
    }
  };
  
  const handleSubmit = async () => {
    if (!consent || !signature) {
      Alert.alert('Consent Required', 'Please obtain consent first');
      return;
    }
    
    const personData = {
      name,
      relationship,
      photos,
      consent: {
        given: true,
        signature,
        timestamp: new Date().toISOString(),
      },
    };
    
    await dispatch(addPerson(personData));
    navigation.goBack();
  };
  
  return (
    <ScrollView>
      {/* Photo Capture */}
      <PhotoSection>
        <PhotoGrid photos={photos} onAddPhoto={handleAddPhoto} />
        <HelpText>Add 3-5 clear photos for better recognition</HelpText>
      </PhotoSection>
      
      {/* Person Details */}
      <DetailsSection>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          required
        />
        <Picker
          label="Relationship"
          value={relationship}
          items={['Family', 'Friend', 'Neighbor', 'Service', 'Other']}
          onValueChange={setRelationship}
        />
      </DetailsSection>
      
      {/* Consent Section */}
      <ConsentSection>
        <CheckBox
          value={consent}
          onValueChange={setConsent}
          label="I have obtained consent from this person"
        />
        
        {consent && (
          <SignatureCapture
            onSave={setSignature}
            label="Person's Signature"
          />
        )}
      </ConsentSection>
      
      <Button
        title="Add Person"
        onPress={handleSubmit}
        disabled={!canSubmit}
      />
    </ScrollView>
  );
};
```

### 5. Activity Log Screen

**Purpose:** View history of doorbell events

**Features:**
- Timeline view
- Filter by person/date/type
- View video clips
- Export reports

```tsx
const ActivityScreen: React.FC = () => {
  const activities = useSelector(selectActivities);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>(last7Days);
  
  const filteredActivities = useMemo(() => {
    return activities
      .filter(a => filterActivity(a, filter, dateRange))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [activities, filter, dateRange]);
  
  return (
    <Container>
      <FilterBar>
        <FilterChip
          label="All"
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <FilterChip
          label="Known"
          active={filter === 'known'}
          onPress={() => setFilter('known')}
        />
        <FilterChip
          label="Unknown"
          active={filter === 'unknown'}
          onPress={() => setFilter('unknown')}
        />
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
      </FilterBar>
      
      <Timeline>
        {filteredActivities.map(activity => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onPress={() => viewDetails(activity)}
            onPlayClip={() => playClip(activity.clipUrl)}
          />
        ))}
      </Timeline>
      
      <ExportButton onPress={exportReport} />
    </Container>
  );
};
```

### 6. Settings Screen

**Purpose:** Configure app and system settings

**Sections:**
- Account settings
- Doorbell configuration
- Privacy settings
- Notification preferences
- Storage management
- Smart home integrations

```tsx
const SettingsScreen: React.FC = () => {
  const settings = useSelector(selectSettings);
  const dispatch = useDispatch();
  
  return (
    <ScrollView>
      {/* Account */}
      <SettingsSection title="Account">
        <SettingItem
          label="Email"
          value={settings.email}
          onPress={editEmail}
        />
        <SettingItem
          label="Change Password"
          onPress={changePassword}
        />
      </SettingsSection>
      
      {/* Doorbell */}
      <SettingsSection title="Doorbell">
        <SettingToggle
          label="Motion Detection"
          value={settings.motionDetection}
          onValueChange={handleMotionDetection}
        />
        <SettingSlider
          label="Motion Sensitivity"
          value={settings.motionSensitivity}
          min={0}
          max={100}
          onValueChange={handleSensitivity}
        />
        <SettingPicker
          label="Video Quality"
          value={settings.videoQuality}
          options={['SD', 'HD', 'Full HD']}
          onValueChange={handleVideoQuality}
        />
      </SettingsSection>
      
      {/* Privacy */}
      <SettingsSection title="Privacy">
        <SettingToggle
          label="Face Recognition"
          value={settings.faceRecognition}
          onValueChange={handleFaceRecognition}
        />
        <SettingToggle
          label="Local Processing Only"
          value={settings.localProcessing}
          onValueChange={handleLocalProcessing}
        />
        <SettingPicker
          label="Auto-Delete After"
          value={settings.retentionDays}
          options={['7 days', '30 days', '90 days', 'Never']}
          onValueChange={handleRetention}
        />
        <SettingItem
          label="Privacy Dashboard"
          onPress={openPrivacyDashboard}
        />
      </SettingsSection>
      
      {/* Notifications */}
      <SettingsSection title="Notifications">
        <SettingToggle
          label="Push Notifications"
          value={settings.pushNotifications}
          onValueChange={handlePushNotifications}
        />
        <SettingToggle
          label="Known Person Alerts"
          value={settings.knownPersonAlerts}
          onValueChange={handleKnownAlerts}
        />
        <SettingToggle
          label="Unknown Person Alerts"
          value={settings.unknownPersonAlerts}
          onValueChange={handleUnknownAlerts}
        />
      </SettingsSection>
      
      {/* Storage */}
      <SettingsSection title="Storage">
        <StorageBar used={settings.storageUsed} total={settings.storageTotal} />
        <SettingItem
          label="Clear Cache"
          onPress={clearCache}
        />
        <SettingItem
          label="Delete Old Clips"
          onPress={deleteOldClips}
        />
      </SettingsSection>
      
      {/* Smart Home */}
      <SettingsSection title="Smart Home">
        <SettingItem
          label="Google Home"
          value={settings.googleHome ? 'Connected' : 'Not Connected'}
          onPress={configureGoogleHome}
        />
        <SettingItem
          label="Amazon Alexa"
          value={settings.alexa ? 'Connected' : 'Not Connected'}
          onPress={configureAlexa}
        />
        <SettingItem
          label="Apple HomeKit"
          value={settings.homeKit ? 'Connected' : 'Not Connected'}
          onPress={configureHomeKit}
        />
      </SettingsSection>
      
      {/* About */}
      <SettingsSection title="About">
        <SettingItem label="Version" value="1.0.0" />
        <SettingItem label="Privacy Policy" onPress={openPrivacyPolicy} />
        <SettingItem label="Terms of Service" onPress={openTerms} />
        <SettingItem label="Help & Support" onPress={openSupport} />
      </SettingsSection>
      
      <LogoutButton onPress={handleLogout} />
    </ScrollView>
  );
};
```

## 🔄 State Management (Redux)

### Store Configuration

```typescript
// src/redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import doorbellReducer from './slices/doorbellSlice';
import peopleReducer from './slices/peopleSlice';
import activityReducer from './slices/activitySlice';
import settingsReducer from './slices/settingsSlice';
import apiMiddleware from './middleware/apiMiddleware';
import websocketMiddleware from './middleware/websocketMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    doorbell: doorbellReducer,
    people: peopleReducer,
    activity: activityReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(apiMiddleware)
      .concat(websocketMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Doorbell Slice Example

```typescript
// src/redux/slices/doorbellSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as DoorbellAPI from '../../services/api/doorbell';

interface DoorbellState {
  isOnline: boolean;
  streamUrl: string | null;
  currentVisitor: Person | null;
  todayVisitors: number;
  knownFaces: number;
  batteryLevel: number;
  loading: boolean;
  error: string | null;
}

const initialState: DoorbellState = {
  isOnline: false,
  streamUrl: null,
  currentVisitor: null,
  todayVisitors: 0,
  knownFaces: 0,
  batteryLevel: 100,
  loading: false,
  error: null,
};

export const fetchDoorbellStatus = createAsyncThunk(
  'doorbell/fetchStatus',
  async () => {
    const response = await DoorbellAPI.getStatus();
    return response.data;
  }
);

export const startLiveStream = createAsyncThunk(
  'doorbell/startStream',
  async () => {
    const response = await DoorbellAPI.startStream();
    return response.data.streamUrl;
  }
);

const doorbellSlice = createSlice({
  name: 'doorbell',
  initialState,
  reducers: {
    setCurrentVisitor: (state, action: PayloadAction<Person | null>) => {
      state.currentVisitor = action.payload;
    },
    incrementVisitorCount: (state) => {
      state.todayVisitors += 1;
    },
    updateBatteryLevel: (state, action: PayloadAction<number>) => {
      state.batteryLevel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoorbellStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDoorbellStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.isOnline = action.payload.isOnline;
        state.batteryLevel = action.payload.batteryLevel;
        state.todayVisitors = action.payload.todayVisitors;
      })
      .addCase(fetchDoorbellStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch status';
      })
      .addCase(startLiveStream.fulfilled, (state, action) => {
        state.streamUrl = action.payload;
      });
  },
});

export const { setCurrentVisitor, incrementVisitorCount, updateBatteryLevel } = 
  doorbellSlice.actions;

export default doorbellSlice.reducer;
```

## 🔌 Services

### WebRTC Service

```typescript
// src/services/webrtc/WebRTCService.ts
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  
  async initializeConnection(iceServers: RTCIceServer[]) {
    this.peerConnection = new RTCPeerConnection({
      iceServers,
    });
    
    this.peerConnection.onicecandidate = this.handleIceCandidate;
    this.peerConnection.ontrack = this.handleTrack;
  }
  
  async startLocalStream() {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    
    this.localStream = stream;
    stream.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, stream);
    });
    
    return stream;
  }
  
  async createOffer() {
    const offer = await this.peerConnection?.createOffer();
    await this.peerConnection?.setLocalDescription(offer);
    return offer;
  }
  
  async handleAnswer(answer: RTCSessionDescriptionInit) {
    await this.peerConnection?.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  }
  
  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.peerConnection?.addIceCandidate(
      new RTCIceCandidate(candidate)
    );
  }
  
  private handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      // Send ICE candidate to signaling server
    }
  };
  
  private handleTrack = (event: RTCTrackEvent) => {
    this.remoteStream = event.streams[0];
    // Update UI with remote stream
  };
  
  closeConnection() {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
  }
}

export default new WebRTCService();
```

### Push Notification Service

```typescript
// src/services/notifications/PushNotificationService.ts
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

class PushNotificationService {
  async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
           authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  }
  
  async getToken(): Promise<string> {
    return await messaging().getToken();
  }
  
  setupForegroundHandler() {
    messaging().onMessage(async remoteMessage => {
      this.showNotification(remoteMessage);
    });
  }
  
  setupBackgroundHandler() {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background message:', remoteMessage);
    });
  }
  
  private showNotification(message: any) {
    PushNotification.localNotification({
      title: message.notification?.title || 'Smart Doorbell',
      message: message.notification?.body || 'Someone is at your door',
      userInfo: message.data,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      playSound: true,
      soundName: 'doorbell.mp3',
    });
  }
  
  createChannels() {
    PushNotification.createChannel(
      {
        channelId: 'doorbell-alerts',
        channelName: 'Doorbell Alerts',
        channelDescription: 'Notifications for doorbell activity',
        playSound: true,
        soundName: 'doorbell.mp3',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Channel created: ${created}`)
    );
  }
}

export default new PushNotificationService();
```

## 📦 Dependencies

### package.json

```json
{
  "name": "SmartDoorbellApp",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest",
    "lint": "eslint .",
    "build:android": "cd android && ./gradlew assembleRelease",
    "build:ios": "cd ios && xcodebuild -workspace SmartDoorbell.xcworkspace -scheme SmartDoorbell -configuration Release"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.0",
    
    "// State Management": "",
    "@reduxjs/toolkit": "^2.0.1",
    "react-redux": "^9.0.4",
    
    "// Navigation": "",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "react-native-screens": "^3.29.0",
    "react-native-safe-area-context": "^4.8.2",
    
    "// WebRTC": "",
    "react-native-webrtc": "^118.0.0",
    
    "// Push Notifications": "",
    "@react-native-firebase/app": "^19.0.0",
    "@react-native-firebase/messaging": "^19.0.0",
    "react-native-push-notification": "^8.1.1",
    
    "// Camera & Media": "",
    "react-native-image-picker": "^7.1.0",
    "react-native-camera": "^4.2.1",
    "react-native-video": "^5.2.1",
    
    "// Storage": "",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-encrypted-storage": "^4.0.3",
    
    "// Biometrics": "",
    "react-native-biometrics": "^3.0.1",
    
    "// UI Components": "",
    "react-native-vector-icons": "^10.0.3",
    "react-native-gesture-handler": "^2.14.1",
    "react-native-reanimated": "^3.6.1",
    
    "// Utilities": "",
    "axios": "^1.6.5",
    "socket.io-client": "^4.6.1",
    "date-fns": "^3.0.6",
    "react-native-device-info": "^10.12.0"
  },
  "devDependencies": {
    "@babel/core": "^7.23.7",
    "@babel/preset-env": "^7.23.7",
    "@babel/runtime": "^7.23.7",
    "@react-native/babel-preset": "^0.73.19",
    "@react-native/eslint-config": "^0.73.2",
    "@react-native/metro-config": "^0.73.3",
    "@react-native/typescript-config": "^0.73.1",
    "@types/react": "^18.2.47",
    "@types/react-test-renderer": "^18.0.7",
    "babel-jest": "^29.7.0",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "prettier": "^3.1.1",
    "react-test-renderer": "18.2.0",
    "typescript": "^5.3.3"
  }
}
```

## 🔐 Security Features

### Secure Storage

```typescript
// src/services/storage/SecureStorage.ts
import EncryptedStorage from 'react-native-encrypted-storage';

class SecureStorage {
  async saveToken(token: string) {
    await EncryptedStorage.setItem('auth_token', token);
  }
  
  async getToken(): Promise<string | null> {
    return await EncryptedStorage.getItem('auth_token');
  }
  
  async saveBiometricData(data: BiometricData) {
    const encrypted = await this.encrypt(JSON.stringify(data));
    await EncryptedStorage.setItem('biometric_data', encrypted);
  }
  
  async getBiometricData(): Promise<BiometricData | null> {
    const encrypted = await EncryptedStorage.getItem('biometric_data');
    if (!encrypted) return null;
    
    const decrypted = await this.decrypt(encrypted);
    return JSON.parse(decrypted);
  }
  
  async clearAll() {
    await EncryptedStorage.clear();
  }
  
  private async encrypt(data: string): Promise<string> {
    // Implement AES-256 encryption
    return data; // Placeholder
  }
  
  private async decrypt(data: string): Promise<string> {
    // Implement AES-256 decryption
    return data; // Placeholder
  }
}

export default new SecureStorage();
```

## 📲 Building & Distribution

### Android APK Build

```bash
# Debug APK
cd android
./gradlew assembleDebug

# Release APK
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### iOS IPA Build

```bash
# Archive
cd ios
xcodebuild -workspace SmartDoorbell.xcworkspace \
           -scheme SmartDoorbell \
           -configuration Release \
           -archivePath build/SmartDoorbell.xcarchive \
           archive

# Export IPA
xcodebuild -exportArchive \
           -archivePath build/SmartDoorbell.xcarchive \
           -exportPath build \
           -exportOptionsPlist ExportOptions.plist
```

### App Store / Play Store Submission

See [DISTRIBUTION.md](./docs/DISTRIBUTION.md) for detailed submission guidelines.

## 🧪 Testing

### Unit Tests

```typescript
// __tests__/components/PersonCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PersonCard from '../../src/components/person/PersonCard';

describe('PersonCard', () => {
  const mockPerson = {
    id: '1',
    name: 'John Doe',
    relationship: 'Friend',
    photoUrl: 'https://example.com/photo.jpg',
    lastSeen: new Date(),
  };
  
  it('renders person name correctly', () => {
    const { getByText } = render(<PersonCard person={mockPerson} />);
    expect(getByText('John Doe')).toBeTruthy();
  });
  
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PersonCard person={mockPerson} onPress={onPress} />
    );
    
    fireEvent.press(getByTestId('person-card'));
    expect(onPress).toHaveBeenCalledWith(mockPerson);
  });
});
```

## 📊 Performance Optimization

### Image Optimization

```typescript
import FastImage from 'react-native-fast-image';

<FastImage
  source={{
    uri: imageUrl,
    priority: FastImage.priority.high,
  }}
  resizeMode={FastImage.resizeMode.cover}
  style={styles.image}
/>
```

### List Optimization

```typescript
import { FlatList } from 'react-native';

<FlatList
  data={activities}
  renderItem={renderActivity}
  keyExtractor={item => item.id}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

## 🚀 Next Steps

1. **Implement Core Screens** - Build all 6 main screens
2. **Integrate WebRTC** - Set up video streaming
3. **Add Push Notifications** - Configure FCM
4. **Implement Face Recognition** - Integrate ML models
5. **Build & Test** - Create APK/IPA files
6. **Submit to Stores** - Prepare for distribution

---

**Complete mobile app architecture for a privacy-first smart doorbell system!** 📱🔔🔒