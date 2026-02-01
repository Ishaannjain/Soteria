import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Start a new SafeWalk session
 * @param {object} sessionData - {userId, circleId, timerDuration, destination}
 * @returns {Promise<string>} Session ID
 */
export const startSafeWalkSession = async (sessionData) => {
  try {
    const sessionRef = await addDoc(collection(db, 'safewalk-sessions'), {
      userId: sessionData.userId,
      circleId: sessionData.circleId,
      status: 'active',
      startTime: new Date(),
      endTime: null,
      timerDuration: sessionData.timerDuration, // in minutes
      destination: sessionData.destination || null,
      lastLocation: null,
      checkInStatus: 'pending',
      createdAt: new Date()
    });

    console.log("SafeWalk session started:", sessionRef.id);
    return sessionRef.id;
  } catch (error) {
    console.error("Error starting session:", error);
    throw error;
  }
};

/**
 * Update location during active session
 * @param {string} sessionId - Session ID
 * @param {object} location - {lat, lng, timestamp}
 */
export const updateSessionLocation = async (sessionId, location) => {
  try {
    const sessionRef = doc(db, 'safewalk-sessions', sessionId);
    await updateDoc(sessionRef, {
      lastLocation: {
        lat: location.lat,
        lng: location.lng,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error("Error updating location:", error);
    throw error;
  }
};

/**
 * Mark session as completed (user checked in successfully)
 * @param {string} sessionId - Session ID
 */
export const completeSession = async (sessionId) => {
  try {
    const sessionRef = doc(db, 'safewalk-sessions', sessionId);
    await updateDoc(sessionRef, {
      status: 'completed',
      endTime: new Date(),
      checkInStatus: 'acknowledged'
    });
    console.log("Session completed successfully");
  } catch (error) {
    console.error("Error completing session:", error);
    throw error;
  }
};

/**
 * Trigger emergency alert
 * @param {string} sessionId - Session ID
 */
export const triggerEmergency = async (sessionId) => {
  try {
    const sessionRef = doc(db, 'safewalk-sessions', sessionId);
    await updateDoc(sessionRef, {
      status: 'emergency',
      checkInStatus: 'missed',
      endTime: new Date()
    });
    console.log("Emergency triggered");
  } catch (error) {
    console.error("Error triggering emergency:", error);
    throw error;
  }
};

/**
 * Get active session for a user
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Active session or null
 */
export const getActiveSession = async (userId) => {
  try {
    const q = query(
      collection(db, 'safewalk-sessions'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('startTime', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const sessionDoc = querySnapshot.docs[0];
      return { id: sessionDoc.id, ...sessionDoc.data() };
    }

    return null;
  } catch (error) {
    console.error("Error fetching active session:", error);
    throw error;
  }
};

/**
 * Get session history for a user
 * @param {string} userId - User ID
 * @returns {Promise<array>} Array of past sessions
 */
export const getSessionHistory = async (userId) => {
  try {
    const q = query(
      collection(db, 'safewalk-sessions'),
      where('userId', '==', userId),
      orderBy('startTime', 'desc'),
      limit(20)
    );

    const querySnapshot = await getDocs(q);
    const sessions = [];

    querySnapshot.forEach(doc => {
      sessions.push({ id: doc.id, ...doc.data() });
    });

    return sessions;
  } catch (error) {
    console.error("Error fetching session history:", error);
    throw error;
  }
};

/**
 * Listen in real-time for active sessions in given circles, excluding currentUserId's own sessions.
 * @param {string[]} circleIds - Circle IDs to watch
 * @param {string} currentUserId - Current user's UID (to exclude own sessions)
 * @param {function} callback - Called with array of active session objects whenever data changes
 * @returns {function} Unsubscribe function
 */
export const listenToCircleActiveSessions = (circleIds, currentUserId, callback) => {
  if (!circleIds || circleIds.length === 0) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'safewalk-sessions'),
    where('circleId', 'in', circleIds.slice(0, 10)),
    where('status', '==', 'active')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const sessions = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.userId !== currentUserId) {
        sessions.push({ id: doc.id, ...data });
      }
    });
    callback(sessions);
  }, (error) => {
    console.error('Error listening to circle sessions:', error);
  });

  return unsubscribe;
};
