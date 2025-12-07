// Socket.io Client Hook for React/Next.js
// File: dashboard/src/lib/useSocket.js

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export const useSocket = (userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userId) return;

    // Initialize socket connection
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      withCredentials: true
    });

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      
      // Join user's personal room
      socket.emit('join', userId);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // Listen for notifications
    socket.on('notification', (notification) => {
      console.log('New notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png'
        });
      }
    });

    // Listen for notification read events
    socket.on('notification-read', ({ notificationId }) => {
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId]);

  return {
    isConnected,
    notifications,
    socket
  };
};

// Example usage in a component:
/*
import { useSocket } from '@/lib/useSocket';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function Dashboard() {
  const { user } = useCurrentUser();
  const { isConnected, notifications } = useSocket(user?._id);

  return (
    <div>
      <p>Socket Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Unread Notifications: {notifications.filter(n => !n.isRead).length}</p>
    </div>
  );
}
*/
