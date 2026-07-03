import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, StatusBar, Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const LOADING_TEXTS = [
  'Initializing...',
  'Loading chats...',
  'Connecting to server...',
  'Almost ready...',
];

const SplashScreen = ({ onFinish }) => {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const watermarkOpacity = useRef(new Animated.Value(0)).current;
  const loadingBarWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0]);
  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    // Pulse animation for logo (loops)
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Loading dots animation (loops)
    const dotsAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(dot1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot2Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.timing(dot3Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(dot1Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.timing(dot2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot3Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(dot1Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.timing(dot2Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.timing(dot3Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ])
    );

    // Main entrance animation
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
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(nameOpacity, {
        toValue: 1,
        duration: 400,
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
      // Start pulse and dots after entrance
      pulseAnimation.start();
      dotsAnimation.start();

      // Animate loading bar
      Animated.timing(loadingBarWidth, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: false,
      }).start();

      // Cycle through loading texts
      const textInterval = setInterval(() => {
        setLoadingIndex((prev) => {
          const next = (prev + 1) % LOADING_TEXTS.length;
          setLoadingText(LOADING_TEXTS[next]);
          return next;
        });
      }, 600);

      // Finish after animation completes
      setTimeout(() => {
        clearInterval(textInterval);
        pulseAnimation.stop();
        dotsAnimation.stop();
        onFinish && onFinish();
      }, 3000);
    });

    return () => {
      pulseAnimation.stop();
      dotsAnimation.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />

      {/* Center logo + name */}
      <View style={styles.centerContent}>
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: Animated.multiply(logoScale, pulseAnim) }],
            },
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

        {/* Loading dots */}
        <Animated.View style={[styles.loadingDots, { opacity: watermarkOpacity }]}>
          <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
          <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
          <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
        </Animated.View>

        {/* Loading text */}
        <Animated.Text style={[styles.loadingText, { opacity: watermarkOpacity }]}>
          {loadingText}
        </Animated.Text>

        {/* Loading bar */}
        <Animated.View style={[styles.loadingBarContainer, { opacity: watermarkOpacity }]}>
          <Animated.View
            style={[
              styles.loadingBar,
              {
                width: loadingBarWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </Animated.View>
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
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: 'rgba(229, 57, 53, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(229, 57, 53, 0.4)',
  },
  logo: {
    width: 85,
    height: 85,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 30,
  },
  loadingDots: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
    marginHorizontal: 4,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  loadingBarContainer: {
    width: 180,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBar: {
    height: '100%',
    backgroundColor: '#E53935',
    borderRadius: 2,
  },
  bottomSection: {
    paddingBottom: 48,
    alignItems: 'center',
  },
  fromText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  watermark: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;
