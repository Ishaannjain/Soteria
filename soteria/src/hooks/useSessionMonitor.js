import { useState, useEffect, useRef } from 'react';
import { 
  updateSessionLocation, 
  triggerEmergency, 
  completeSession 
} from '../services/sessionService';
import { getCurrentLocation } from '../services/locationService';
import { sendEmergencyAlert } from '../services/emailService';
import { getCircle } from '../services/circleService';

/**
 * Client-side session monitoring hook
 * Handles location updates, timer, and emergency escalation
 */
export const useSessionMonitor = (session, userName) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [needsCheckIn, setNeedsCheckIn] = useState(false);
  const locationInterval = useRef(null);
  const timerInterval = useRef(null);
  const checkInTimeout = useRef(null);

  useEffect(() => {
    if (!session || session.status !== 'active') return;

    // Calculate time remaining
    const startTime = session.startTime.toDate();
    const endTime = new Date(startTime.getTime() + session.timerDuration * 60000);
    const remaining = Math.floor((endTime - new Date()) / 1000);
    
    setTimeRemaining(remaining);

    // Start location tracking (every 30 seconds)
    locationInterval.current = setInterval(async () => {
      try {
        const location = await getCurrentLocation();
        await updateSessionLocation(session.id, location);
        console.log('Location updated:', location);
      } catch (error) {
        console.error('Location update failed:', error);
      }
    }, 30000); // 30 seconds

    // Start countdown timer
    timerInterval.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          // Timer expired - request check-in
          setNeedsCheckIn(true);
          startCheckInWindow();
          clearInterval(timerInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (checkInTimeout.current) clearTimeout(checkInTimeout.current);
    };
  }, [session]);

  /**
   * Start 2-minute check-in window
   */
  const startCheckInWindow = () => {
    checkInTimeout.current = setTimeout(async () => {
      // User didn't check in - trigger emergency
      await handleMissedCheckIn();
    }, 120000); // 2 minutes
  };

  /**
   * Handle successful check-in
   */
  const handleCheckIn = async () => {
    try {
      // Clear all intervals and timeouts
      if (checkInTimeout.current) {
        clearTimeout(checkInTimeout.current);
        checkInTimeout.current = null;
      }
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
        locationInterval.current = null;
      }
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }

      await completeSession(session.id);
      setNeedsCheckIn(false);
      setTimeRemaining(null);
      console.log('Check-in successful - session terminated');
    } catch (error) {
      console.error('Check-in failed:', error);
    }
  };

  /**
   * Handle missed check-in (automatic emergency)
   */
  const handleMissedCheckIn = async () => {
    try {
      await triggerEmergency(session.id);
      
      // Get circle members
      const circle = await getCircle(session.circleId);
      const memberEmails = circle.members.map(m => m.email);
      
      // Send alerts
      const location = await getCurrentLocation();
      await sendEmergencyAlert(userName, location, memberEmails);
      
      console.log('Emergency alert sent');
    } catch (error) {
      console.error('Emergency escalation failed:', error);
    }
  };

  /**
   * Manual SOS trigger
   */
  const triggerSOS = async () => {
    try {
      await triggerEmergency(session.id);
      
      const circle = await getCircle(session.circleId);
      const memberEmails = circle.members.map(m => m.email);
      
      const location = await getCurrentLocation();
      await sendEmergencyAlert(userName, location, memberEmails);
      
      console.log('SOS triggered');
    } catch (error) {
      console.error('SOS failed:', error);
    }
  };

  return {
    timeRemaining,
    needsCheckIn,
    handleCheckIn,
    triggerSOS
  };
};