import React from 'react';
import { FileText, Pill, MessageSquare, MapPin, Stethoscope, Newspaper } from 'lucide-react';
import { useAuth, useLanguage } from '../App';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const cards = [
    {
      title: t.dashboard.cardPlan,
      desc: t.dashboard.cardPlanDesc,
      icon: FileText,
      link: '/treatment-plan',
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: t.dashboard.cardMed,
      desc: t.dashboard.cardMedDesc,
      icon: Stethoscope,
      link: '/medicine-ai',
      iconColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    },
    {
      title: t.dashboard.cardNews,
      desc: t.dashboard.cardNewsDesc,
      icon: Newspaper,
      link: '/medical-news',
      iconColor: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-900/20'
    },
    {
      title: t.dashboard.cardReminders,
      desc: t.dashboard.cardRemindersDesc,
      icon: Pill,
      link: '/reminders',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    {
      title: t.dashboard.cardChat,
      desc: t.dashboard.cardChatDesc,
      icon: MessageSquare,
      link: '/chatbot',
      iconColor: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-900/20'
    },
    {
      title: t.dashboard.cardLoc,
      desc: t.dashboard.cardLocDesc,
      icon: MapPin,
      link: '/locations',
      iconColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.dashboard.welcome}, {user?.username}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t.dashboard.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-md ${card.bgColor}`}>
                  <Icon size={24} className={card.iconColor} />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{card.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{card.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
            Quick Start Guide
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300 text-sm">
            <li>Go to <strong className="font-medium">{t.dashboard.cardPlan}</strong> to generate your first AI health plan.</li>
            <li>Use <strong className="font-medium text-red-600 dark:text-red-400">{t.dashboard.cardMed}</strong> to check details about your prescribed medicines.</li>
            <li>Set up <strong className="font-medium">{t.dashboard.cardReminders}</strong> so you never miss a dose.</li>
        </ol>
      </div>
    </div>
  );
}