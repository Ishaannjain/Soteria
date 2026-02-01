import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { listenToUserCircles } from '../services/circleService';
import { listenToCircleActiveSessions } from '../services/sessionService';

const NotificationContext = createContext({ activeCircleIds: new Set() });

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [activeWalks, setActiveWalks] = useState([]);

  useEffect(() => {
    if (!user) {
      setActiveWalks([]);
      return;
    }

    let sessionUnsub = () => {};
    let prevCircleIdSet = new Set();

    const circleUnsub = listenToUserCircles(user.uid, (circles) => {
      const newCircleIdSet = new Set(circles.map(c => c.id));
      const idsChanged = newCircleIdSet.size !== prevCircleIdSet.size ||
        [...newCircleIdSet].some(id => !prevCircleIdSet.has(id));
      if (!idsChanged) return;
      prevCircleIdSet = newCircleIdSet;

      sessionUnsub();

      const circleIds = circles.map(c => c.id);
      if (circleIds.length === 0) {
        setActiveWalks([]);
        return;
      }

      sessionUnsub = listenToCircleActiveSessions(circleIds, null, (sessions) => {
        setActiveWalks(sessions);
      });
    });

    return () => {
      circleUnsub();
      sessionUnsub();
    };
  }, [user]);

  const activeCircleIds = new Set(activeWalks.map(s => s.circleId));

  return (
    <NotificationContext.Provider value={{ activeCircleIds }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
