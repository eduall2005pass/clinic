'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, X, Calendar, Video, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  user_id: string;
  user_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface Props {
  role: 'patient' | 'doctor' | 'admin';
  userId?: string;
}

export function NotificationBell({ role, userId }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (userId) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    if (!userId) return;

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', oneDayAgo.toISOString())
      .eq('is_read', true);

    const getLocalDateString = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .gt('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    let allNotifications = data || [];

    if (role === 'doctor') {
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (doctorData) {
        const { data: pendingSchedules } = await supabase
          .from('schedules')
          .select('*')
          .eq('doctor_id', doctorData.id)
          .eq('status', 'pending')
          .gte('date', getLocalDateString())
          .order('date', { ascending: true })
          .limit(5);

        if (pendingSchedules && pendingSchedules.length > 0) {
          const scheduleNotifications: Notification[] = pendingSchedules.map((s: any) => ({
            id: `schedule_${s.id}`,
            user_id: userId,
            user_type: 'shift',
            title: 'নতুন শিফট',
            message: `${s.date} তারিখে শিফট আছে। নিশ্চিত করুন।`,
            is_read: false,
            created_at: s.created_at,
          }));
          allNotifications = [...scheduleNotifications, ...allNotifications];
        }
      }
    }

    setNotifications(allNotifications);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  }

  async function markAllAsRead() {
    if (!userId) return;
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationUrl = (notif: Notification): string => {
    if (role === 'patient') {
      switch (notif.user_type) {
        case 'appointment':
        case 'walkin':
          return '/dashboard/patient/appointments';
        case 'teleconsult':
          return '/dashboard/patient/teleconsult';
        default:
          return '/dashboard/patient';
      }
    } else if (role === 'doctor') {
      switch (notif.user_type) {
        case 'appointment':
        case 'walkin':
          return '/dashboard/doctor/appointments';
        case 'teleconsult':
          return '/dashboard/doctor/teleconsult';
        case 'shift':
          return '/dashboard/doctor/schedule';
        default:
          return '/dashboard/doctor';
      }
    } else {
      switch (notif.user_type) {
        case 'appointment':
        case 'walkin':
          return '/dashboard/admin/appointments';
        case 'shift':
          return '/dashboard/admin/schedule';
        case 'teleconsult':
          return '/dashboard/admin/schedule';
        default:
          return '/dashboard/admin';
      }
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    router.push(getNotificationUrl(notif));
    setShowDropdown(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'teleconsult': return <Video className="w-4 h-4 text-purple-500" />;
      case 'appointment': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'shift': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'walkin': return <Calendar className="w-4 h-4 text-emerald-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'এখন';
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    return date.toLocaleDateString('bn-BD');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '৯+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-[450px] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 text-lg">নোটিফিকেশন</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                সব পড়েছি
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500">
                লোড হচ্ছে...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                কোনো নোটিফিকেশন নেই
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !notif.is_read ? 'bg-purple-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(notif.user_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-slate-600">{notif.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatTime(notif.created_at)}</p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'appointment' | 'teleconsult' | 'shift' | 'walkin' | 'general'
) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      user_type: type,
      title,
      message,
      is_read: false,
    });

  return { error };
}