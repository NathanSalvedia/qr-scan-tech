import { Platform } from 'react-native';
import { auth } from './firebase';
import {
  signInWithPhoneNumber,
  ConfirmationResult,
  RecaptchaVerifier,
  ApplicationVerifier,
} from 'firebase/auth';

/**
 * Formats a Philippine phone number to international E.164 (+63...)
 * e.g. "0917 123 4567" -> "+639171234567"
 *      "+639171234567"  -> "+639171234567"
 */
export function formatToE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("09") && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }
  if (digits.startsWith("9") && digits.length === 10) {
    return `+63${digits}`;
  }
  if (digits.startsWith("639") && digits.length === 12) {
    return `+${digits}`;
  }
  if (phone.startsWith("+")) {
    return phone.replace(/\s+/g, "");
  }
  return `+63${digits.startsWith("0") ? digits.slice(1) : digits}`;
}

/**
 * Dispatches an SMS verification code via Firebase Phone Auth
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  customVerifier?: ApplicationVerifier
): Promise<ConfirmationResult> {
  const formattedPhone = formatToE164(phoneNumber);

  // 1. If custom verifier is provided, use it
  if (customVerifier) {
    return await signInWithPhoneNumber(auth, formattedPhone, customVerifier);
  }

  // 2. Web browser environment
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.document) {
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      document.body.appendChild(container);
    }

    const anyWindow = window as any;
    if (anyWindow.recaptchaVerifier) {
      try {
        anyWindow.recaptchaVerifier.clear();
      } catch {}
    }

    anyWindow.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });

    return await signInWithPhoneNumber(auth, formattedPhone, anyWindow.recaptchaVerifier);
  }

  // 3. React Native Mobile Fallback (For test numbers or mock tokens)
  const fallbackVerifier: any = {
    type: 'recaptcha',
    verify: async () => 'native-token',
    _reset: () => {},
    render: async () => '0',
    clear: () => {},
  };

  return await signInWithPhoneNumber(auth, formattedPhone, fallbackVerifier);
}
