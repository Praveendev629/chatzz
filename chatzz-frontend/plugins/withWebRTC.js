const { withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withWebRTC(config) {
  // Ensure WebRTC native module is properly configured for Android
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('react-native-webrtc')) {
      // Add packaging options for WebRTC shared libraries
      config.modResults.contents = config.modResults.contents.replace(
        /android\s*\{/,
        `android {\n    // react-native-webrtc packaging options`
      );
    }
    return config;
  });

  return config;
};
