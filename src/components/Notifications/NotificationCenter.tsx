import { Bell, X, Check, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../../services/mysql-api';
import { useAuthContext } from '../../contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data: any;
  read: boolean;
  sent_sms: boolean;
  sent_email: boolean;
  created_at: string;
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const data = await notificationsAPI.getAll();

      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    // Polling pour les nouvelles notifications (remplace les subscriptions temps rÃ©el)
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // VÃ©rifier toutes les 30 secondes

    return () => clearInterval(interval);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsAPI.markAsRead(notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur marquage lecture:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await notificationsAPI.markAllAsRead();

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur marquage toutes lues:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Info className="w-5 h-5 text-orange-600" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-orange-50 border-orange-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-orange-50 border-orange-200';
    }
  };

  // Demander la permission pour les notifications natives
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="relative">
      {/* Notification Bell - Light Theme */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 transition-all duration-300 group hover:shadow-md hover:shadow-rose-100"
      >
        <Bell className="w-5 h-5 text-rose-500 group-hover:text-rose-600 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg shadow-rose-200 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

{/* Notification Panel - Premium Design */}
      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
            onClick={() => setShowPanel(false)}
          />
          <div className="absolute right-0 top-14 w-[400px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 z-50 max-h-[500px] overflow-hidden animate-in slide-in-from-top-2 duration-200">
            {/* Header with Gradient */}
            <div className="relative bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 py-4 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-white rounded-full blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white rounded-full blur-2xl" />
              </div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Notifications</h3>
                    <p className="text-xs text-white/70">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs font-medium text-white/90 hover:text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Tout marquer lu
                    </button>
                  )}
                  <button
                    onClick={() => setShowPanel(false)}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[380px]">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-3">Chargement...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Aucune notification</p>
                  <p className="text-sm text-gray-400 mt-1">Vous êtes à jour !</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-all duration-200 ${
                        !notification.read ? 'bg-gradient-to-r from-indigo-50/50 to-violet-50/50 border-l-4 border-l-indigo-500' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                          notification.type === 'success' ? 'bg-gradient-to-br from-emerald-100 to-green-100' :
                          notification.type === 'warning' ? 'bg-gradient-to-br from-amber-100 to-orange-100' :
                          notification.type === 'error' ? 'bg-gradient-to-br from-rose-100 to-red-100' :
                          'bg-gradient-to-br from-orange-100 to-indigo-100'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-bold ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg transition-all"
                                title="Marquer comme lu"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-400 font-medium">
                              {new Date(notification.created_at).toLocaleString('fr-FR')}
                            </p>
                            <div className="flex items-center space-x-1.5">
                              {notification.sent_sms && (
                                <span className="text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2 py-0.5 rounded-full">
                                  SMS
                                </span>
                              )}
                              {notification.sent_email && (
                                <span className="text-[10px] font-bold bg-gradient-to-r from-orange-500 to-indigo-500 text-white px-2 py-0.5 rounded-full">
                                  Email
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
