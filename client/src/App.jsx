import React from 'react';
import { Newspaper, Sparkles } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Newspaper className="w-6 h-6" />
        </div>
        <h1 className="font-serif-headline text-3xl font-bold text-slate-900 tracking-tight">
          The Dispatch
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Editorial Workflow Platform (React + Express + JavaScript)
        </p>
        <div className="mt-6 p-4 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>Ready for your schema and component architecture</span>
        </div>
      </div>
    </div>
  );
}
