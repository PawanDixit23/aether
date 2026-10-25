import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
  Platform,
  PermissionsAndroid,
  StatusBar as RNStatusBar
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';

// Configure heads-up push notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const AETHER_URL = 'https://aether-kjrj.onrender.com';

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Request Android Microphone & Push Notification Permissions on startup
  useEffect(() => {
    const setupPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: "Aether Microphone Permission",
              message: "Aether needs microphone access so you can speak your voice prompts.",
              buttonNeutral: "Ask Later",
              buttonNegative: "Cancel",
              buttonPositive: "Allow"
            }
          );
        } catch (err) {
          console.warn('Mic request error:', err);
        }
      }

      // Configure Native Push Notifications & High-Priority Channel
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('reminders', {
            name: 'Aether Reminders & Alerts',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            lightColor: '#00f0ff',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
          });
        }
      } catch (notifErr) {
        console.warn('Push notification setup error:', notifErr);
      }
    };

    setupPermissions();
  }, []);

  // Handle Android Hardware Back Button to navigate inside webview
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (webViewRef.current && canGoBack) {
          webViewRef.current.goBack();
          return true; // handled
        }
        return false; // let system exit app
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [canGoBack]);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" backgroundColor="#080c16" />

        {/* The Exact 1:1 Live Aether Web Dashboard */}
        <WebView
          ref={webViewRef}
          source={{ uri: AETHER_URL }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          geolocationEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          originWhitelist={['*']}
          mixedContentMode="always"
          cacheEnabled={false}
          cacheMode="LOAD_NO_CACHE"
          onShouldStartLoadWithRequest={(request) => {
            // If OAuth provider falls back to localhost redirect, redirect back to cloud AETHER_URL with token intact
            if (request.url.includes('access_token') && (request.url.startsWith('http://localhost') || request.url.startsWith('http://127.0.0.1'))) {
              const hashIndex = request.url.indexOf('#');
              if (hashIndex !== -1) {
                const targetUrl = `${AETHER_URL}/${request.url.substring(hashIndex)}`;
                webViewRef.current?.injectJavaScript(`window.location.href = "${targetUrl}";`);
                return false;
              }
            }
            return true;
          }}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
          onMessage={async (event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'TRIGGER_NOTIFICATION') {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: data.title || '⚡ AETHER ALERT',
                    body: data.body || '',
                    sound: true,
                  },
                  trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: 1,
                    channelId: 'reminders',
                  },
                });
              } else if (data.type === 'SCHEDULE_REMINDER') {
                const identifier = `reminder-${data.id}`;
                await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
                if (data.triggerSeconds && data.triggerSeconds > 0) {
                  await Notifications.scheduleNotificationAsync({
                    identifier,
                    content: {
                      title: `⏰ AETHER रिमाइंडर: ${data.title}`,
                      body: data.reminder_time ? `समय: ${data.reminder_time} • कार्य का समय हो गया है!` : 'कार्य का समय हो गया है!',
                      sound: true,
                    },
                    trigger: {
                      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                      seconds: Math.max(1, Math.round(data.triggerSeconds)),
                      channelId: 'reminders',
                    },
                  });
                }
              } else if (data.type === 'CANCEL_REMINDER') {
                await Notifications.cancelScheduledNotificationAsync(`reminder-${data.id}`).catch(() => {});
              }
            } catch (err) {
              console.warn('WebView onMessage error:', err);
            }
          }}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
          }}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>⚡ AETHER</Text>
              </View>
              <ActivityIndicator size="large" color="#06b6d4" />
              <Text style={styles.loadingText}>Connecting to 24/7 Cloud Enclave...</Text>
            </View>
          )}
        />

        {/* Offline / Connection Error Screen */}
        {hasError && (
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>📡</Text>
              <Text style={styles.errorTitle}>Connection Offline</Text>
              <Text style={styles.errorSubtitle}>
                Could not connect to Aether Cloud server. Please check your internet connection.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>🔄 Retry Connection</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080c16',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  webView: {
    flex: 1,
    backgroundColor: '#080c16',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080c16',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logoBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    marginBottom: 24,
  },
  logoText: {
    color: '#38bdf8',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 16,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080c16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 20,
  },
  errorCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#f87171',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
