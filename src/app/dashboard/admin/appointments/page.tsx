'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Search, Filter, Check, X, Calendar, Clock, Video, MoreVertical, ChevronLeft, ChevronRight, CheckCircle, Plus, Zap } from 'lucide-react';
import { supabase, generateSerialNumber } from '@/lib/supabase';
import { setCache, getCache } from '@/lib/cache';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { sendNotification, requestPushPermission } from '@/lib/notifications';
import DatePicker from '@/components/ui/DatePicker';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
};

const statusConfig = {
  pending: { value: 'pending', label: 'অপেক্ষায়' },
  confirmed: { value: 'confirmed', label: 'নিশ্চিত' },
  upcoming: { value: 'upcoming', label: 'আসন্ন' },
  completed: { value: 'completed', label: 'সম্পন্ন' },
  cancelled: { value: 'cancelled', label: 'বাতিল' },
};

const getLocalDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterDate, setFilterDate] = useState(getLocalDateString());
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinPatient, setWalkinPatient] = useState({
    name: '',
    phone: '',
    age: '',
    doctor_id: '',
    type: 'in-person' as 'in-person' | 'teleconsult',
    date: getLocalDateString(),
    time: '',
    reason: '',
  });
  const [creatingWalkin, setCreatingWalkin] = useState(false);
  const [specialTimePower, setSpecialTimePower] = useState(false);
  const [customTime, setCustomTime] = useState('');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    loadData();

    if (localStorage.getItem('openAppointmentModal') === 'true') {
      localStorage.removeItem('openAppointmentModal');
      setTimeout(() => setShowWalkinModal(true), 500);
    }
  }, []);

  useEffect(() => {
    if (walkinPatient.doctor_id && walkinPatient.date) {
      loadDoctorSchedules();
    }
  }, [walkinPatient.doctor_id, walkinPatient.date, specialTimePower, customTime]);

  async function loadDoctorSchedules() {
    if (specialTimePower) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hours}:${minutes}`;
      setAvailableSlots([currentTime]);
      setSchedules([{ id: 'custom', start_time: currentTime, end_time: currentTime }]);
      return;
    }

    const targetDate = new Date(walkinPatient.date);
    const weekEnd = new Date(targetDate);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { data } = await supabase
      .from('schedules')
      .select('*')
      .eq('doctor_id', walkinPatient.doctor_id)
      .gte('date', walkinPatient.date)
      .lt('date', weekEnd.toISOString().split('T')[0])
      .in('status', ['active', 'confirmed'])
      .order('date', { ascending: true })
      .order('start_time');

    if (data && data.length > 0) {
      setSchedules(data);
      const ranges: string[] = [];
      data.forEach((schedule: any) => {
        ranges.push(`${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)}`);
      });
      setAvailableSlots(ranges);
    } else {
      setSchedules([]);
      setAvailableSlots([]);
    }
  }

  async function loadData(useCache = true) {
    const today = getLocalDateString();

    // Try cache first
    if (useCache) {
      const cached = getCache<any[]>('admin_appointments');
      if (cached) {
        setAppointments(cached);
      }
      const cachedDocs = getCache<any[]>('admin_doctors');
      if (cachedDocs) {
        setDoctors(cachedDocs);
      }
    }

    // Fetch fresh data
    const { data: apts, error: aptError } = await supabase
      .from('appointments')
      .select('*, doctors(name, specialization), patients(name)')
      .order('date', { ascending: false })
      .limit(100);

    if (aptError) {
      console.error('Error fetching appointments:', aptError);
      toast.error('অ্যাপয়েন্টমেন্ট লোড করতে সমস্যা হয়েছে');
    }

    if (apts) {
      const mapped = apts.map((apt: any) => {
        const schedule = apt.schedules?.[0];
        return {
          ...apt,
          doctorName: apt.doctors?.name || '-',
          specialization: apt.doctors?.specialization || '-',
          patientName: apt.patients?.name || '-',
          start_time: schedule?.start_time || null,
          end_time: schedule?.end_time || null,
          displayStatus: apt.status === 'pending' ? 'pending' :
            apt.status === 'confirmed' ? 'confirmed' :
              apt.status === 'cancelled' ? 'cancelled' :
                apt.status === 'completed' ? 'completed' :
                  getStatusFromDate(apt.date),
        };
      });

      const statusOrder: Record<string, number> = {
        pending: 1,
        confirmed: 2,
        completed: 3,
        upcoming: 2,
        cancelled: 4,
      };

      const sorted = mapped.sort((a, b) => {
        const aStatus = a.displayStatus;
        const bStatus = b.displayStatus;
        return (statusOrder[aStatus] || 99) - (statusOrder[bStatus] || 99);
      });

      setAppointments(sorted);
      setCache('admin_appointments', sorted);
    }

    const { data: docs } = await supabase.from('doctors').select('*').eq('is_available', true).order('name');
    if (docs) {
      setDoctors(docs);
      setCache('admin_doctors', docs);
    }

    setLoading(false);
  }

  const getStatusFromDate = (dateStr: string) => {
    const appointmentDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) return 'completed';
    return 'upcoming';
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filterDate && apt.date !== filterDate) return false;
    if (filterDoctor && apt.doctor_id !== filterDoctor) return false;
    if (filterStatus && apt.status !== filterStatus && apt.displayStatus !== filterStatus) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      const patientMatch = apt.patientName?.toLowerCase().includes(searchLower);
      const doctorMatch = apt.doctorName?.toLowerCase().includes(searchLower);
      if (!patientMatch && !doctorMatch) return false;
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => timeStr ? timeStr.substring(0, 5) : '';

  const handleApprove = async (apt: any, currentStatus: string) => {
    let newStatus: string;

    if (currentStatus === 'pending') {
      newStatus = 'confirmed';
    } else if (currentStatus === 'confirmed') {
      newStatus = 'pending';
    } else if (currentStatus === 'cancelled') {
      newStatus = 'confirmed';
    } else {
      newStatus = 'confirmed';
    }

    if (!apt || !apt.id) {
      console.error('No appointment data:', apt);
      toast.error('অ্যাপয়েন্টমেন্ট খুঁজে পাওয়া যায়নি');
      return;
    }

    let updateData: any = { status: newStatus };

    if ((newStatus === 'confirmed' || newStatus === 'completed') && !apt.serial_number) {
      const serialNumber = await generateSerialNumber(
        apt.doctor_id,
        apt.date,
        apt.type === 'teleconsult' ? 'teleconsult' : 'appointment'
      );
      updateData.serial_number = serialNumber;
    }

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', apt.id);

    if (error) {
      console.error('Status update error:', error);
      toast.error('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে');
    } else {
      requestPushPermission();

      if (newStatus === 'confirmed') {
        await sendNotification('appointment_confirmed_patient', {
          patientId: apt.patient_id,
        }, {
          patientName: apt.patients?.name,
          doctorName: apt.doctors?.name,
          date: apt.date,
        });

        await sendNotification('appointment_confirmed_doctor', {
          doctorId: apt.doctor_id,
        }, {
          patientName: apt.patients?.name,
          date: apt.date,
        });

        if (apt.type === 'teleconsult') {
          await sendNotification('teleconsult_ready_patient', {
            patientId: apt.patient_id,
          }, {
            doctorName: apt.doctors?.name,
          });

          await sendNotification('teleconsult_ready_doctor', {
            doctorId: apt.doctor_id,
          }, {
            patientName: apt.patients?.name,
          });
        }
      }

      toast.success(newStatus === 'confirmed' ? 'নিশ্চিত হয়েছে' : 'অপেক্ষায় সেট করা হয়েছে');
      loadData();
    }
  };

  const handleReject = async (apt: any) => {
    if (!apt || !apt.id) {
      toast.error('অ্যাপয়েন্টমেন্ট খুঁজে পাওয়া যায়নি');
      return;
    }

    if (!confirm('এই অ্যাপয়েন্টমেন্ট বাতিল করতে চান?')) return;

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', apt.id);

    if (!error) {
      requestPushPermission();

      if (apt.type === 'teleconsult') {
        await sendNotification('teleconsult_cancelled_patient', {
          patientId: apt.patient_id,
        }, {
          doctorName: apt.doctors?.name,
        });

        await sendNotification('teleconsult_cancelled_doctor', {
          doctorId: apt.doctor_id,
        }, {
          patientName: apt.patients?.name,
        });
      } else {
        await sendNotification('appointment_cancelled_patient', {
          patientId: apt.patient_id,
        }, {
          patientName: apt.patients?.name,
          doctorName: apt.doctors?.name,
        });

        await sendNotification('appointment_cancelled_doctor', {
          doctorId: apt.doctor_id,
        }, {
          patientName: apt.patients?.name,
        });
      }

      toast.success('অ্যাপয়েন্টমেন্ট বাতিল হয়েছে');
      loadData();
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('এই অ্যাপয়েন্টমেন্ট বাতিল করতে চান?')) return;

    const { data: apt } = await supabase
      .from('appointments')
      .select('*, patients(name), doctors(name)')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (!error && apt) {
      requestPushPermission();

      if (apt.type === 'teleconsult') {
        await sendNotification('teleconsult_cancelled_patient', {
          patientId: apt.patient_id,
        }, {
          doctorName: apt.doctors?.name,
        });

        await sendNotification('teleconsult_cancelled_doctor', {
          doctorId: apt.doctor_id,
        }, {
          patientName: apt.patients?.name,
        });
      } else {
        await sendNotification('appointment_cancelled_patient', {
          patientId: apt.patient_id,
        }, {
          patientName: apt.patients?.name,
          doctorName: apt.doctors?.name,
        });

        await sendNotification('appointment_cancelled_doctor', {
          doctorId: apt.doctor_id,
        }, {
          patientName: apt.patients?.name,
        });
      }

      await sendNotification('appointment_cancelled_admin', {
        adminIds: [],
      }, {
        patientName: apt.patients?.name,
        doctorName: apt.doctors?.name,
      });

      toast.success('অ্যাপয়েন্টমেন্ট বাতিল হয়েছে');
      loadData();
    }
  };

  const handleComplete = async (apt: any) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', apt.id);

    if (!error) {
      await supabase
        .from('patients')
        .update({ status: 'completed' })
        .eq('id', apt.patient_id);

      toast.success('অ্যাপয়েন্টমেন্ট সম্পন্ন হয়েছে');
      loadData();
    }
  };

  const handleAddWalkin = async () => {
    if (!walkinPatient.name || !walkinPatient.doctor_id) {
      toast.error('রোগীর নাম ও ডাক্তার নির্বাচন করুন');
      return;
    }

    setCreatingWalkin(true);

    try {
      // First, create a minimal patient record to satisfy the foreign key constraint
      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          name: walkinPatient.name,
          phone: walkinPatient.phone || '',
          email: `walkin_${Date.now()}@clinicconnect.local`,
          password: 'walkin_temp',
        })
        .select('id')
        .single();

      if (patientError || !newPatient) {
        console.error('Patient Insert Error:', patientError);
        toast.error(`রোগী তৈরি করতে ব্যর্থ: ${patientError?.message || 'Unknown error'}`);
        setCreatingWalkin(false);
        return;
      }

      const getCurrentTime = () => {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };
    
    const appointmentTime = specialTimePower
      ? getCurrentTime()
      : (walkinPatient.time ? walkinPatient.time.split(' - ')[0] : '09:00');

      const type = walkinPatient.type === 'teleconsult' ? 'teleconsult' : 'appointment';
      console.log('Creating appointment with:', { doctorId: walkinPatient.doctor_id, date: walkinPatient.date, type });

      const serialNumber = await generateSerialNumber(walkinPatient.doctor_id, walkinPatient.date, type);
      console.log('Generated serial:', serialNumber);

      const { error: aptError } = await supabase
        .from('appointments')
        .insert({
          patient_id: newPatient.id,
          doctor_id: walkinPatient.doctor_id,
          date: walkinPatient.date,
          time: appointmentTime,
          status: 'confirmed',
          type: walkinPatient.type,
          reason: walkinPatient.reason || 'ওয়াক-ইন',
          serial_number: serialNumber,
        });

      console.log('Appointment insert result:', { error: aptError });

      if (aptError) {
        console.error('Appointment Insert Error:', aptError);
        toast.error(`অ্যাপয়েন্টমেন্ট তৈরি করতে ব্যর্থ: ${aptError?.message || 'Unknown error'}`);
        setCreatingWalkin(false);
        return;
      }

      requestPushPermission();
      await sendNotification('walkin_doctor', {
        doctorId: walkinPatient.doctor_id,
      }, {
        patientName: walkinPatient.name,
      });

      toast.success('অ্যাপয়েন্টমেন্ট যোগ হয়েছে');
      setShowWalkinModal(false);
      setWalkinPatient({ name: '', phone: '', age: '', doctor_id: '', type: 'in-person', date: getLocalDateString(), time: '', reason: '' });
      setSpecialTimePower(false);
      setCustomTime('');
      loadData();
    } catch (err) {
      toast.error('কিছু সমস্যা হয়েছে');
    } finally {
      setCreatingWalkin(false);
    }
  };

  const getStatusBadge = (status: string, displayStatus: string) => {
    if (displayStatus === 'upcoming' || displayStatus === 'pending') {
      if (status === 'pending') {
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">অপেক্ষায়</span>;
      } else if (status === 'confirmed') {
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">নিশ্চিত</span>;
      }
    }
    return <StatusPill status={displayStatus as any} />;
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 page-enter"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">অ্যাপয়েন্টমেন্ট</h1>
            <p className="text-slate-500 mt-1">সকল অ্যাপয়েন্টমেন্ট দেখুন ও পরিচালনা করুন</p>
          </div>
          <Button onClick={() => setShowWalkinModal(true)}>
            <Plus className="w-5 h-5" /> নতুন অ্যাপয়েন্টমেন্ট
          </Button>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-lg shadow-slate-200/20">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[160px]">
              <label className="text-sm font-medium text-slate-600 mb-2 block">তারিখ</label>
              <DatePicker
                value={filterDate}
                onChange={setFilterDate}
                className="!w-full"
              />
            </div>

            <div className="min-w-[160px]">
              <label className="text-sm font-medium text-slate-600 mb-2 block">ডাক্তার</label>
              <select
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
                className="input"
              >
                <option value="">সব ডাক্তার</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="min-w-[160px]">
              <label className="text-sm font-medium text-slate-600 mb-2 block">স্ট্যাটাস</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input"
              >
                <option value="">সব স্ট্যাটাস</option>
                <option value="pending">অপেক্ষায়</option>
                <option value="confirmed">নিশ্চিত</option>
                <option value="completed">সম্পন্ন</option>
                <option value="cancelled">বাতিল</option>
              </select>
            </div>

            <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
              <label className="text-sm font-medium text-slate-600 mb-2 block">খুঁজুন</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="রোগী/ডাক্তার..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  {/* <th className="px-4 py-3 text-left font-semibold text-slate-600">No.</th> */}
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 ">সিরিয়াল</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">রোগী</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">মোবাইল নম্বর</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">ডাক্তার</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">তারিখ ও সময়</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">ধরন</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">স্ট্যাটাস</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">সম্পন্ন</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Calendar className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="text-slate-500">নির্বাচিত তারিখে কোনো অ্যাপয়েন্টমেন্ট নেই</p>
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((apt, index) => (
                    <motion.tr
                      key={apt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-slate-400 font-mono text-xs mr-2">
                          {index + 1}
                        </span>
                        <span className="text-slate-600 font-mono">{(apt.status === 'confirmed' || apt.status === 'completed') && apt.serial_number ? apt.serial_number : '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{apt.patientName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-500">{apt.patient_mobile || apt.patients?.phone || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-slate-900">{apt.doctorName}</span>
                          <p className="text-xs text-slate-500">{apt.specialization}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(apt.date)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs ${apt.type === 'teleconsult' ? 'text-purple-600' : 'text-slate-600'}`}>
                          {apt.type === 'teleconsult' && <Video className="w-3 h-3" />}
                          {apt.type === 'teleconsult' ? 'ভিডিও' : 'সরাসরি'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(apt.status, apt.displayStatus)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {apt.status !== 'completed' && apt.status !== 'cancelled' ? (
                          <button
                            onClick={() => handleComplete(apt)}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="সম্পন্ন করুন"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        ) : (
                          <div className="flex justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-400 opacity-50" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {apt.status !== 'completed' && (
                            <>
                              {apt.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(apt, apt.status)}
                                    className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="নিশ্চিত করুন"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(apt)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="বাতিল করুন"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {apt.status === 'confirmed' && (
                                <button
                                  onClick={() => handleApprove(apt, apt.status)}
                                  className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="অপেক্ষায় করুন"
                                >
                                  <Clock className="w-4 h-4" />
                                </button>
                              )}
                              {apt.status === 'cancelled' && (
                                <button
                                  onClick={() => handleApprove(apt, apt.status)}
                                  className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="পুনরুদ্ধার করুন"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* WALK-IN MODAL */}
      <Modal
        isOpen={showWalkinModal}
        onClose={() => setShowWalkinModal(false)}
        title="নতুন অ্যাপয়েন্টমেন্ট"
      >
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-600 mb-2 block">রোগীর নাম *</label>
            <input
              type="text"
              value={walkinPatient.name}
              onChange={(e) => setWalkinPatient({ ...walkinPatient, name: e.target.value })}
              className="input w-full"
              placeholder="রোগীর নাম লিখুন"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">ফোন নম্বর</label>
              <input
                type="tel"
                value={walkinPatient.phone}
                onChange={(e) => setWalkinPatient({ ...walkinPatient, phone: e.target.value })}
                className="input w-full"
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 mb-2 block">ডাক্তার নির্বাচন *</label>
            <select
              value={walkinPatient.doctor_id}
              onChange={(e) => setWalkinPatient({ ...walkinPatient, doctor_id: e.target.value })}
              className="input w-full"
            >
              <option value="">ডাক্তার নির্বাচন করুন</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} - {d.specialization || 'General'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 mb-2 block">ধরন</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWalkinPatient({ ...walkinPatient, type: 'in-person' })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${walkinPatient.type === 'in-person'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                সরাসরি
              </button>
              <button
                type="button"
                onClick={() => setWalkinPatient({ ...walkinPatient, type: 'teleconsult' })}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${walkinPatient.type === 'teleconsult'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                ভিডিও কল
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">তারিখ</label>
              <input
                type="date"
                value={walkinPatient.date}
                onChange={(e) => setWalkinPatient({ ...walkinPatient, date: e.target.value, time: '' })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">সময় *</label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setSpecialTimePower(!specialTimePower)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${specialTimePower
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                >
                  <Zap className="w-4 h-4" />
                  বিশেষ ক্ষমতা ~ সময়
                </button>
              </div>
              {specialTimePower && (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg mb-2">
                  বর্তমান সময় ব্যবহার করা হবে
                </div>
              )}
              {availableSlots.length > 0 ? (
                <select
                  value={walkinPatient.time}
                  onChange={(e) => setWalkinPatient({ ...walkinPatient, time: e.target.value })}
                  className="input w-full"
                  disabled={specialTimePower}
                >
                  <option value="">সময় নির্বাচন করুন</option>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                  এই তারিখে ডাক্তারের কোনো শিফট নেই
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 mb-2 block">সমস্যা</label>
            <textarea
              value={walkinPatient.reason}
              onChange={(e) => setWalkinPatient({ ...walkinPatient, reason: e.target.value })}
              className="input w-full h-24 resize-none"
              placeholder="রোগীর সমস্যা লিখুন"
            />
          </div>

          <Button
            onClick={handleAddWalkin}
            className="w-full"
            disabled={creatingWalkin}
          >
            {creatingWalkin ? 'যোগ হচ্ছে...' : 'অ্যাপয়েন্টমেন্ট যোগ করুন'}
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}