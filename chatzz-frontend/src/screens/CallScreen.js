/**
 * CallScreen.js
 * Real-time voice calling using WebRTC + Socket.IO signaling.
 * Requires `react-native-webrtc` (see README for setup).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { Colors } from '../theme';

// RTCPeerConnection is injected from react-native-webrtc
// If not available, fallback to null
let RTCPeerConnection = null;
let mediaDevices = null;
try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  mediaDevices = webrtc.mediaDevices;
} catch (_) {
  // react-native-webrtc not installed
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const CallScreen = ({ route, navigation }) => {
  const { participant, callType = 'voice', isIncoming = false, offer = null } = route.params;
  const { user } = useAuth();
  const socket = getSocket();

  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const durationTimer = useRef(null);

  useEffect(() => {
    if (!RTCPeerConnection) {
      Alert.alert(
        'Call Feature',
        'Voice calling requires a development build with react-native-webrtc. Please see README for setup instructions.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    setupSocket();
    if (!isIncoming) startCall();

    return () => {
      cleanup();
    };
  }, []);

  const setupSocket = () => {
    socket?.on('call_answer', handleAnswer);
    socket?.on('call_ice_candidate', handleIceCandidate);
    socket?.on('call_ended', handleCallEnded);
    socket?.on('call_rejected', handleCallRejected);
  };

  const startCall = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket?.emit('call_ice_candidate', {
            to: participant._id,
            candidate: e.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit('call_offer', {
        to: participant._id,
        offer,
        caller: { _id: user._id, username: user.username, profilePicture: user.profilePicture },
      });
    } catch (err) {
      Alert.alert('Error', 'Could not start call: ' + err.message);
      navigation.goBack();
    }
  };

  const answerCall = async () => {
    try {
      setCallStatus('connected');
      startDurationTimer();

      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket?.emit('call_ice_candidate', { to: participant._id, candidate: e.candidate });
        }
      };

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit('call_answer', { to: participant._id, answer });
    } catch (err) {
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
      await pcRef.current.addIceCandidate(candidate);
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

  const rejectCall = () => {
    socket?.emit('call_reject', { to: participant._id });
    navigation.goBack();
  };

  const cleanup = () => {
    clearInterval(durationTimer.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    socket?.off('call_answer', handleAnswer);
    socket?.off('call_ice_candidate', handleIceCandidate);
    socket?.off('call_ended', handleCallEnded);
    socket?.off('call_rejected', handleCallRejected);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const startDurationTimer = () => {
    durationTimer.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const statusText = {
    calling: 'Calling...',
    incoming: 'Incoming Call',
    connected: formatDuration(callDuration),
    ended: 'Call Ended',
    rejected: 'Call Rejected',
  }[callStatus];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />

      {/* Caller info */}
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
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {callStatus === 'incoming' ? (
          // Incoming call controls
          <View style={styles.incomingControls}>
            <TouchableOpacity style={styles.rejectBtn} onPress={rejectCall}>
              <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.answerBtn} onPress={answerCall}>
              <Ionicons name="call" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          // Active call controls
          <View style={styles.activeControls}>
            <TouchableOpacity
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              onPress={toggleMute}
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={26} color="#fff" />
              <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
              <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
              onPress={() => setIsSpeaker(!isSpeaker)}
            >
              <Ionicons name={isSpeaker ? 'volume-high' : 'volume-medium'} size={26} color="#fff" />
              <Text style={styles.controlLabel}>Speaker</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 60,
  },
  callerSection: { alignItems: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 20 },
  avatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  callerName: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8 },
  callStatus: { fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  controls: { width: '100%', paddingHorizontal: 40 },
  incomingControls: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  rejectBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#F44336', alignItems: 'center', justifyContent: 'center',
  },
  answerBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center',
  },
  activeControls: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
  },
  controlBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 50,
    width: 64, height: 64,
  },
  controlBtnActive: { backgroundColor: Colors.primary },
  controlLabel: { fontSize: 11, color: '#fff', marginTop: 4 },
  endCallBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#F44336', alignItems: 'center', justifyContent: 'center',
  },
});

export default CallScreen;
