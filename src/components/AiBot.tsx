import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

export function AiBot({ patientId }: { patientId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<{ summary_text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen && !data && !isLoading && !error) {
      setIsLoading(true);
      api.get(`/patients/${patientId}/ai_summary`)
        .then(r => setData(r.data))
        .catch(() => setError(true))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, patientId, data, isLoading, error]);

  return (
    <>
      <div 
        className="fixed bottom-8 right-8 z-40 cursor-pointer animate-bounce hover:scale-110 transition-transform print:hidden group"
        onClick={() => setIsOpen(true)}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>
        <div className="w-16 h-16 rounded-full shadow-2xl overflow-hidden border-2 border-white/60 bg-white/20 backdrop-blur-md flex items-center justify-center relative">
          <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
          <img src="/ai_3d_bot.png" alt="AI Bot" className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500" />
        </div>
      </div>

      {isOpen && (
        <div className="fixed bottom-32 right-8 z-50 w-96 flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* Chat Bubble Tail */}
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white/95 border-b border-r border-white/20 transform rotate-45"></div>
          
          <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-10">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 p-0.5 flex items-center justify-center shadow-inner shrink-0">
                   <img src="/ai_3d_bot.png" alt="AI Bot" className="w-full h-full object-cover rounded-full" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-none">AI Assistant</h3>
                  <span className="text-[9px] uppercase tracking-widest opacity-80 font-semibold">Patient Analysis</span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-5 max-h-[50vh] overflow-y-auto text-slate-800 text-sm leading-relaxed">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-8 text-blue-500">
                  <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                  <p className="font-bold animate-pulse text-slate-600 text-sm">Analyzing records...</p>
                </div>
              )}
              {error && (
                <div className="text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <div>
                    <p className="font-bold text-sm">Error loading summary</p>
                    <p className="text-xs mt-1 opacity-80">Could not connect to AI service.</p>
                  </div>
                </div>
              )}
              {data && <Typewriter text={data.summary_text || 'No summary available.'} />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Typewriter({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('')
  const index = useRef(0)

  useEffect(() => {
    setDisplayedText('');
    let currentText = '';
    let i = 0;
    
    const interval = setInterval(() => {
      if (i < text.length) {
        currentText += text.charAt(i);
        setDisplayedText(currentText);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="whitespace-pre-wrap font-mono text-[14px] text-slate-700 bg-slate-50/80 p-5 rounded-xl border border-slate-200 shadow-inner leading-relaxed relative overflow-hidden">
      {/* Decorative gradient line */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600"></div>
      
      <div className="pl-3">
        {displayedText}
        {displayedText.length < text.length && (
          <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse align-middle"></span>
        )}
      </div>
    </div>
  )
}
