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
  StatusBar as RNStatusBar,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';

// App background color - dark navy matching Aether theme
const APP_BG = '#080c16';

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
  const [retryCountdown, setRetryCountdown] = useState(5);
  const [errorDetails, setErrorDetails] = useState('');

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
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [canGoBack]);

  // Auto-retry timer when connection error / timeout occurs
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (hasError) {
      setRetryCountdown(5);
      timer = setInterval(() => {
        setRetryCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleRetry();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [hasError]);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  const renderCustomError = (desc?: string) => (
    <View style={styles.errorContainer}>
      <View style={styles.errorCard}>
        <View style={styles.radarPulse}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
        <Text style={styles.errorTitle}>Cloud Server Waking Up</Text>
        <Text style={styles.errorSubtitle}>
          {desc?.includes('TIMED_OUT') 
            ? "Aether cloud enclave is waking from cold sleep on mobile network. Connecting automatically..." 
            : "Re-establishing secure encrypted session with Aether Cloud."}
        </Text>
        <Text style={styles.countdownText}>
          Auto-retrying in <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{retryCountdown}s</Text>
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>⚡ Connect Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Seamless edge-to-edge status bar matching dark navy background */}
      <RNStatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent={true}
      />
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />

      {/* The Exact 1:1 Live Aether Web Dashboard */}
      <WebView
          ref={webViewRef}
          source={{ uri: AETHER_URL }}
          style={styles.webView}
          userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          geolocationEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          {...({
            onPermissionRequest: (event: any) => {
              event?.grant?.(event.resources);
            }
          } as any)}
          originWhitelist={['*']}
          mixedContentMode="always"
          cacheEnabled={false}
          cacheMode="LOAD_NO_CACHE"
          onShouldStartLoadWithRequest={(request) => {
            const url = request.url;

            // 1. NEVER block or hijack iframe subrequests (such as embedded YouTube video player)
            if (request.isTopFrame === false) {
              return true;
            }

            // 2. Allow embedded YouTube players and media to load smoothly inside the WebView
            if (url.includes('/embed/') || url.includes('youtube.com/embed')) {
              return true;
            }

            // 3. Open native Phone Dialer, SMS, and Mail externally without breaking the WebView session
            if (
              url.startsWith('tel:') ||
              url.startsWith('sms:') ||
              url.startsWith('mailto:')
            ) {
              Linking.openURL(url).catch(() => {});
              return false;
            }

            // 4. Open native Map apps (Google Maps on Android, Apple Maps on iOS) externally
            if (
              url.startsWith('geo:') ||
              url.startsWith('maps:') ||
              url.includes('google.com/maps') ||
              url.includes('maps.google.com') ||
              url.includes('maps.apple.com')
            ) {
              Linking.openURL(url).catch(() => {});
              return false;
            }

            // 5. If user explicitly clicked an external YouTube watch link from outside an embed
            if (
              (url.startsWith('vnd.youtube:') ||
               url.includes('youtube.com/watch') ||
               url.includes('youtu.be/')) &&
              !url.includes('/embed/')
            ) {
              Linking.openURL(url).catch(() => {});
              return false;
            }

            // If OAuth provider falls back to localhost redirect, redirect back to cloud AETHER_URL with token intact
            if (url.includes('access_token') && (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1'))) {
              const hashIndex = url.indexOf('#');
              if (hashIndex !== -1) {
                const targetUrl = `${AETHER_URL}/${url.substring(hashIndex)}`;
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
              if (data.type === 'MAKE_CALL') {
                const telUrl = data.telUrl || (data.phoneNumber ? `tel:${data.phoneNumber}` : 'tel:');
                Linking.openURL(telUrl).catch(() => {});
              } else if (data.type === 'OPEN_MAP') {
                webViewRef.current?.injectJavaScript(`window.__mapOpenedByNative = true; true;`);
                const { latitude, longitude, webUrl } = data;
                let nativeMapUrl = '';
                if (latitude && longitude) {
                  if (Platform.OS === 'android') {
                    nativeMapUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
                  } else {
                    nativeMapUrl = `maps://?q=${latitude},${longitude}`;
                  }
                } else {
                  nativeMapUrl = Platform.OS === 'android' ? 'geo:0,0?q=maps' : 'maps://';
                }

                Linking.canOpenURL(nativeMapUrl)
                  .then((supported) => {
                    if (supported) {
                      return Linking.openURL(nativeMapUrl);
                    }
                    return Linking.openURL(webUrl || `https://www.google.com/maps?q=${latitude || ''},${longitude || ''}`);
                  })
                  .catch(() => {
                    Linking.openURL(webUrl || `https://www.google.com/maps?q=${latitude || ''},${longitude || ''}`).catch(() => {});
                  });
              } else if (data.type === 'TRIGGER_NOTIFICATION') {
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
              } else if (data.type === 'REQUEST_MIC_PERMISSION') {
                if (Platform.OS === 'android') {
                  try {
                    const result = await PermissionsAndroid.request(
                      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                      {
                        title: "Aether Microphone Permission",
                        message: "Aether needs microphone access so you can speak your voice prompts.",
                        buttonNeutral: "Ask Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "Allow"
                      }
                    );
                    // Send result back to WebView
                    const granted = result === PermissionsAndroid.RESULTS.GRANTED;
                    webViewRef.current?.injectJavaScript(`
                      window.__micPermissionGranted = ${granted};
                      if (window.__onMicPermissionResult) window.__onMicPermissionResult(${granted});
                      true;
                    `);
                  } catch (e) {}
                }
              } else if (data.type === 'REQUEST_LOCATION_PERMISSION') {
                if (Platform.OS === 'android') {
                  try {
                    const result = await PermissionsAndroid.request(
                      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                      {
                        title: "Aether Location Permission",
                        message: "Aether needs GPS/Location access for local weather, executive briefing, and smart maps.",
                        buttonNeutral: "Ask Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "Allow"
                      }
                    );
                    const granted = result === PermissionsAndroid.RESULTS.GRANTED;
                    webViewRef.current?.injectJavaScript(`
                      window.__locationPermissionGranted = ${granted};
                      if (window.__onLocationPermissionResult) window.__onLocationPermissionResult(${granted});
                      true;
                    `);
                  } catch (e) {}
                }
              } else if (data.type === 'REQUEST_NOTIFICATION_PERMISSION') {
                try {
                  const { status } = await Notifications.requestPermissionsAsync();
                  const granted = status === 'granted';
                  webViewRef.current?.injectJavaScript(`
                    window.__notificationPermissionGranted = ${granted};
                    true;
                  `);
                } catch (e) {}
              } else if (data.type === 'PLAY_TTS_AUDIO') {
                // Audio is handled natively and cleanly directly within the webview Audio element
                // No duplicate injection needed to prevent 2 audio streams playing simultaneously
              } else if (data.type === 'STORE_NATIVE_BACKUP') {
                if (data.payload) {
                  AsyncStorage.setItem('aether_offline_backup', JSON.stringify(data.payload)).catch(() => {});
                }
              }
            } catch (err) {
              console.warn('WebView onMessage error:', err);
            }
          }}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoadEnd={async () => {
            setIsLoading(false);
            try {
              const backup = await AsyncStorage.getItem('aether_offline_backup');
              if (backup) {
                const escaped = JSON.stringify(backup);
                webViewRef.current?.injectJavaScript(`
                  try {
                    window.__nativeBackup = ${escaped};
                    window.dispatchEvent(new CustomEvent('aether-native-backup-ready'));
                  } catch(e) {}
                  true;
                `);
              }
            } catch (e) {}
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            const url = nativeEvent?.url || '';
            const desc = nativeEvent?.description || '';
            const code = nativeEvent?.code;

            // STRICT GUARD: Ignore non-critical scheme or cancellation errors
            // (e.g. Opening phone dialer with tel:, mailto:, sms:, geo:, iframe aborts)
            if (
              url.startsWith('tel:') ||
              url.startsWith('sms:') ||
              url.startsWith('mailto:') ||
              url.startsWith('geo:') ||
              url.startsWith('maps:') ||
              url.includes('/embed/') ||
              desc.includes('ERR_UNKNOWN_URL_SCHEME') ||
              desc.includes('ERR_ABORTED') ||
              code === -10 || // ERROR_UNSUPPORTED_SCHEME
              code === -3    // ERR_ABORTED
            ) {
              console.log('[Aether Native] Ignored harmless scheme or abort error:', desc, url);
              return;
            }

            setErrorDetails(desc || 'Connection timeout');
            setHasError(true);
            setIsLoading(false);
          }}
          renderError={(errorDomain, errorCode, errorDesc) => {
            if (
              errorCode === -10 ||
              errorCode === -3 ||
              errorDesc?.includes('ERR_UNKNOWN_URL_SCHEME') ||
              errorDesc?.includes('ERR_ABORTED')
            ) {
              return <View style={{ flex: 1, backgroundColor: APP_BG }} />;
            }
            return renderCustomError(errorDesc);
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

        {/* Offline / Connection Error Overlay */}
        {hasError && renderCustomError(errorDetails)}
      </View>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_BG,
  },
  webView: {
    flex: 1,
    backgroundColor: APP_BG,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: APP_BG,
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
    backgroundColor: APP_BG,
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
  radarPulse: {
    marginBottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  countdownText: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 20,
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
