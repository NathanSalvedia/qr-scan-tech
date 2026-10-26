import * as Location from 'expo-location';
import { Platform } from 'react-native';

/**
 * Radius of Earth in meters
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates geodesic distance between two latitude/longitude points in meters
 * using the Haversine formula.
 */
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    return 0;
  }

  const toRad = (angle: number) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Formats distance into a clean, human-readable string (e.g. "14 m" or "2.4 km").
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export type ProximityStatus = 'ON_SITE' | 'NEARBY' | 'MISMATCH' | 'UNKNOWN';

export interface ProximityEvaluation {
  status: ProximityStatus;
  isVerified: boolean;
  distanceMeters: number | null;
  formattedDistance: string;
  badgeLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  alertTitle: string;
  alertDescription: string;
}

/**
 * Evaluates proximity against anti-cheating thresholds:
 * - 0 - 50m:   ON_SITE (Verified)
 * - 51 - 150m: NEARBY (Acceptable setback / GPS drift tolerance)
 * - > 150m:    MISMATCH (Flagged as scan location mismatch)
 */
export function evaluateProximity(
  distanceMeters: number | null | undefined
): ProximityEvaluation {
  if (distanceMeters === null || distanceMeters === undefined || Number.isNaN(distanceMeters)) {
    return {
      status: 'UNKNOWN',
      isVerified: true,
      distanceMeters: null,
      formattedDistance: 'N/A',
      badgeLabel: 'GPS Location Unavailable',
      badgeBg: 'bg-slate-100',
      badgeBorder: 'border-slate-200',
      badgeText: 'text-slate-600',
      alertTitle: 'GPS Telemetry Pending',
      alertDescription: 'Coordinates could not be acquired during this scan.',
    };
  }

  const formatted = formatDistance(distanceMeters);

  if (distanceMeters <= 50) {
    return {
      status: 'ON_SITE',
      isVerified: true,
      distanceMeters,
      formattedDistance: formatted,
      badgeLabel: `🟢 On-Site Verified (${formatted})`,
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
      badgeText: 'text-emerald-700',
      alertTitle: 'Physical On-Site Verified',
      alertDescription: `Device was within ${formatted} of the registered pole when scanned.`,
    };
  }

  if (distanceMeters <= 150) {
    return {
      status: 'NEARBY',
      isVerified: true,
      distanceMeters,
      formattedDistance: formatted,
      badgeLabel: `🟡 Nearby (${formatted} from pole)`,
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200',
      badgeText: 'text-amber-800',
      alertTitle: 'Near Registered Pole',
      alertDescription: `Device was ${formatted} from the registered pole (within physical tolerance).`,
    };
  }

  return {
    status: 'MISMATCH',
    isVerified: false,
    distanceMeters,
    formattedDistance: formatted,
    badgeLabel: `⚠️ Scan Location Mismatch (${formatted} away)`,
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-300',
    badgeText: 'text-rose-700',
    alertTitle: 'Scan Location Mismatch Detected',
    alertDescription: `Physical audit scanned ${formatted} away from registered pole coordinates. This scan has been flagged in central security logs for review.`,
  };
}

/**
 * Gracefully requests and gets the current device GPS position.
 * Returns { latitude, longitude } or null on timeout/error.
 */
export async function getCurrentLocationAsync(
  timeoutMs = 5000
): Promise<{ latitude: number; longitude: number } | null> {
  // 1. Web navigator.geolocation fallback
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Geolocation timeout')), timeoutMs);
        navigator.geolocation.getCurrentPosition(
          (p) => {
            clearTimeout(timer);
            resolve(p);
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          },
          { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 10000 }
        );
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    } catch {
      // Fall through to expo-location or return null
    }
  }

  // 2. Native / Expo Location
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );

    const result = await Promise.race([locationPromise, timeoutPromise]);
    if (result && 'coords' in result) {
      return {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      };
    }
  } catch (error) {
    console.warn('GPS coordinates fetch error:', error);
  }

  return null;
}
