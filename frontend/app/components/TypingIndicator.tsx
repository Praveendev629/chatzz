import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

export default function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const bounce = (dot: Animated.Value, delay: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: -6, duration: 250, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.delay(500),
      ])
    );

  useEffect(() => {
    const anim = Animated.parallel([bounce(dot1, 0), bounce(dot2, 150), bounce(dot3, 300)]);
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', marginVertical: 4, paddingHorizontal: 4 },
  bubble: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});
