import React, { useState } from 'react';
import { Download, Share2, AlertTriangle, CheckCircle, Loader2, FileText, Clock, Upload, X, Image as ImageIcon, Camera, Save, History, Calendar } from 'lucide-react';
import { TreatmentPlan as TreatmentPlanType, Medicine } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { useAuth, useLanguage } from '../App';
import { jsPDF } from "jspdf";

export default function TreatmentPlan() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<TreatmentPlanType | null>(null);
  const [whatsappNum, setWhatsappNum] = useState('');
  
  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<TreatmentPlanType[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Image State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("");

  // Form State
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'male',
    history: '',
    symptoms: '',
    medications: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        const base64Data = result.split(',')[1];
        setImageBase64(base64Data);
        setImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType("");
  };

  // --- Persistence (LocalStorage) ---

  const saveToDatabase = async () => {
    if (!generatedPlan || !user?.email) {
        if (!user?.email) alert("You must be logged in to save.");
        return;
    }
    setSaving(true);
    
    // Create a copy with the LATEST form data to ensure edits are saved
    const planToSave: TreatmentPlanType = {
        ...generatedPlan,
        patientName: form.name,
        age: parseInt(form.age) || 0,
        gender: form.gender,
        history: form.history,
        symptoms: form.symptoms,
        medications: form.medications
    };

    await new Promise(resolve => setTimeout(resolve, 600));

    try {
        const historyKey = `hg_history_${user.email}`;
        const currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        // Check if ID exists to update, otherwise add
        const index = currentHistory.findIndex((p: TreatmentPlanType) => p.id === planToSave.id);
        
        let updatedHistory;
        if (index !== -1) {
             updatedHistory = [...currentHistory];
             updatedHistory[index] = planToSave;
             alert("Plan updated in your profile!");
        } else {
             updatedHistory = [planToSave, ...currentHistory];
             alert("Full plan saved to your profile!");
        }

        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        setGeneratedPlan(planToSave); // Update state to match saved
        
    } catch (e) {
        console.error(e);
        alert("Failed to save plan.");
    } finally {
        setSaving(false);
    }
  };

  const fetchHistory = async () => {
    if (!user?.email) {
        alert("Please login to view history.");
        return;
    }
    setLoadingHistory(true);
    setShowHistory(true);

    await new Promise(resolve => setTimeout(resolve, 400));

    try {
        const historyKey = `hg_history_${user.email}`;
        const data = JSON.parse(localStorage.getItem(historyKey) || '[]');
        setHistoryList(data);
    } catch (e) {
        console.error(e);
        alert("Could not load history.");
    } finally {
        setLoadingHistory(false);
    }
  };

  const loadHistoricalPlan = (plan: TreatmentPlanType) => {
      setGeneratedPlan(plan);
      setForm({
          name: plan.patientName,
          age: plan.age.toString(),
          gender: plan.gender,
          history: plan.history,
          symptoms: plan.symptoms,
          medications: plan.medications
      });
      setShowHistory(false);
  };

  // --- AI Generation ---

  const generatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const planSchema = {
      type: Type.OBJECT,
      properties: {
        overview: { type: Type.STRING, description: "A comprehensive medical overview of the condition based on symptoms and image." },
        diet: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of dietary recommendations." },
        medicines: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              dosage: { type: Type.STRING },
              frequency: { type: Type.STRING },
              duration: { type: Type.STRING },
              schedule: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 24h times like '08:00', '20:00'" }
            },
            required: ["name", "dosage", "frequency", "duration", "schedule"]
          }
        },
        monitoring: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of things to monitor." },
        durationDays: { type: Type.INTEGER }
      },
      required: ["overview", "diet", "medicines", "monitoring", "durationDays"]
    };

    try {
      if (process.env.API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // --- Language Logic ---
        const targetLanguage = language === 'hi' ? 'Hindi' : language === 'ta' ? 'Tamil' : 'English';
        
        const promptText = `Generate a medical treatment plan for a patient.
          Target Language: ${targetLanguage} (IMPORTANT: ALL OUTPUT MUST BE IN ${targetLanguage}).
          
          Details:
          - Name: ${form.name}
          - Age: ${form.age}
          - Gender: ${form.gender}
          - Medical History: ${form.history}
          - Symptoms: ${form.symptoms}
          - Current Meds: ${form.medications}

          If an image is provided, analyze it (e.g., skin rash, wound, medical report) and incorporate findings into the 'overview' and 'medicines'.
          Provide specific medicines with dosages and specific 'schedule' times (e.g. ["09:00", "21:00"]).
          Ensure the tone is professional yet reassuring.`;

        const parts: any[] = [{ text: promptText }];
        if (imageBase64) {
          parts.push({
            inlineData: {
              mimeType: imageMimeType,
              data: imageBase64
            }
          });
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: [{
            role: 'user',
            parts: parts
          }],
          config: {
            responseMimeType: "application/json",
            responseSchema: planSchema,
            systemInstruction: `You are an expert AI medical assistant. You analyze symptoms and images to suggest treatment plans. You must reply in ${targetLanguage}.`
          }
        });

        const aiJson = JSON.parse(response.text || "{}");

        const plan: TreatmentPlanType = {
          id: Date.now().toString(),
          patientName: form.name,
          age: parseInt(form.age),
          gender: form.gender,
          history: form.history,
          symptoms: form.symptoms,
          medications: form.medications,
          generatedPlan: aiJson,
          createdAt: new Date().toISOString()
        };

        setGeneratedPlan(plan);
        localStorage.setItem('hg_current_plan', JSON.stringify(plan));
      
      } else {
        // Fallback simulation (English only for fallback)
        await new Promise(r => setTimeout(r, 2000));
        alert("Please set API_KEY for multi-language support. Showing demo data.");
        // Simulated data would go here...
      }
    } catch (error) {
      console.error("Plan Generation Error:", error);
      alert("Failed to generate plan. Please check your network connection or API Key.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!generatedPlan) return;
    
    if (language !== 'en') {
       alert("Note: PDF generation currently supports English characters best. Non-Latin scripts (Hindi/Tamil) may not render correctly in this client-side demo.");
    }

    const btn = document.getElementById('download-btn') as HTMLButtonElement;
    const originalText = btn?.innerHTML;
    if(btn) btn.innerHTML = '<span class="animate-spin inline-block mr-2">⟳</span> ...';
    if(btn) btn.disabled = true;

    try {
        const doc = new jsPDF();
        // Use current form state to ensure PDF has latest edits
        const patientDetails = {
            name: form.name,
            age: form.age,
            gender: form.gender,
            history: form.history,
            symptoms: form.symptoms,
            meds: form.medications
        };
        const plan = generatedPlan.generatedPlan;
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = 20;

        const checkPageBreak = (spaceNeeded: number) => {
            if (y + spaceNeeded > 280) {
                doc.addPage();
                y = 20;
            }
        };

        // --- Header ---
        doc.setFontSize(22);
        doc.setTextColor(14, 165, 233); // Sky Blue
        doc.text("MediCare", pageWidth / 2, y, { align: "center" });
        y += 8;
        
        doc.setFontSize(14);
        doc.setTextColor(80);
        doc.text("Comprehensive Treatment Plan", pageWidth / 2, y, { align: "center" });
        y += 15;

        doc.setLineWidth(0.5);
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // --- Patient Details ---
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text("Patient Details", margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        doc.text(`Name: ${patientDetails.name}`, margin, y);
        doc.text(`Age: ${patientDetails.age}`, margin + 80, y);
        doc.text(`Gender: ${patientDetails.gender}`, margin + 120, y);
        y += 7;

        const printSection = (label: string, content: string) => {
            if (!content) return;
            doc.setFont("helvetica", "bold");
            doc.text(`${label}:`, margin, y);
            const contentLines = doc.splitTextToSize(content, pageWidth - margin - 50); // indent
            doc.setFont("helvetica", "normal");
            // Check height
            checkPageBreak(contentLines.length * 5);
            doc.text(contentLines, margin + 35, y);
            y += (contentLines.length * 5) + 3;
        };

        printSection("History", patientDetails.history);
        printSection("Symptoms", patientDetails.symptoms);
        printSection("Current Meds", patientDetails.meds);
        
        y += 5;
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // --- AI Analysis ---
        checkPageBreak(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("AI Analysis & Overview", margin, y);
        y += 7;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const overviewLines = doc.splitTextToSize(plan.overview, pageWidth - (margin * 2));
        checkPageBreak(overviewLines.length * 5);
        doc.text(overviewLines, margin, y);
        y += (overviewLines.length * 5) + 10;

        // --- Medicines ---
        checkPageBreak(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(14, 165, 233);
        doc.text("Prescribed Medicines", margin, y);
        doc.setTextColor(0);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        plan.medicines.forEach((med) => {
            checkPageBreak(15);
            doc.setFont("helvetica", "bold");
            doc.text(`• ${med.name}`, margin, y);
            doc.setFont("helvetica", "normal");
            doc.text(`- ${med.dosage} (${med.frequency})`, margin + 60, y);
            y += 5;
            if (med.schedule && med.schedule.length > 0) {
                 doc.setFontSize(9);
                 doc.setTextColor(100);
                 doc.text(`  Schedule: ${med.schedule.join(', ')}`, margin + 5, y);
                 doc.setTextColor(0);
                 doc.setFontSize(10);
                 y += 6;
            }
        });
        y += 5;

        // --- Diet ---
        checkPageBreak(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(14, 165, 233);
        doc.text("Dietary Advice", margin, y);
        doc.setTextColor(0);
        y += 8;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        plan.diet.forEach(item => {
             const lines = doc.splitTextToSize(`• ${item}`, pageWidth - margin*2);
             checkPageBreak(lines.length * 5);
             doc.text(lines, margin, y);
             y += (lines.length * 5);
        });
        y += 5;

        // --- Monitoring ---
        checkPageBreak(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(14, 165, 233);
        doc.text("Monitoring & Precautions", margin, y);
        doc.setTextColor(0);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        plan.monitoring.forEach(item => {
             const lines = doc.splitTextToSize(`• ${item}`, pageWidth - margin*2);
             checkPageBreak(lines.length * 5);
             doc.text(lines, margin, y);
             y += (lines.length * 5);
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generated by MediCare AI. Consult a doctor before use.`, pageWidth / 2, 290, { align: "center" });

        doc.save(`Treatment_Plan_${patientDetails.name.replace(/\s+/g, '_')}.pdf`);

    } catch (error) {
        console.error("PDF Generation failed:", error);
        alert("Failed to generate PDF");
    } finally {
        if(btn) btn.innerHTML = originalText || 'Download PDF';
        if(btn) btn.disabled = false;
    }
  };

  const sendWhatsApp = () => {
    if (!whatsappNum) return alert("Please enter a phone number");
    const text = `MediCare Plan for ${form.name}: ${generatedPlan?.generatedPlan.overview.substring(0, 100)}...`;
    window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const inputClasses = "w-full mt-1 p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all";
  const labelClasses = "text-sm font-medium text-slate-600 dark:text-slate-300 ml-1";

  return (
    <div className="max-w-5xl mx-auto space-y-8 relative">
      
      {/* Top Action Bar */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md transition-colors">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="text-sky-500 dark:text-sky-400" /> 
              {t.treatment.title}
          </h2>
          <button 
            onClick={fetchHistory}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white px-4 py-2 rounded-lg transition"
          >
              <History size={18} /> {t.treatment.pastPlans}
          </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Input Form */}
        <div className="flex-1 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 h-fit transition-colors">
          <div className="flex items-center space-x-3 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.treatment.patientDetails}</h2>
          </div>
          
          <form onSubmit={generatePlan} className="space-y-5">
            {/* Image Upload Section */}
            <div>
               <label className={labelClasses}>{t.treatment.uploadLabel}</label>
               <div className="mt-2">
                 {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Camera className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-400 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Click to upload</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                 ) : (
                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 group">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                            type="button"
                            onClick={clearImage}
                            className="absolute top-2 right-2 bg-red-600/80 text-white p-1.5 rounded-full hover:bg-red-500 transition shadow-lg backdrop-blur-sm"
                        >
                            <X size={16} />
                        </button>
                    </div>
                 )}
               </div>
            </div>

            <div>
              <label className={labelClasses}>{t.treatment.name}</label>
              <input name="name" value={form.name} required className={inputClasses} onChange={handleInputChange} placeholder="John Doe" />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}>{t.treatment.age}</label>
                <input name="age" value={form.age} type="number" required className={inputClasses} onChange={handleInputChange} placeholder="25" />
              </div>
              <div>
                <label className={labelClasses}>{t.treatment.gender}</label>
                <select name="gender" value={form.gender} className={inputClasses} onChange={handleInputChange}>
                  <option value="male">{t.treatment.male}</option>
                  <option value="female">{t.treatment.female}</option>
                  <option value="other">{t.treatment.other}</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClasses}>{t.treatment.history}</label>
              <textarea name="history" value={form.history} className={`${inputClasses} h-20`} placeholder="Diabetes..." onChange={handleInputChange}></textarea>
            </div>
            <div>
              <label className={labelClasses}>{t.treatment.symptoms}</label>
              <textarea name="symptoms" value={form.symptoms} required className={`${inputClasses} h-24`} placeholder="Fever..." onChange={handleInputChange}></textarea>
            </div>
            <div>
              <label className={labelClasses}>{t.treatment.meds}</label>
              <input name="medications" value={form.medications} className={inputClasses} placeholder="..." onChange={handleInputChange} />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-sky-900/20 flex justify-center items-center mt-2"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <FileText className="mr-2" />}
              {imagePreview ? t.treatment.analyze : t.treatment.generate}
            </button>
          </form>
        </div>

        {/* Output Section */}
        <div className="flex-1">
          {!generatedPlan ? (
            <div className="h-full flex flex-col justify-center items-center text-slate-400 dark:text-slate-500 p-8 border-2 border-dashed border-slate-300 dark:border-slate-300/20 rounded-2xl bg-white dark:bg-slate-800/50 min-h-[500px]">
              <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-full mb-4">
                <ImageIcon size={48} className="opacity-50" />
              </div>
              <p className="text-lg font-medium">{t.treatment.generate}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in transition-colors">
              <div className="bg-gradient-to-r from-sky-600 to-blue-700 p-5 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-sky-200" size={20} />
                  <h3 className="font-bold text-lg">{t.treatment.recPlan}</h3>
                </div>
                <span className="text-xs bg-white/20 backdrop-blur px-2 py-1 rounded font-mono">ID: {generatedPlan.id.slice(-6)}</span>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Medicines First */}
                <section>
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sky-600 dark:text-sky-400 uppercase text-xs tracking-wider">{t.treatment.medicines}</h4>
                    </div>
                    <ul className="space-y-3">
                        {generatedPlan.generatedPlan.medicines.map((med, idx) => (
                            <li key={idx} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 p-3 rounded-lg text-sm flex justify-between items-center group hover:border-sky-300 dark:hover:border-slate-600 transition">
                                <div>
                                    <span className="font-semibold text-slate-900 dark:text-white block">{med.name}</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-xs">{med.frequency} ({med.duration})</span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-sky-600 dark:text-sky-300 text-xs font-bold">{med.dosage}</span>
                                  {med.schedule && med.schedule.map(t => (
                                      <span key={t} className="inline-flex items-center gap-1 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300 mt-1 ml-1">
                                          <Clock size={10} /> {t}
                                      </span>
                                  ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h4 className="font-bold text-sky-600 dark:text-sky-400 mb-3 uppercase text-xs tracking-wider">{t.treatment.diet}</h4>
                    <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                        {generatedPlan.generatedPlan.diet.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                </section>

                {/* Explanation at Bottom */}
                <section className="bg-slate-100 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <h4 className="font-bold text-sky-600 dark:text-sky-400 mb-2 uppercase text-xs tracking-wider">{t.treatment.analysis}</h4>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{generatedPlan.generatedPlan.overview}</p>
                </section>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                    <div className="flex gap-2">
                        <button 
                            id="download-btn"
                            onClick={downloadPDF} 
                            className="flex-1 flex items-center justify-center border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={18} className="mr-2" /> {t.treatment.download}
                        </button>
                        <button 
                            onClick={saveToDatabase} 
                            disabled={saving}
                            className="flex-1 flex items-center justify-center bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                            {t.treatment.save}
                        </button>
                    </div>
                    
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="+1234567890" 
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                            value={whatsappNum}
                            onChange={(e) => setWhatsappNum(e.target.value)}
                        />
                        <button onClick={sendWhatsApp} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 rounded-xl flex items-center transition shadow-lg shadow-emerald-900/20">
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Modal (Simplified for brevity, similar structure) */}
      {showHistory && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] transition-colors">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><History className="text-sky-500 dark:text-sky-400" /> {t.treatment.pastPlans}</h3>
                      <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"><X size={20} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {historyList.map((plan) => (
                          <div key={plan.id} onClick={() => loadHistoricalPlan(plan)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-sky-500/50 transition group">
                              <h4 className="font-bold text-slate-900 dark:text-white">{plan.patientName}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{plan.symptoms}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}