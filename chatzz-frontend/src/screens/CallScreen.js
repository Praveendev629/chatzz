/**
 * CallScreen.js - Voice and Video calls
 * Works without react-native-webrtc (shows message)
 * For full WebRTC support, use development build
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';

// Try to load WebRTC, fallback to null if not available
let RTCPeerConnection = null;
let mediaDevices = null;
let RTCView = null;
let webrtcAvailable = false;

try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  mediaDevices = webrtc.mediaDevices;
  RTCView = webrtc.RTCView;
  webrtcAvailable = true;
} catch (_) {
  // WebRTC not available - app will still work
  console.log('WebRTC not available - calls will show placeholder');
}

// ICE configuration - minimal for faster connection
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 0,
};

const CallScreen = ({ route, navigation }) => {
  const { participant, callType = 'voice', isIncoming = false, offer = null } = route.params;
  const { user } = useAuth();
  const socket = getSocket();

  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteStream, setRemoteStream] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const durationTimer = useRef(null);
  const ringtoneRef = useRef(null);
  const recordingRef = useRef(null);

  useEffect(() => {
    if (!RTCPeerConnection) {
      Alert.alert(
        'Call Feature',
        'Calls require a development build.\n\nTo enable calls:\n1. Run: npx expo prebuild\n2. Run: npx expo run:android',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    setupSocket();
    if (isIncoming) {
      playRingtone();
    } else {
      startCall();
    }

    return () => { cleanup(); };
  }, []);

  const playRingtone = async () => {
    try {
      await Audio.setAudioModeAsync({ staysActiveInBackground: true, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/ringtone.wav'),
        { isLooping: true, shouldPlay: true, volume: 1.0 }
      );
      ringtoneRef.current = sound;
      await sound.playAsync();
    } catch (err) {
      console.warn('Ringtone error:', err.message);
    }
  };

  const stopRingtone = async () => {
    if (ringtoneRef.current) {
      try {
        await ringtoneRef.current.stopAsync();
        await ringtoneRef.current.unloadAsync();
        ringtoneRef.current = null;
      } catch (_) {}
    }
  };

  const setupSocket = () => {
    socket?.on('call_answer', handleAnswer);
    socket?.on('call_ice_candidate', handleIceCandidate);
    socket?.on('call_ended', handleCallEnded);
    socket?.on('call_rejected', handleCallRejected);
  };

  const startCall = async () => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
        },
        video: callType === 'video' ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
        } : false,
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket?.emit('call_ice_candidate', {
            to: participant._id,
            candidate: e.candidate,
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed') {
          Alert.alert('Connection Lost', 'Call connection failed');
          cleanup();
          navigation.goBack();
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE state:', pc.iceConnectionState);
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Got remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Create offer
      const callOffer = await pc.createOffer();
      await pc.setLocalDescription(callOffer);

      socket?.emit('call_offer', {
        to: participant._id,
        offer: callOffer,
        callType,
        caller: {
          _id: user._id,
          username: user.username,
          profilePicture: user.profilePicture,
        },
      });
    } catch (err) {
      console.error('Start call error:', err);
      Alert.alert('Error', 'Could not start call: ' + err.message);
      navigation.goBack();
    }
  };

  const answerCall = async () => {
    await stopRingtone();
    setCallStatus('connected');
    startDurationTimer();

    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
        },
        video: callType === 'video' ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
        } : false,
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket?.emit('call_ice_candidate', {
            to: participant._id,
            candidate: e.candidate,
          });
        }
      };

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed') {
          Alert.alert('Connection Lost', 'Call connection failed');
          cleanup();
          navigation.goBack();
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Got remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Set remote description and create answer
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit('call_answer', {
        to: participant._id,
        answer,
      });
    } catch (err) {
      console.error('Answer call error:', err);
      Alert.alert('Error', 'Could not answer call');
      navigation.goBack();
    }
  };

  const handleAnswer = async ({ answer }) => {
    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(answer);
      setCallStatus('connected');
      startDurationTimer();
    }
  };

  const handleIceCandidate = async ({ candidate }) => {
    if (pcRef.current && candidate) {
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.warn('ICE candidate error:', err.message);
      }
    }
  };

  const handleCallEnded = () => {
    setCallStatus('ended');
    setTimeout(() => navigation.goBack(), 1500);
  };

  const handleCallRejected = () => {
    setCallStatus('rejected');
    setTimeout(() => navigation.goBack(), 1500);
  };

  const endCall = () => {
    socket?.emit('call_end', { to: participant._id });
    cleanup();
    navigation.goBack();
  };

  const rejectCall = async () => {
    await stopRingtone();
    socket?.emit('call_reject', { to: participant._id });
    navigation.goBack();
  };

  const cleanup = async () => {
    clearInterval(durationTimer.current);
    await stopRingtone();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    setRemoteStream(null);
    socket?.off('call_answer', handleAnswer);
    socket?.off('call_ice_candidate', handleIceCandidate);
    socket?.off('call_ended', handleCallEnded);
    socket?.off('call_rejected', handleCallRejected);
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (_) {}
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => { t.enabled = !isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach((t) => { t.enabled = !isVideoEnabled; });
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleSpeaker = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: isSpeaker,
      });
      setIsSpeaker(!isSpeaker);
    } catch (_) {}
  };

  const toggleRecording = async () => {
    if (isRecording) {
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        recordingRef.current = null;
        setIsRecording(false);
        Alert.alert('Recording saved', 'Call recording saved to your device.');
      } catch (_) {}
    } else {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') return;
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recordingRef.current = recording;
        setIsRecording(true);
        Alert.alert('Recording started', 'Call is being recorded.');
      } catch (err) {
        Alert.alert('Error', 'Could not start recording: ' + err.message);
      }
    }
  };

  const switchToVideo = async () => {
    try {
      // Get video stream
      const stream = await mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
        },
      });

      // Add video tracks to peer connection
      if (pcRef.current && stream) {
        const videoTrack = stream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(videoTrack);
        } else {
          pcRef.current.addTrack(videoTrack, stream);
        }

        // Update local stream
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
        }

        setIsVideoEnabled(true);
        Alert.alert('Video Started', 'Your camera is now active');
      }
    } catch (err) {
      console.error('Switch to video error:', err);
      Alert.alert('Error', 'Could not start video: ' + err.message);
    }
  };

  const startDurationTimer = () => {
    durationTimer.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const statusText = {
    calling: `Calling${callType === 'video' ? ' (Video)' : ''}...`,
    incoming: `Incoming ${callType === 'video' ? 'Video ' : ''}Call`,
    connected: formatDuration(callDuration),
    ended: 'Call Ended',
    rejected: 'Call Declined',
  }[callStatus] || '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D2B" />

      {/* Video Views (shown during video call) */}
      {isVideoEnabled && callStatus === 'connected' && (
        <View style={styles.videoContainer}>
          {/* Remote Video (full screen) */}
          {remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
            />
          ) : (
            <View style={[styles.remoteVideo, styles.waitingVideo]}>
              <Text style={styles.waitingText}>Waiting for video...</Text>
            </View>
          )}

          {/* Local Video (small preview) */}
          {localStreamRef.current && (
            <View style={styles.localVideoContainer}>
              <RTCView
                streamURL={localStreamRef.current.toURL()}
                style={styles.localVideo}
                objectFit="cover"
                mirror={true}
              />
            </View>
          )}
        </View>
      )}

      {/* Voice Call UI (shown when video is off) */}
      {!isVideoEnabled && (
        <>
          {callStatus === 'calling' || callStatus === 'incoming' ? (
            <View style={styles.pulseRing} />
          ) : null}

          <View style={styles.callerSection}>
            {participant.profilePicture ? (
              <Image source={{ uri: participant.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={50} color="#ccc" />
              </View>
            )}
            <Text style={styles.callerName}>{participant.username}</Text>
            <Text style={styles.callStatus}>{statusText}</Text>
            {callStatus === 'connected' && (
              <View style={styles.callQuality}>
                <Ionicons name="wifi" size={14} color="#4CAF50" />
                <Text style={styles.callQualityText}>Connected</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Extra controls during connected call */}
      {callStatus === 'connected' && (
        <View style={styles.extraControls}>
          <CtrlBtn
            icon="radio-button-on"
            label={isRecording ? 'Stop Rec' : 'Record'}
            onPress={toggleRecording}
            active={isRecording}
            activeColor="#FF1744"
          />
          <CtrlBtn
            icon="videocam"
            label={isVideoEnabled ? 'Stop Video' : 'Video'}
            onPress={callType === 'voice' ? switchToVideo : toggleVideo}
            active={isVideoEnabled}
            activeColor="#2196F3"
          />
        </View>
      )}

      {/* Main Controls */}
      <View style={styles.controls}>
        {callStatus === 'incoming' ? (
          <View style={styles.incomingControls}>
            <TouchableOpacity style={styles.rejectBtn} onPress={rejectCall}>
              <Ionicons name="call" size={34} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 8 }}>
                swipe to answer
              </Text>
            </View>
            <TouchableOpacity style={styles.answerBtn} onPress={answerCall}>
              <Ionicons name="call" size={34} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activeControls}>
            <CtrlBtn
              icon={isMuted ? 'mic-off' : 'mic'}
              label={isMuted ? 'Unmute' : 'Mute'}
              onPress={toggleMute}
              active={isMuted}
            />
            <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
              <Ionicons name="call" size={34} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <CtrlBtn
              icon={isSpeaker ? 'volume-high' : 'volume-medium'}
              label="Speaker"
              onPress={toggleSpeaker}
              active={isSpeaker}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const CtrlBtn = ({ icon, label, onPress, active, activeColor = 'rgba(255,255,255,0.3)' }) => (
  <TouchableOpacity
    style={[styles.ctrlBtn, active && { backgroundColor: activeColor }]}
    onPress={onPress}
  >
    <Ionicons name={icon} size={24} color="#fff" />
    <Text style={styles.ctrlLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D2B',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 50,
  },
  // Video styles
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  waitingVideo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  localVideo: {
    flex: 1,
  },
  // Voice call styles
  pulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    top: 120,
  },
  callerSection: {
    alignItems: 'center',
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  callerName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.7)',
  },
  callQuality: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  callQualityText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  extraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
    marginBottom: 10,
  },
  ctrlBtn: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    minWidth: 68,
  },
  ctrlLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  controls: {
    width: '100%',
    paddingHorizontal: 40,
  },
  incomingControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rejectBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  endCallBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CallScreen;
