import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, StatusBar, Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const watermarkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // WhatsApp-style: logo fades/scales in, then name appears, then watermark
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(nameOpacity, {
        toValue: 1,
        duration: 350,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(watermarkOpacity, {
        toValue: 1,
        duration: 300,
        delay: 50,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Stay for 1.2s then dismiss (like WhatsApp)
      setTimeout(() => {
        onFinish && onFinish();
      }, 1200);
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />

      {/* Center logo + name */}
      <View style={styles.centerContent}>
        <Animated.View
          style={[
            styles.logoWrapper,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text style={[styles.appName, { opacity: nameOpacity }]}>
          Chatzz
        </Animated.Text>
      </View>

      {/* Bottom watermark */}
      <Animated.View style={[styles.bottomSection, { opacity: watermarkOpacity }]}>
        <Text style={styles.fromText}>from</Text>
        <Text style={styles.watermark}>A product from P.S</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  bottomSection: {
    paddingBottom: 48,
    alignItems: 'center',
  },
  fromText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  watermark: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;
