import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { COLORS } from '../utils/constants';

const { width, height } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export default function SplashScreenView({ onFinish }: Props) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(20)).current;
  const watermarkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslate, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(watermarkOpacity, {
        toValue: 0.5,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onFinish, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textTranslate }],
          alignItems: 'center',
        }}>
        <Text style={styles.appName}>CHATZZ</Text>
        <Text style={styles.tagline}>INSTANT MESSENGER</Text>
      </Animated.View>

      <Animated.Text style={[styles.watermark, { opacity: watermarkOpacity }]}>
        craft by p.s
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.white,
    letterSpacing: 3,
    marginTop: 6,
    opacity: 0.8,
  },
  watermark: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: COLORS.white,
    letterSpacing: 1,
  },
});
