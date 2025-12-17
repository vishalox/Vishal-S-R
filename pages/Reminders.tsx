import React, { useEffect, useState, useRef } from 'react';
import { Pill, Sun, Moon, Bell, Plus, Trash2, Clock, Volume2, Play, Square, AlertTriangle } from 'lucide-react';
import { TreatmentPlan, CustomReminder } from '../types';

interface ReminderItemProps {
  name: string;
  time: string;
  dosage: string;
  type: 'PLAN' | 'CUSTOM';
  soundLabel?: string;
  onDelete?: () => void;
}

// Sound Library
const ALARM_SOUNDS: Record<string, { label: string; url: string }> = {
  'gentle': { label: 'Gentle Chime', url: 'https://cdn.freesound.org/previews/235/235914_2391629-lq.mp3' },
  'digital': { label: 'Digital Beep', url: 'https://cdn.freesound.org/previews/264/264877_4486188-lq.mp3' },
  'bell': { label: 'Classic Bell', url: 'https://cdn.freesound.org/previews/339/339810_5121236-lq.mp3' },
  'urgent': { label: 'Urgent Alert', url: 'https://cdn.freesound.org/previews/337/337000_5674468-lq.mp3' }
};

export default function Reminders() {
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [permission, setPermission] = useState(Notification.permission);
  
  // New Reminder Form State
  const [newMed, setNewMed] = useState({ name: '', dosage: '', time: '', notes: '', sound: 'gentle' });
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Track last trigger time to prevent duplicates within the same minute
  const lastTriggered = useRef<Record<string, number>>({});

  // Load Data
  useEffect(() => {
    const savedPlan = localStorage.getItem('hg_current_plan');
    if (savedPlan) setPlan(JSON.parse(savedPlan));

    const savedCustom = localStorage.getItem('hg_custom_reminders');
    if (savedCustom) setCustomReminders(JSON.parse(savedCustom));
  }, []);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
       new Notification("MediCare", { body: "Notifications enabled successfully!" });
    }
  };

  // Audio Preview Logic
  const togglePreview = () => {
    if (isPlayingPreview) {
        audioRef.current?.pause();
        audioRef.current = null;
        setIsPlayingPreview(false);
    } else {
        const soundUrl = ALARM_SOUNDS[newMed.sound]?.url;
        if (soundUrl) {
            const audio = new Audio(soundUrl);
            audioRef.current = audio;
            audio.onended = () => setIsPlayingPreview(false);
            audio.play().catch(e => console.error("Preview failed:", e));
            setIsPlayingPreview(true);
        }
    }
  };

  // Stop preview if component unmounts or sound changes
  useEffect(() => {
    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };
  }, []);

  // Save Custom Reminders
  const addCustomReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name || !newMed.time) return;

    const newReminder: CustomReminder = {
      id: Date.now().toString(),
      name: newMed.name,
      dosage: newMed.dosage || 'As prescribed',
      time: newMed.time,
      alarmEnabled: true,
      notes: newMed.notes,
      sound: newMed.sound
    };

    const updated = [...customReminders, newReminder];
    setCustomReminders(updated);
    localStorage.setItem('hg_custom_reminders', JSON.stringify(updated));
    setNewMed({ name: '', dosage: '', time: '', notes: '', sound: 'gentle' });
    setShowAddForm(false);
    
    // Stop preview if running
    if (isPlayingPreview) {
        audioRef.current?.pause();
        setIsPlayingPreview(false);
    }
  };

  const deleteCustomReminder = (id: string) => {
    const updated = customReminders.filter(r => r.id !== id);
    setCustomReminders(updated);
    localStorage.setItem('hg_custom_reminders', JSON.stringify(updated));
  };

  // Alarm Logic
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      // Format current time as HH:MM
      const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const nowTimestamp = now.getTime();
      
      const trigger = (id: string, name: string, dosage: string, soundKey: string) => {
          // Check if already triggered in the last 60 seconds
          const lastTime = lastTriggered.current[id] || 0;
          if (nowTimestamp - lastTime < 60000) return;

          // Mark as triggered
          lastTriggered.current[id] = nowTimestamp;

          // 1. Browser Notification
          if (Notification.permission === "granted") {
              try {
                new Notification(`MediCare: Time for ${name}`, { 
                    body: `Dosage: ${dosage}`,
                    icon: '/vite.svg' // Fallback icon
                });
              } catch (e) {
                  console.error("Notification failed", e);
              }
          }

          // 2. Play Sound
          const soundUrl = ALARM_SOUNDS[soundKey]?.url || ALARM_SOUNDS['gentle'].url;
          const audio = new Audio(soundUrl);
          audio.play().catch(e => console.log("Autoplay blocked:", e));
      };

      // Check custom reminders
      customReminders.forEach(r => {
        if (r.alarmEnabled && r.time === currentTime) {
           trigger(r.id, r.name, r.dosage, r.sound);
        }
      });
      
      // Check Treatment Plan medicines
      if (plan) {
         plan.generatedPlan.medicines.forEach((med, idx) => {
            med.schedule.forEach(time => {
                if (time === currentTime) {
                   // Create a stable ID for plan medicines based on index and time
                   const id = `plan-${idx}-${time}`;
                   trigger(id, med.name, med.dosage, 'gentle');
                }
            });
         });
      }
    };

    // Check frequently (every 5 seconds) to catch the minute change reliably
    // but rely on `lastTriggered` to debounce duplicates.
    const interval = setInterval(checkAlarms, 5000); 
    return () => clearInterval(interval);
  }, [customReminders, plan]);

  const getPeriod = (timeStr: string) => {
    const hour = parseInt(timeStr.split(':')[0]);
    return hour < 12 ? 'AM' : 'PM';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header & Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-8 text-white shadow-xl">
        <div>
            <h1 className="text-3xl font-bold mb-2">Daily Reminders</h1>
            <p className="opacity-90 text-emerald-100">Automatic alerts for your treatment plan.</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
            {permission !== 'granted' && (
                <button 
                    onClick={requestPermission}
                    className="bg-amber-400 text-amber-900 hover:bg-amber-300 font-bold py-2 px-4 rounded-xl flex items-center shadow-lg transition"
                >
                    <Bell size={20} className="mr-2" /> Enable Alerts
                </button>
            )}
            <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold py-2 px-4 rounded-xl flex items-center shadow-lg transition"
            >
                <Plus size={20} className="mr-2" /> Add Medicine
            </button>
        </div>
      </div>

      {permission === 'denied' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-200">
             <AlertTriangle className="flex-shrink-0 mt-0.5" size={20} />
             <div>
                 <p className="font-bold">Notifications are blocked</p>
                 <p className="text-sm">Please enable notifications in your browser settings to receive medicine alerts.</p>
             </div>
          </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-lg animate-fade-in transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Custom Reminder</h3>
            <form onSubmit={addCustomReminder} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="col-span-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Medicine Name</label>
                    <input 
                        placeholder="e.g. Aspirin" 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} required
                    />
                </div>
                
                <div className="col-span-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Dosage</label>
                    <input 
                        placeholder="e.g. 1 tablet" 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        value={newMed.dosage} onChange={e => setNewMed({...newMed, dosage: e.target.value})}
                    />
                </div>
                
                <div className="col-span-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Time</label>
                    <input 
                        type="time" 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        value={newMed.time} onChange={e => setNewMed({...newMed, time: e.target.value})} required
                    />
                </div>

                <div className="col-span-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Alarm Sound</label>
                    <div className="flex gap-2">
                        <select 
                            className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                            value={newMed.sound} 
                            onChange={e => {
                                setNewMed({...newMed, sound: e.target.value});
                                setIsPlayingPreview(false); // Stop old sound if changing
                            }}
                        >
                            {Object.entries(ALARM_SOUNDS).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                        <button 
                            type="button" 
                            onClick={togglePreview}
                            className={`p-3 rounded-xl border transition ${isPlayingPreview ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            title="Preview Sound"
                        >
                            {isPlayingPreview ? <Square size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
                        </button>
                    </div>
                </div>

                <div className="md:col-span-2 lg:col-span-4 mt-2">
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition">
                        Save Alarm
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* Grid for AM / PM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Morning Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col h-full transition-colors">
          <div className="flex items-center space-x-2 mb-6 text-amber-500 pb-4 border-b border-slate-200 dark:border-slate-800">
            <Sun size={24} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Morning (AM)</h2>
            <span className="text-xs ml-auto text-slate-500">00:00 - 11:59</span>
          </div>
          
          <div className="space-y-3 flex-1">
             {/* Render Plan Meds AM */}
             {plan?.generatedPlan?.medicines?.map((med, i) => 
                med.schedule.filter(t => getPeriod(t) === 'AM').map(time => (
                    <ReminderItem key={`${i}-${time}`} name={med.name} time={time} dosage={med.dosage} type="PLAN" />
                ))
             )}
             
             {/* Render Custom Meds AM */}
             {customReminders.filter(r => getPeriod(r.time) === 'AM').map(r => (
                <ReminderItem 
                    key={r.id} 
                    name={r.name} 
                    time={r.time} 
                    dosage={r.dosage} 
                    type="CUSTOM" 
                    soundLabel={ALARM_SOUNDS[r.sound]?.label}
                    onDelete={() => deleteCustomReminder(r.id)} 
                />
             ))}

             {(!plan && customReminders.filter(r => getPeriod(r.time) === 'AM').length === 0) && (
                 <div className="text-center text-slate-500 dark:text-slate-600 py-4 italic">No morning reminders</div>
             )}
          </div>
        </div>

        {/* Evening Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col h-full transition-colors">
          <div className="flex items-center space-x-2 mb-6 text-indigo-500 dark:text-indigo-400 pb-4 border-b border-slate-200 dark:border-slate-800">
            <Moon size={24} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Evening (PM)</h2>
            <span className="text-xs ml-auto text-slate-500">12:00 - 23:59</span>
          </div>
          
           <div className="space-y-3 flex-1">
             {/* Render Plan Meds PM */}
             {plan?.generatedPlan?.medicines?.map((med, i) => 
                med.schedule.filter(t => getPeriod(t) === 'PM').map(time => (
                    <ReminderItem key={`${i}-${time}`} name={med.name} time={time} dosage={med.dosage} type="PLAN" />
                ))
             )}

             {/* Render Custom Meds PM */}
             {customReminders.filter(r => getPeriod(r.time) === 'PM').map(r => (
                <ReminderItem 
                    key={r.id} 
                    name={r.name} 
                    time={r.time} 
                    dosage={r.dosage} 
                    type="CUSTOM" 
                    soundLabel={ALARM_SOUNDS[r.sound]?.label}
                    onDelete={() => deleteCustomReminder(r.id)} 
                />
             ))}

             {(!plan && customReminders.filter(r => getPeriod(r.time) === 'PM').length === 0) && (
                 <div className="text-center text-slate-500 dark:text-slate-600 py-4 italic">No evening reminders</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for individual reminder row
const ReminderItem: React.FC<ReminderItemProps> = ({ name, time, dosage, type, soundLabel, onDelete }) => {
    return (
        <div className={`flex items-center p-4 rounded-xl border transition group ${type === 'PLAN' ? 'bg-sky-50 dark:bg-sky-900/10 border-sky-100 dark:border-sky-900/30' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
            <div className={`p-2 rounded-lg mr-4 ${type === 'PLAN' ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                {type === 'PLAN' ? <Pill size={20} /> : <Bell size={20} />}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-200">{name}</span>
                    {type === 'PLAN' && <span className="text-[10px] bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-300 px-1.5 rounded">AUTO</span>}
                </div>
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <Clock size={12} className="mr-1" /> {time}
                    <span className="mx-2">•</span>
                    <span>{dosage}</span>
                    {soundLabel && (
                        <>
                            <span className="mx-2 border-l border-slate-300 dark:border-slate-700 h-3 block"></span>
                            <Volume2 size={12} className="mr-1 text-emerald-500" /> {soundLabel}
                        </>
                    )}
                </div>
            </div>
            
            {type === 'CUSTOM' && onDelete && (
                <button onClick={onDelete} className="text-slate-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition">
                    <Trash2 size={18} />
                </button>
            )}
            
            {/* Simple toggle checkbox simulation */}
            <input type="checkbox" className="ml-3 h-5 w-5 bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-sky-600 rounded focus:ring-offset-white dark:focus:ring-offset-slate-900 cursor-pointer" />
        </div>
    );
}