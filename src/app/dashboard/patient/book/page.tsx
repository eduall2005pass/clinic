'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Calendar, Clock, Video, ArrowLeft, ArrowRight, Check, Stethoscope, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, getDoctors } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { sendNotification, requestPushPermission } from '@/lib/notifications';

const fallbackDoctors = [
  { id: 1, name: 'ড. রাহিম আহমেদ', degree: 'MBBS, FCPS', specialty: 'মেডিসিন', consultation_fee: 500, available_days: ['রবিবার', 'সোমবার', 'বুধবার'] },
  { id: 2, name: 'ড. ফারিহা সুলতানা', degree: 'MBBS, MS', specialty: 'গাইনি', consultation_fee: 600, available_days: ['সোমবার', 'মঙ্গলবার', 'বৃহস্পতিবার'] },
  { id: 3, name: 'ড. মো. করিম', degree: 'MBBS, DO', specialty: 'চক্ষু', consultation_fee: 450, available_days: ['মঙ্গলবার', 'বৃহস্পতিবার', 'শুক্রবার'] },
  { id: 4, name: 'ড. সালমা খাতুন', degree: 'MBBS, MPH', specialty: 'শিশু রোগ', consultation_fee: 400, available_days: ['রবিবার', 'বুধবার', 'শুক্রবার'] },
];

const stepLabels = ['ডাক্তার', 'ধরন', 'তারিখ ও সময়', 'নিশ্চিত'];

export default function PatientBook() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [consultType, setConsultType] = useState<'in-person' | 'teleconsult'>('in-person');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      loadDoctorSchedules();
    }
  }, [selectedDoctor, selectedDate]);

  async function loadDoctors() {
    if (typeof window === 'undefined') return;
    
    const dbDoctors = await getDoctors();
    
    if (dbDoctors && dbDoctors.length > 0) {
      const mapped = dbDoctors.map(d => ({
        id: d.id,
        name: d.name,
        specialty: d.specialization || d.specialty || '',
        degree: d.degree || '',
        fee: d.consultation_fee || 500,
        available_days: d.available_days || [],
        zoom_link: d.zoom_link || null,
      }));
      setDoctors(mapped);
    } else {
      const saved = localStorage.getItem('doctors');
      if (saved) {
        setDoctors(JSON.parse(saved));
      } else {
        setDoctors(fallbackDoctors);
        localStorage.setItem('doctors', JSON.stringify(fallbackDoctors));
      }
    }
  }

  async function loadDoctorSchedules() {
    if (!selectedDoctor || !selectedDate) return;

    const { data: scheduleData } = await supabase
      .from('schedules')
      .select('*')
      .eq('doctor_id', selectedDoctor.id)
      .eq('date', selectedDate)
      .in('status', ['active', 'confirmed']);

    console.log('Schedule query:', { doctorId: selectedDoctor.id, date: selectedDate, data: scheduleData });

    if (scheduleData && scheduleData.length > 0) {
      setSchedules(scheduleData);
      
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      
      const filteredSlots = scheduleData.filter((s: any) => {
        const slotEndTime = s.end_time?.substring(0, 5);
        if (!slotEndTime) return false;
        
        if (selectedDate !== todayStr) return true;
        
        const [endHours, endMinutes] = slotEndTime.split(':').map(Number);
        const endMinutesTotal = endHours * 60 + endMinutes;
        
        return currentTimeMinutes <= endMinutesTotal;
      }).map((s: any) => ({
        id: s.id,
        start: s.start_time?.substring(0, 5),
        end: s.end_time?.substring(0, 5),
        date: s.date,
      }));
      
      setAvailableSlots(filteredSlots);
    } else {
      setSchedules([]);
      setAvailableSlots([]);
    }
  }

  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      toast.error('সব তথ্য পূরণ করুন');
      return;
    }

    setLoading(true);

    try {
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }
      const patientData = JSON.parse(localStorage.getItem('patientData') || 'null');
      
      if (!patientData) {
        toast.error('রোগীর তথ্য পাওয়া যায়নি');
setLoading(false);
        return;
      }

      const insertData = {
        patient_id: patientData.id,
        doctor_id: selectedDoctor.id,
        date: selectedDate,
        time: selectedSlot.start,
        status: 'pending',
        type: consultType,
        reason: reason,
        teleconsult_link: consultType === 'teleconsult' ? selectedDoctor?.zoom_link || null : null,
      };

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Appointment booking error:', error);
        toast.error(`বুকিং ব্যর্থ হয়েছে: ${error.message}`);
        setLoading(false);
        return;
      }

      if (appointment) {
        requestPushPermission();

        await sendNotification('appointment_pending_patient', {
          patientId: patientData.id,
        }, {
          date: selectedDate,
          time: selectedSlot.start,
        });

        await sendNotification('appointment_booked_admin', {
          adminIds: [],
        }, {
          patientName: patientData.name,
          doctorName: selectedDoctor.name,
          date: selectedDate,
          time: selectedSlot.start,
        });

        await sendNotification('appointment_booked_doctor', {
          doctorId: selectedDoctor.id,
        }, {
          patientName: patientData.name,
          date: selectedDate,
          time: selectedSlot.start,
        });

        toast.success('আপনার অনুরোধ প্রক্রিয়াধীন আছে');
        router.push('/dashboard/patient/appointments');
        setLoading(false);
        return;
      }
      
    } catch (err: any) {
      console.error('Booking exception:', err);
      toast.error('কিছু সমস্যা হয়েছে, দয়া করে আবার চেষ্টা করুন');
    } finally {
      setLoading(false);
    }
  };

  const getNextDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      days.push({ date, dateStr });
    }
    return days;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const generateMeetLink = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const randomPart = () => {
      let s = '';
      for (let i = 0; i < 3; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
      return s;
    };
    return `https://meet.google.com/${randomPart()}-${randomPart()}-${randomPart()}`;
  };

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6 page-enter">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">অ্যাপয়েন্টমেন্ট বুক করুন</h1>
            <p className="text-slate-500 text-sm">ডাক্তারের সাথে অ্যাপয়েন্টমেন্ট নির্ধারণ করুন</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`
                w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all
                ${step > i + 1 ? 'bg-emerald-500 text-white' : 
                  step === i + 1 ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-slate-200 text-slate-400'}
              `}>
                {step > i + 1 ? <Check className="w-5 h-5" /> : i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${step >= i + 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                {label}
              </span>
              {i < 3 && (
                <div className={`flex-1 h-1.5 rounded-full transition-all ${step > i + 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="animate-fade-up">
            <Card>
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary-500" />
                ডাক্তার নির্বাচন করুন
              </h2>
              <div className="space-y-3">
                {doctors.map((doctor) => (
                  <button
                    key={doctor.id}
                    onClick={() => { setSelectedDoctor(doctor); setStep(2); }}
                    className={`
                      w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all
                      ${selectedDoctor?.id === doctor.id 
                        ? 'border-primary-500 bg-primary-50/50' 
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold shadow-md">
                        {doctor.name?.charAt(2) || 'ডা'}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">{doctor.name}</p>
                        <p className="text-sm mt-1">
                          <span className="text-primary-600 font-medium">{doctor.degree}</span>
                          <span className="text-slate-300 mx-1">•</span>
                          <span className="text-slate-500">{doctor.specialty}</span>
                        </p>
                        <p className="text-sm text-primary-600 mt-1 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          ৳{doctor.fee}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300" />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {step === 2 && selectedDoctor && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                {selectedDoctor.name?.charAt(2) || 'ডা'}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{selectedDoctor.name}</p>
                <p className="text-sm text-primary-600">{selectedDoctor.degree} • {selectedDoctor.specialty} • ৳{selectedDoctor.fee}</p>
              </div>
              <button onClick={() => setStep(1)} className="ml-auto text-sm text-slate-500 hover:text-slate-700">
                ফিরে যান
              </button>
            </div>

            <Card>
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-primary-500" />
                ধরন নির্বাচন করুন
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConsultType('in-person')}
                  className={`
                    p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                    ${consultType === 'in-person' 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <div className={`p-3 rounded-xl ${consultType === 'in-person' ? 'bg-primary-500' : 'bg-slate-100'}`}>
                    <Calendar className={`w-6 h-6 ${consultType === 'in-person' ? 'text-white' : 'text-slate-600'}`} />
                  </div>
                  <span className="font-medium">সরাসরি</span>
                </button>
                <button
                  onClick={() => setConsultType('teleconsult')}
                  className={`
                    p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                    ${consultType === 'teleconsult' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <div className={`p-3 rounded-xl ${consultType === 'teleconsult' ? 'bg-purple-500' : 'bg-slate-100'}`}>
                    <Video className={`w-6 h-6 ${consultType === 'teleconsult' ? 'text-white' : 'text-slate-600'}`} />
                  </div>
                  <span className="font-medium">ভিডিও কল</span>
                </button>
              </div>
            </Card>

            <Button
              onClick={() => setStep(3)}
              className="w-full"
            >
              পরবর্তী ধাপ
            </Button>
          </div>
        )}

        {step === 3 && selectedDoctor && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                {selectedDoctor.name?.charAt(2) || 'ডা'}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{selectedDoctor.name}</p>
                <p className="text-sm text-primary-600">{selectedDoctor.degree} • {selectedDoctor.specialty}</p>
              </div>
              <button onClick={() => setStep(1)} className="ml-auto text-sm text-slate-500 hover:text-slate-700">
                ফিরে যান
              </button>
            </div>

            <Card>
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-500" />
                তারিখ নির্বাচন করুন
              </h2>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {getNextDays().map((item, i) => {
                  const dateStr = item.dateStr;
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={i}
                      onClick={() => { setSelectedDate(dateStr); setSelectedSlot(null); }}
                      className={`
                        p-3 rounded-xl border-2 text-center transition-all
                        ${isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }
                      `}
                    >
                      <div className="text-xs text-slate-500">{item.date.toLocaleDateString('bn-BD', { weekday: 'short' })}</div>
                      <div className={`font-bold text-lg ${isSelected ? 'text-primary-600' : 'text-slate-900'}`}>{item.date.getDate()}</div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {selectedDate && (
              <Card className="animate-fade-up">
                <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-500" />
                  উপলব্ধ সময়
                </h2>
                
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p>এই তারিখে কোনো শিফট নেই</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot)}
                          className={`
                            p-4 rounded-xl border-2 transition-all text-center
                            ${isSelected 
                              ? 'border-primary-500 bg-primary-50' 
                              : 'border-slate-200 hover:border-slate-300'
                            }
                          `}
                        >
                          <Clock className="w-5 h-5 mx-auto mb-1 text-primary-500" />
                          <span className="font-semibold text-slate-900">
                            {slot.start} - {slot.end}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            <Card>
              <label className="font-semibold text-slate-900 mb-3 block">আপনার সমস্যা বলুন</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input h-24 resize-none"
                placeholder="সমস্যা লিখুন..."
              />
            </Card>

            <Button
              onClick={() => setStep(4)}
              disabled={!selectedDate || !selectedSlot || !reason}
              className="w-full"
            >
              পরবর্তী ধাপ
            </Button>
          </div>
        )}

        {step === 4 && selectedDoctor && (
          <div className="space-y-4 animate-fade-up">
            <Card>
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-primary-500" />
                নিশ্চিত করুন
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500">ডাক্তার</span>
                  <span className="font-semibold text-slate-900">{selectedDoctor.name} ({selectedDoctor.degree})</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500">বিভাগ</span>
                  <span className="font-semibold text-slate-900">{selectedDoctor.specialty}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500">তারিখ</span>
                  <span className="font-semibold text-slate-900">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500">সময়</span>
                  <span className="font-semibold text-slate-900">{selectedSlot?.start} - {selectedSlot?.end}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500">ধরন</span>
                  <span className="font-semibold text-slate-900 flex items-center gap-2">
                    {consultType === 'teleconsult' && <Video className="w-4 h-4 text-purple-600" />}
                    {consultType === 'teleconsult' ? 'ভিডিও কল' : 'সরাসরি'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500">সমস্যা</span>
                  <span className="font-semibold text-slate-900">{reason}</span>
                </div>
                <div className="flex items-center justify-between py-4 bg-primary-50 rounded-xl px-4 -mx-4">
                  <span className="font-semibold text-slate-900">মোট ফি</span>
                  <span className="text-2xl font-bold text-primary-600">৳{selectedDoctor.fee}</span>
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(3)} className="flex-1">
                পিছনে
              </Button>
              <Button onClick={handleSubmit} loading={loading} className="flex-1">
                নিশ্চিত করুন
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}