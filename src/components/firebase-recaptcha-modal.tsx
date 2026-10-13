import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { View, Modal, ActivityIndicator, Platform, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export interface FirebaseRecaptchaRef {
  verify: () => Promise<string>;
}

interface Props {
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
  };
}

export const FirebaseRecaptchaModal = forwardRef<FirebaseRecaptchaRef, Props>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const rejectRef = useRef<((err: any) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    verify: () => {
      // On Web, return a placeholder as web uses DOM RecaptchaVerifier
      if (Platform.OS === 'web') {
        return Promise.resolve('web-verifier');
      }

      return new Promise<string>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;
        setVisible(true);
      });
    },
  }));

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'token' && data.token) {
        setVisible(false);
        resolveRef.current?.(data.token);
      } else if (data.type === 'cancel' || data.type === 'error') {
        setVisible(false);
        rejectRef.current?.(new Error(data.message || 'Verification cancelled'));
      }
    } catch {
      // Ignore non-json messages
    }
  };

  const handleClose = () => {
    setVisible(false);
    rejectRef.current?.(new Error('User cancelled phone verification.'));
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <script src="https://www.google.com/recaptcha/api.js" async defer></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background-color: rgba(248, 250, 252, 0.95);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .card {
            background: #ffffff;
            padding: 24px;
            border-radius: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            text-align: center;
          }
          h3 {
            margin: 0 0 12px 0;
            color: #0f172a;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h3>Security Verification</h3>
          <div id="recaptcha-widget" class="g-recaptcha" data-sitekey="6LcMZR0UAAAAALgPMcgHwga7gY5p8QMg1Hj-bmUv" data-callback="onRecaptchaSuccess"></div>
        </div>
        <script>
          function onRecaptchaSuccess(token) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token: token }));
          }
        </script>
      </body>
    </html>
  `;

  if (Platform.OS === 'web') {
    return <View id="recaptcha-container" />;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="w-full max-w-sm h-80 bg-white rounded-3xl overflow-hidden shadow-2xl">
          <View className="p-4 bg-slate-50 border-b border-slate-100 flex-row items-center justify-between">
            <Text className="text-xs font-poppins-bold text-[#0f172a]">
              Safety Verification
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text className="text-xs font-poppins text-slate-400">Cancel</Text>
            </TouchableOpacity>
          </View>
          <WebView
            originWhitelist={['*']}
            source={{ html: htmlContent, baseUrl: 'https://qr-scan-tech.firebaseapp.com' }}
            onMessage={handleMessage}
            startInLoadingState
            renderLoading={() => (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="small" color="#4d6029" />
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
});

FirebaseRecaptchaModal.displayName = 'FirebaseRecaptchaModal';
