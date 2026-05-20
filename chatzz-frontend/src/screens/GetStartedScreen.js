import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const features = [
  { icon: 'flash', title: 'Real-time Messaging', desc: 'Instant delivery with WebSocket technology' },
  { icon: 'shield-checkmark', title: 'Private & Secure', desc: 'Your conversations stay between you' },
  { icon: 'mic', title: 'Voice Messages', desc: 'Record and send audio messages easily' },
  { icon: 'notifications', title: 'Smart Notifications', desc: 'Never miss a message' },
];

const GetStartedScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Background gradient circles */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
        <Image source={require('../../assets/images/logo.jpeg')} style={styles.logo} />
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.appName}>Chatzz</Text>
        <Text style={styles.tagline}>Connect. Chat. Collaborate.</Text>

        <View style={styles.featuresContainer}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={20} color={Colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.getStartedBtn}
          onPress={() => navigation.navigate('Onboarding')}
          activeOpacity={0.85}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <Text style={styles.footnote}>One account per device • Free forever</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  bgCircle1: {
    position: 'absolute', top: -100, right: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: Colors.primary, opacity: 0.08,
  },
  bgCircle2: {
    position: 'absolute', bottom: -50, left: -80,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: Colors.primaryDark, opacity: 0.1,
  },
  logoContainer: {
    width: 120, height: 120, borderRadius: 60,
    overflow: 'hidden', marginBottom: Spacing.lg,
    borderWidth: 3, borderColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  logo: { width: '100%', height: '100%' },
  content: { alignItems: 'center', paddingHorizontal: Spacing.xl, width: '100%' },
  appName: { fontSize: 42, fontWeight: '900', color: Colors.text, letterSpacing: 2 },
  tagline: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.xl },
  featuresContainer: { width: '100%', marginBottom: Spacing.xl },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  featureIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  featureDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  getStartedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 40,
    borderRadius: BorderRadius.full, width: '100%',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  getStartedText: { fontSize: 17, fontWeight: '700', color: Colors.white },
  footnote: { marginTop: Spacing.md, fontSize: 12, color: Colors.textMuted },
});

export default GetStartedScreen;
