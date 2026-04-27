'use client';

import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';

export type NotificationType = 'appointment' | 'teleconsult' | 'shift' | 'walkin' | 'general';
export type NotificationChannel = 'bell' | 'toast' | 'push';

interface NotificationEvent {
  recipient: 'patient' | 'doctor' | 'admin';
  channel: NotificationChannel[];
}

export const notificationEvents: Record<string, NotificationEvent> = {
  'appointment_booked_admin': { recipient: 'admin', channel: ['bell'] },
  'appointment_booked_doctor': { recipient: 'doctor', channel: ['push', 'bell'] },
  'appointment_pending_patient': { recipient: 'patient', channel: ['toast', 'bell'] },
  'appointment_pending_doctor': { recipient: 'doctor', channel: ['push', 'bell'] },
  'appointment_pending_admin': { recipient: 'admin', channel: ['bell'] },
  'appointment_confirmed_patient': { recipient: 'patient', channel: ['toast', 'bell', 'push'] },
  'appointment_confirmed_doctor': { recipient: 'doctor', channel: ['push', 'bell'] },
  'appointment_cancelled_patient': { recipient: 'patient', channel: ['toast', 'bell', 'push'] },
  'appointment_cancelled_doctor': { recipient: 'doctor', channel: ['push', 'bell'] },
  'appointment_cancelled_admin': { recipient: 'admin', channel: ['bell'] },
  'teleconsult_ready_patient': { recipient: 'patient', channel: ['toast', 'push'] },
  'teleconsult_ready_doctor': { recipient: 'doctor', channel: ['push'] },
  'teleconsult_cancelled_patient': { recipient: 'patient', channel: ['toast', 'bell'] },
  'teleconsult_cancelled_doctor': { recipient: 'doctor', channel: ['push', 'bell'] },
  'schedule_added_admin': { recipient: 'admin', channel: ['bell'] },
  'schedule_pending_doctor': { recipient: 'doctor', channel: ['bell', 'push'] },
  'walkin_doctor': { recipient: 'doctor', channel: ['push', 'bell'] },
  'walkin_admin': { recipient: 'admin', channel: ['toast'] },
};

async function getAdminUsers(): Promise<string[]> {
  const { data } = await supabase
    .from('admins')
    .select('id');
  return data?.map(u => u.id) || [];
}

async function getDoctorUserId(doctorId: string): Promise<string | null> {
  const { data } = await supabase
    .from('doctors')
    .select('id')
    .eq('id', doctorId)
    .single();
  return data?.id || null;
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType
) {
  console.log('Creating notification:', { userId, title, message, type });
  
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      user_type: type,
      title,
      message,
      is_read: false,
    })
    .select();

  if (error) {
    console.error('Notification error:', error);
    return { error };
  }
  
  console.log('Notification created:', data);
  return { error: null, data };
}

export function showToast(title: string, message: string, type: 'success' | 'error' | 'info' = 'info') {
  toast.custom(
    <div className="flex items-start gap-3 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 max-w-sm">
      <div className={`p-2 rounded-lg ${
        type === 'success' ? 'bg-emerald-100' : 
        type === 'error' ? 'bg-red-100' : 'bg-primary-100'
      }`}>
        <Bell className={`w-5 h-5 ${
          type === 'success' ? 'text-emerald-600' : 
          type === 'error' ? 'text-red-600' : 'text-primary-600'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{message}</p>
      </div>
    </div>,
    { duration: 5000, position: 'top-right' }
  );
}

export function showPush(title: string, message: string) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  }
}

function getTitle(event: string): string {
  const titles: Record<string, string> = {
    'appointment_booked_admin': 'নতুন অ্যাপয়েন্টমেন্ট',
    'appointment_booked_doctor': 'নতুন অ্যাপয়েন্টমেন্ট',
    'appointment_pending_patient': 'অ্যাপয়েন্টমেন্ট প্রক্রিয়াধীন',
    'appointment_pending_doctor': 'অ্যাপয়েন্টমেন্ট অপেক্ষায়',
    'appointment_pending_admin': 'অ্যাপয়েন্টমেন্ট অপেক্ষায়',
    'appointment_confirmed_patient': 'অ্যাপয়েন্টমেন্ট নিশ্চিত',
    'appointment_confirmed_doctor': 'অ্যাপয়েন্টমেন্ট নিশ্চিত',
    'appointment_cancelled_patient': 'অ্যাপয়েন্টমেন্ট বাতিল',
    'appointment_cancelled_doctor': 'অ্যাপয়েন্টমেন্ট বাতিল',
    'appointment_cancelled_admin': 'অ্যাপয়েন্টমেন্ট বাতিল',
    'teleconsult_ready_patient': 'টেলিকনসাল্ট প্রস্তুত',
    'teleconsult_ready_doctor': 'টেলিকনসাল্ট প্রস্তুত',
    'teleconsult_cancelled_patient': 'টেলিকনসাল্ট বাতিল',
    'teleconsult_cancelled_doctor': 'টেলিকনসাল্ট বাতিল',
    'schedule_added_admin': 'নতুন শিফট',
    'schedule_pending_doctor': 'নতুন শিফট',
    'walkin_doctor': 'ওয়াক-ইন রোগী',
    'walkin_admin': 'ওয়াক-ইন রোগী',
  };
  return titles[event] || 'নোটিফিকেশন';
}

function getMessage(event: string, data: Record<string, string | undefined>): string {
  const messages: Record<string, string> = {
    'appointment_booked_admin': `${data.patientName} রোগী ${data.doctorName} ডাক্তারের সাথে অ্যাপয়েন্টমেন্ট বুক করেছেন।`,
    'appointment_booked_doctor': `${data.patientName} রোগী আপনার সাথে ${data.date} তারিখে অ্যাপয়েন্টমেন্ট নিয়েছেন।`,
    'appointment_pending_patient': `আপনার অ্যাপয়েন্টমেন্ট ${data.date} তারিখে ${data.time} সময়ে প্রক্রিয়াধীন আছে।`,
    'appointment_pending_doctor': `${data.patientName} রোগী ${data.date} তারিখে আপনার সাথে অ্যাপয়েন্টমেন্ট নিয়েছেন। অপেক্ষায়।`,
    'appointment_pending_admin': `${data.patientName} রোগী ${data.doctorName} ডাক্তারের সাথে ${data.date} তারিখে অ্যাপয়েন্টমেন্ট নিয়েছেন।`,
    'appointment_confirmed_patient': `আপনার অ্যাপয়েন্টমেন্ট ${data.doctorName} ডাক্তারের সাথে ${data.date} তারিখে নিশ্চিত হয়েছে।`,
    'appointment_confirmed_doctor': `${data.patientName} রোগীর অ্যাপয়েন্টমেন্ট ${data.date} তারিখে নিশ্চিত হয়েছে।`,
    'appointment_cancelled_patient': `আপনার অ্যাপয়েন্টমেন্ট ${data.doctorName} ডাক্তারের সাথে বাতিল হয়েছে।`,
    'appointment_cancelled_doctor': `${data.patientName} রোগীর অ্যাপয়েন্টমেন্ট বাতিল হয়েছে।`,
    'appointment_cancelled_admin': `${data.patientName} রোগী ${data.doctorName} ডাক্তারের অ্যাপয়েন্টমেন্ট বাতিল হয়েছে।`,
    'teleconsult_ready_patient': `আপনার টেলিকনসাল্ট ${data.doctorName} ডাক্তারের সাথে প্রস্তুত। এখনই কলে যোগ দিন।`,
    'teleconsult_ready_doctor': `${data.patientName} রোগী অপেক্ষায় আছে। কল শুরু করুন।`,
    'teleconsult_cancelled_patient': `আপনার টেলিকনসাল্ট ${data.doctorName} ডাক্তারের সাথে বাতিল হয়েছে।`,
    'teleconsult_cancelled_doctor': `${data.patientName} রোগীর টেলিকনসাল্ট বাতিল হয়েছে।`,
    'schedule_added_admin': `${data.doctorName} ডাক্তারের ${data.date} তারিখে শিফট নিশ্চিত হয়েছে।`,
    'schedule_pending_doctor': `${data.date} তারিখে ${data.startTime} - ${data.endTime} শিফট যোগ হয়েছে।`,
    'walkin_doctor': `${data.patientName} রোগী ওয়াক-ইন হিসেবে এসেছেন।`,
    'walkin_admin': `${data.patientName} রোগী ওয়াক-ইন হিসেবে যোগ হয়েছেন।`,
  };
  return messages[event] || '';
}

function getType(event: string): NotificationType {
  if (event.includes('teleconsult')) return 'teleconsult';
  if (event.includes('schedule') || event.includes('shift')) return 'shift';
  if (event.includes('walkin')) return 'walkin';
  return 'appointment';
}

export async function sendNotification(
  event: string,
  recipients: { 
    patientId?: string; 
    doctorId?: string; 
    adminIds?: string[];
  },
  data: Record<string, string | undefined>
) {
  const eventConfig = notificationEvents[event];
  if (!eventConfig) {
    console.error('Unknown notification event:', event);
    return;
  }

  const { recipient, channel } = eventConfig;
  const title = getTitle(event);
  const message = getMessage(event, data);
  const type = getType(event);
  
  console.log('Sending notification:', { event, recipient, channel, title, message });

  switch (recipient) {
    case 'patient':
      if (recipients.patientId && channel.includes('bell')) {
        await createNotification(recipients.patientId, title, message, type);
      }
      if (channel.includes('toast')) {
        showToast(title, message, 'info');
      }
      if (channel.includes('push')) {
        showPush(title, message);
      }
      break;
      
    case 'doctor':
      if (recipients.doctorId) {
        const doctorUserId = await getDoctorUserId(recipients.doctorId);
        if (doctorUserId && channel.includes('bell')) {
          await createNotification(doctorUserId, title, message, type);
        }
      }
      if (channel.includes('toast')) {
        showToast(title, message, 'info');
      }
      if (channel.includes('push')) {
        showPush(title, message);
      }
      break;
      
    case 'admin':
      const adminIds = (recipients.adminIds && recipients.adminIds.length > 0)
        ? recipients.adminIds
        : await getAdminUsers();
      for (const adminId of adminIds) {
        if (channel.includes('bell')) {
          await createNotification(adminId, title, message, type);
        }
        if (channel.includes('toast')) {
          showToast(title, message, 'info');
        }
      }
      break;
  }
}

export async function requestPushPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}
