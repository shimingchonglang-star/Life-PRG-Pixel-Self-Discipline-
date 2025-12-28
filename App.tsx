
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Background from './components/Background';
import StatusBar from './components/StatusBar';
import { PlayerStats, Quest, GameLog, Language, DailyStats, FontSize } from './types';
import { INITIAL_QUESTS, MAX_STATS, TRANSLATIONS } from './constants';
import { getDailyMotivation } from './services/geminiService';

const App: React.FC = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'settings'>('home');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'cn');
  const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem('font_size') as FontSize) || 'medium');
  const [sfx, setSfx] = useState(true);
  
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('life_rpg_stats');
    return saved ? JSON.parse(saved) : { health: 10, hunger: 10, experience: 0 };
  });

  const [quests, setQuests] = useState<Quest[]>(() => {
    const saved = localStorage.getItem('life_rpg_quests');
    return saved ? JSON.parse(saved) : INITIAL_QUESTS;
  });

  const [history, setHistory] = useState<DailyStats[]>(() => {
    const saved = localStorage.getItem('life_rpg_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<GameLog[]>([]);
  const [motivation, setMotivation] = useState("Loading...");
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [isYearPicker, setIsYearPicker] = useState(false);
  const [clickEffect, setClickEffect] = useState<{id: string, x: number, y: number} | null>(null);

  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  // Audio Context for synthetic beeps
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- PERSISTENCE ---
  useEffect(() => localStorage.setItem('life_rpg_stats', JSON.stringify(stats)), [stats]);
  useEffect(() => localStorage.setItem('life_rpg_quests', JSON.stringify(quests)), [quests]);
  useEffect(() => localStorage.setItem('life_rpg_history', JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem('lang', lang), [lang]);
  useEffect(() => localStorage.setItem('font_size', fontSize), [fontSize]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setHistory(prev => {
      const existingIdx = prev.findIndex(h => h.date === today);
      const newEntry = { date: today, hp: stats.health, hunger: stats.hunger };
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = newEntry;
        return next;
      }
      return [...prev, newEntry];
    });
  }, [stats.health, stats.hunger]);

  const fetchMotivation = useCallback(async () => {
    const msg = await getDailyMotivation(stats.health, stats.hunger);
    setMotivation(msg);
  }, [stats.health, stats.hunger]);

  useEffect(() => { fetchMotivation(); }, [fetchMotivation]);

  const playBeep = (freq = 440, duration = 0.1) => {
    if (!sfx) return;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + duration);
  };

  const handleAction = (quest: Quest, e: React.MouseEvent) => {
    playBeep(660 + (quest.hpImpact * 100));
    setClickEffect({ id: quest.id, x: e.clientX, y: e.clientY });
    setTimeout(() => setClickEffect(null), 600);

    setStats(prev => ({
      ...prev,
      health: Math.min(MAX_STATS, Math.max(0, prev.health + quest.hpImpact)),
      hunger: Math.min(MAX_STATS, Math.max(0, prev.hunger + quest.hungerImpact))
    }));

    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      message: `${quest.title}`,
      impact: `${quest.hpImpact >= 0 ? '+' : ''}${quest.hpImpact} HP`
    }, ...prev.slice(0, 3)]);
  };

  const saveQuest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = isEditing && isEditing !== 'new' ? isEditing : Math.random().toString(36).substr(2, 9);
    const newQuest: Quest = {
      id,
      title: (formData.get('title') as string).toUpperCase(),
      icon: formData.get('icon') as string,
      hpImpact: parseInt(formData.get('hp') as string),
      hungerImpact: parseInt(formData.get('hunger') as string),
      isCustom: true
    };
    
    setQuests(prev => {
      if (isEditing && isEditing !== 'new') {
        return prev.map(q => q.id === isEditing ? newQuest : q);
      }
      return [...prev, newQuest];
    });
    setIsEditing(null);
    playBeep(880);
  };

  const moveQuest = (index: number, direction: 'up' | 'down') => {
    const newQuests = [...quests];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuests.length) return;
    [newQuests[index], newQuests[targetIndex]] = [newQuests[targetIndex], newQuests[index]];
    setQuests(newQuests);
    playBeep(440, 0.05);
  };

  // Chinese characters often need larger pixel size to be readable
  const isCN = lang === 'cn';
  const fontSizeClass = fontSize === 'small' 
    ? (isCN ? 'text-[15px]' : 'text-[12px]') 
    : fontSize === 'large' 
    ? (isCN ? 'text-[24px]' : 'text-[20px]') 
    : (isCN ? 'text-[19px]' : 'text-[16px]');

  const pixelLabelClass = fontSize === 'small' 
    ? (isCN ? 'text-[12px]' : 'text-[10px]') 
    : fontSize === 'large' 
    ? (isCN ? 'text-[16px]' : 'text-[14px]') 
    : (isCN ? 'text-[14px]' : 'text-[12px]');

  // --- RENDERING ---

  const renderHome = () => {
    const todayStr = new Date().toLocaleDateString(lang === 'cn' ? 'zh-CN' : lang === 'fr' ? 'fr-FR' : 'en-US', { 
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    });

    return (
      <div className={fontSizeClass}>
        {/* Date Header */}
        <div className="bg-slate-900/80 text-white p-6 pixel-border mb-4 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <h1 className="pixel-font text-sm">LIFE RPG</h1>
          </div>
          <p className={`pixel-font ${isCN ? 'text-[14px]' : 'text-[12px]'} text-yellow-400 mt-2 uppercase`}>{todayStr}</p>
        </div>

        {/* Oracle */}
        <div className="bg-white/95 p-5 pixel-border mb-4 flex gap-5 items-center relative overflow-hidden">
          <div className="w-14 h-14 bg-indigo-100 flex items-center justify-center text-4xl pixel-border">🧙</div>
          <div className="flex-1">
            <p className={`pixel-font ${pixelLabelClass} text-gray-400 mb-1`}>{t.oracle}</p>
            <p className="font-bold leading-tight">{motivation}</p>
          </div>
        </div>

        <StatusBar health={stats.health} hunger={stats.hunger} fontSize={fontSize} lang={lang} />

        {/* QUEST CARDS GRID */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className={`pixel-font ${isCN ? 'text-[14px]' : 'text-[12px]'}`}>{t.quests}</h2>
            <button onClick={() => setIsEditing('new')} className={`text-blue-600 pixel-font ${isCN ? 'text-[12px]' : 'text-[10px]'} underline`}>+{t.addQuest}</button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {quests.map((q, idx) => (
              <div key={q.id} className="relative group">
                <button 
                  onClick={(e) => handleAction(q, e)}
                  className="w-full flex flex-col items-center p-5 bg-white/95 pixel-border hover:bg-yellow-50 active:scale-95 transition-all"
                >
                  <span className="text-5xl mb-3">{q.icon}</span>
                  <span className={`pixel-font ${isCN ? 'text-[12px]' : 'text-[10px]'} text-center mb-1 leading-tight min-h-[40px] flex items-center justify-center`}>{q.title}</span>
                  <div className={`flex gap-3 ${isCN ? 'text-[13px]' : 'text-[11px]'} font-bold text-gray-500 mt-2`}>
                    <span>{q.hpImpact >= 0 ? '+' : ''}{q.hpImpact}❤️</span>
                    <span>{q.hungerImpact >= 0 ? '+' : ''}{q.hungerImpact}🍗</span>
                  </div>
                </button>
                
                {/* Overlay Controls */}
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setIsEditing(q.id); }} className="w-8 h-8 bg-blue-500 pixel-border text-[12px] text-white flex items-center justify-center">✎</button>
                  <button onClick={(e) => { e.stopPropagation(); moveQuest(idx, 'up'); }} className="w-8 h-8 bg-gray-500 pixel-border text-[12px] text-white flex items-center justify-center">▲</button>
                  <button onClick={(e) => { e.stopPropagation(); moveQuest(idx, 'down'); }} className="w-8 h-8 bg-gray-500 pixel-border text-[12px] text-white flex items-center justify-center">▼</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logs */}
        <div className="bg-indigo-900/95 p-5 pixel-border text-white mb-10 min-h-[120px]">
          <h3 className={`pixel-font ${pixelLabelClass} text-indigo-300 mb-3 uppercase tracking-widest`}>{t.systemLogs}</h3>
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="text-[14px] flex justify-between border-l-3 border-indigo-400 pl-4">
                <span>&gt; {log.message}</span>
                <span className="text-yellow-400 font-bold">{log.impact}</span>
              </div>
            ))}
            {logs.length === 0 && <p className="opacity-30 italic text-[14px]">Ready for adventure...</p>}
          </div>
        </div>

        {/* Editor Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
            <form onSubmit={saveQuest} className="bg-white p-8 pixel-border w-full max-w-sm space-y-6">
              <h2 className={`pixel-font ${isCN ? 'text-[14px]' : 'text-[12px]'} border-b-3 border-black pb-4`}>{t.edit}</h2>
              <input name="title" placeholder="TITLE" required className="w-full p-4 pixel-border text-[16px]" defaultValue={isEditing !== 'new' ? quests.find(q => q.id === isEditing)?.title : ''} />
              <div className="grid grid-cols-3 gap-4">
                <input name="icon" placeholder="Icon" required className="p-4 pixel-border text-[16px]" defaultValue={isEditing !== 'new' ? quests.find(q => q.id === isEditing)?.icon : '⭐'} />
                <input name="hp" type="number" placeholder="HP" required className="p-4 pixel-border text-[16px]" defaultValue={isEditing !== 'new' ? quests.find(q => q.id === isEditing)?.hpImpact : 0} />
                <input name="hunger" type="number" placeholder="Food" required className="p-4 pixel-border text-[16px]" defaultValue={isEditing !== 'new' ? quests.find(q => q.id === isEditing)?.hungerImpact : 0} />
              </div>
              <div className="flex gap-4 pt-3">
                <button type="submit" className="flex-1 bg-green-500 text-white p-4 pixel-border pixel-font text-[12px]">{t.save}</button>
                <button type="button" onClick={() => setIsEditing(null)} className="flex-1 bg-gray-400 text-white p-4 pixel-border pixel-font text-[12px]">{t.cancel}</button>
              </div>
              {isEditing !== 'new' && quests.find(q => q.id === isEditing)?.isCustom && (
                <button type="button" onClick={() => { setQuests(prev => prev.filter(x => x.id !== isEditing)); setIsEditing(null); }} className="w-full bg-red-100 text-red-600 p-3 pixel-border pixel-font text-[12px]">{t.delete}</button>
              )}
            </form>
          </div>
        )}

        {/* Click Feedback Effect */}
        {clickEffect && (
          <div 
            className="fixed pointer-events-none z-[200] text-red-500 font-bold pixel-font text-3xl animate-ping"
            style={{ left: clickEffect.x - 30, top: clickEffect.y - 30 }}
          >
            +HP
          </div>
        )}
      </div>
    );
  };

  const renderCalendar = () => {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const startDay = start.getDay();
    const days = [];
    
    for(let i=0; i<startDay; i++) days.push(null);
    for(let i=1; i<=end.getDate(); i++) days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i));

    const monthName = viewDate.toLocaleString(lang === 'cn' ? 'zh-CN' : lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' });

    const handleMonthClick = () => {
      setIsYearPicker(!isYearPicker);
      playBeep(400);
    };

    const changeYear = (delta: number) => {
      const newDate = new Date(viewDate);
      newDate.setFullYear(viewDate.getFullYear() + delta);
      setViewDate(newDate);
      playBeep(500);
    };

    return (
      <div className={`bg-white/95 p-8 pixel-border min-h-[550px] ${fontSizeClass}`}>
        <div className="flex justify-between items-center mb-8 border-b-5 border-black pb-4">
          <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="pixel-button text-[14px] p-2">{t.prevMonth}</button>
          <div onClick={handleMonthClick} className="cursor-pointer hover:bg-yellow-100 p-2 px-5 pixel-border bg-white shadow-md active:translate-y-1">
            <h2 className={`pixel-font ${isCN ? 'text-[14px]' : 'text-[12px]'} text-center font-bold`}>{monthName.toUpperCase()}</h2>
          </div>
          <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="pixel-button text-[14px] p-2">{t.nextMonth}</button>
        </div>

        {isYearPicker && (
          <div className="mb-8 p-6 bg-yellow-50 pixel-border border-dashed flex justify-around items-center">
            <button onClick={() => changeYear(-1)} className="pixel-button text-[12px]">-1 YEAR</button>
            <span className="pixel-font text-[18px] font-black">{viewDate.getFullYear()}</span>
            <button onClick={() => changeYear(1)} className="pixel-button text-[12px]">+1 YEAR</button>
            <button onClick={() => setIsYearPicker(false)} className="text-[12px] pixel-font text-red-500 ml-4">CLOSE</button>
          </div>
        )}

        <div className="grid grid-cols-7 gap-2 text-center font-black mb-4">
          {['S','M','T','W','T','F','S'].map(d => <div key={d} className="opacity-40 text-[14px]">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="aspect-square opacity-0"></div>;
            const iso = d.toISOString().split('T')[0];
            const entry = history.find(h => h.date === iso);
            const isToday = iso === new Date().toISOString().split('T')[0];
            
            return (
              <div key={iso} className={`aspect-square pixel-border p-1 flex flex-col items-center justify-center relative ${isToday ? 'bg-yellow-100 ring-3 ring-yellow-400' : 'bg-gray-50'}`}>
                <span className="text-[12px] absolute top-1 left-1 font-bold">{d.getDate()}</span>
                {entry ? (
                  <div className="flex flex-col items-center mt-4">
                    <div className="w-3.5 h-3.5 bg-red-500 mb-1 pixel-border border-[1px]" style={{ opacity: Math.max(0.2, entry.hp / 10) }}></div>
                    <div className="w-3.5 h-3.5 bg-orange-400 pixel-border border-[1px]" style={{ opacity: Math.max(0.2, entry.hunger / 10) }}></div>
                  </div>
                ) : <span className="text-[12px] opacity-10">.</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-6 bg-gray-100 pixel-border border-dashed">
          <p className={`pixel-font ${pixelLabelClass} mb-4 font-bold`}>{isCN ? '图例与数值说明' : 'LEGEND & VALUES:'}</p>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 bg-red-500 pixel-border border-black"></div>
              <span className="text-[15px] font-black">{isCN ? '生命值 (HP): 0 - 10 颗红心' : 'HEALTH (HP): 0 - 10 Hearts'}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 bg-orange-400 pixel-border border-black"></div>
              <span className="text-[15px] font-black">{isCN ? '饱食度 (Food): 0 - 10 个鸡腿' : 'FOOD (HUNGER): 0 - 10 Drumsticks'}</span>
            </div>
          </div>
          <p className="mt-4 text-[12px] opacity-60 italic">{isCN ? '颜色深浅代表数值高低 (颜色越深数值越高)' : 'Opacity indicates the value (Darker = Higher)'}</p>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className={`bg-white p-10 pixel-border space-y-10 ${fontSizeClass}`}>
      <h2 className={`pixel-font ${isCN ? 'text-[18px]' : 'text-[14px]'} border-b-3 border-black pb-4`}>{t.settings}</h2>
      
      <div className="space-y-4">
        <p className={`pixel-font ${pixelLabelClass} opacity-60`}>{t.language}</p>
        <div className="grid grid-cols-3 gap-4">
          {(['en', 'cn', 'fr'] as Language[]).map(l => (
            <button key={l} onClick={() => { setLang(l); playBeep(); }} className={`p-4 pixel-border pixel-font ${isCN ? 'text-[12px]' : 'text-[10px]'} ${lang === l ? 'bg-blue-500 text-white' : 'bg-white'}`}>
              {l === 'cn' ? '中文' : l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <p className={`pixel-font ${pixelLabelClass} opacity-60`}>{t.fontSize}</p>
        <div className="grid grid-cols-3 gap-4">
          {(['small', 'medium', 'large'] as FontSize[]).map(f => (
            <button key={f} onClick={() => { setFontSize(f); playBeep(); }} className={`p-4 pixel-border pixel-font ${isCN ? 'text-[12px]' : 'text-[10px]'} ${fontSize === f ? 'bg-indigo-500 text-white' : 'bg-white'}`}>
              {f === 'small' ? (isCN ? '小' : 'S') : f === 'large' ? (isCN ? '大' : 'L') : (isCN ? '中' : 'M')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-5 bg-gray-50 pixel-border">
        <span className={`pixel-font ${pixelLabelClass}`}>{t.sound}</span>
        <button onClick={() => { setSfx(!sfx); playBeep(); }} className={`px-8 py-3 pixel-border pixel-font ${isCN ? 'text-[12px]' : 'text-[10px]'} ${sfx ? 'bg-green-400 text-white' : 'bg-red-400 text-white'}`}>
          {sfx ? t.on : t.off}
        </button>
      </div>

      <div className="pt-12">
        <button onClick={() => { if(confirm('Erase all adventure data?')) { localStorage.clear(); location.reload(); } }} className={`w-full p-4 bg-red-600 text-white pixel-border pixel-font ${isCN ? 'text-[14px]' : 'text-[10px]'} hover:bg-red-700`}>FACTORY RESET</button>
      </div>
    </div>
  );

  return (
    <Background>
      <div className="pb-32 pt-6">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'calendar' && renderCalendar()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {/* NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t-5 border-black p-3 flex justify-around z-[100] shadow-[0_-8px_20px_rgba(0,0,0,0.3)]">
        <button onClick={() => { setActiveTab('home'); playBeep(220); }} className={`flex flex-col items-center py-4 px-8 rounded-sm active:translate-y-1 transition-all ${activeTab === 'home' ? 'bg-yellow-100 border-3 border-black' : 'opacity-40'}`}>
          <span className="text-3xl">🏠</span>
          <span className={`pixel-font ${isCN ? 'text-[12px]' : 'text-[9px]'} mt-1 font-bold`}>{t.home}</span>
        </button>
        <button onClick={() => { setActiveTab('calendar'); playBeep(220); }} className={`flex flex-col items-center py-4 px-8 rounded-sm active:translate-y-1 transition-all ${activeTab === 'calendar' ? 'bg-yellow-100 border-3 border-black' : 'opacity-40'}`}>
          <span className="text-3xl">📅</span>
          <span className={`pixel-font ${isCN ? 'text-[12px]' : 'text-[9px]'} mt-1 font-bold`}>{t.calendar}</span>
        </button>
        <button onClick={() => { setActiveTab('settings'); playBeep(220); }} className={`flex flex-col items-center py-4 px-8 rounded-sm active:translate-y-1 transition-all ${activeTab === 'settings' ? 'bg-yellow-100 border-3 border-black' : 'opacity-40'}`}>
          <span className="text-3xl">⚙️</span>
          <span className={`pixel-font ${isCN ? 'text-[12px]' : 'text-[9px]'} mt-1 font-bold`}>{t.settings}</span>
        </button>
      </nav>
    </Background>
  );
};

export default App;
