
export type Language = 'en' | 'hi' | 'ta';

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  schedule: string[]; // Array of times in "HH:MM" 24h format
}

export interface TreatmentPlan {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  history: string;
  symptoms: string;
  medications: string; // Current meds
  generatedPlan: {
    overview: string;
    diet: string[];
    medicines: Medicine[];
    monitoring: string[];
    durationDays: number;
  };
  createdAt: string;
}

export interface CustomReminder {
  id: string;
  name: string;
  dosage: string;
  time: string; // HH:MM
  alarmEnabled: boolean;
  notes: string;
  sound: string; // ID of the sound file
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface LocationMarker {
  id: string;
  name: string;
  type: 'HOSPITAL' | 'PHARMACY';
  address: string;
  lat: number;
  lng: number;
}
