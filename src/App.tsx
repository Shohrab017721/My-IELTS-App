/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  PenTool, 
  Mic2, 
  Headphones, 
  BrainCircuit, 
  ChevronRight, 
  Trophy, 
  TrendingUp,
  CheckCircle2,
  Clock,
  Settings,
  Sparkles,
  Loader2,
  ArrowLeft,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { SkillType, IELTSBand, UserState, Exercise, AssessmentResult } from './types';
import { geminiService } from './services/gemini';

const DEFAULT_USER_STATE: UserState = {
  hasOnboarded: false,
  currentBand: 1.0,
  interests: [],
  completedTasks: [],
  dailyProgress: {}
};

export default function App() {
  const [userState, setUserState] = useState<UserState>(() => {
    const saved = localStorage.getItem('ielts-coach-state');
    return saved ? JSON.parse(saved) : DEFAULT_USER_STATE;
  });

  const [currentView, setCurrentView] = useState<'welcome' | 'assessment' | 'feedback' | 'interests' | 'dashboard' | 'exercise'>('welcome');
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [activeFeedback, setActiveFeedback] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Persist state
  useEffect(() => {
    localStorage.setItem('ielts-coach-state', JSON.stringify(userState));
    if (userState.hasOnboarded && currentView === 'welcome') {
      setCurrentView('dashboard');
    }
  }, [userState]);

  const handleStartOnboarding = async () => {
    setLoading(true);
    try {
      const q = await geminiService.generateAssessment();
      setActiveExercise(q[0]);
      setCurrentView('assessment');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishInterests = () => {
    setUserState(prev => ({ ...prev, interests: selectedInterests, hasOnboarded: true }));
    setCurrentView('dashboard');
  };

  const handleStartExercise = async (type: SkillType) => {
    setLoading(true);
    try {
      const exercise = await geminiService.generateDailyExercise(type, userState.currentBand, userState.interests);
      setActiveExercise(exercise);
      setUserInput('');
      setCurrentView('exercise');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!activeExercise || !userInput.trim()) return;
    setLoading(true);
    try {
      const feedback = await geminiService.gradeResponse(activeExercise, userInput);
      setActiveFeedback(feedback);
      
      // Update Level - Adaptive Logic
      // If score is significantly higher than current band, push them up
      const newBand = userState.currentBand + (feedback.score > userState.currentBand ? 0.5 : -0.1);
      const clampedBand = Math.round(Math.max(1, Math.min(9, newBand)) * 10) / 10;

      setUserState(prev => ({
        ...prev,
        currentBand: clampedBand,
        completedTasks: [...prev.completedTasks, activeExercise.id],
        dailyProgress: {
          ...prev.dailyProgress,
          [new Date().toISOString().split('T')[0]]: [
            ...(prev.dailyProgress[new Date().toISOString().split('T')[0]] || []),
            activeExercise.type
          ]
        }
      }));

      setCurrentView('feedback');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: SkillType) => {
    switch (type) {
      case SkillType.READING: return <BookOpen className="w-5 h-5" />;
      case SkillType.WRITING: return <PenTool className="w-5 h-5" />;
      case SkillType.SPEAKING: return <Mic2 className="w-5 h-5" />;
      case SkillType.LISTENING: return <Headphones className="w-5 h-5" />;
      default: return <BrainCircuit className="w-5 h-5" />;
    }
  };

  if (loading && currentView !== 'exercise' && currentView !== 'assessment') {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center font-sans">
        <div className="text-center group">
          <Loader2 className="w-12 h-12 text-[#5A5A40] animate-spin mx-auto mb-4" />
          <p className="text-[#5A5A40] font-medium tracking-tight">আইইএলটিএস কোচ আপনার অনুশীলনের উপকরণগুলো প্রস্তুত করছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] font-sans text-[#141414] selection:bg-[#5A5A40] selection:text-white">
      {/* Welcome View */}
      {currentView === 'welcome' && (
        <div className="max-w-2xl mx-auto pt-20 px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-[32px] shadow-sm border border-black/5 text-center"
          >
            <h1 className="text-5xl font-serif font-black mb-10 uppercase">ANIK~MAMA</h1>
            <p className="text-black/60 mb-8 leading-relaxed font-sans">
              আমি আপনার ব্যক্তিগত ইংরেজি শিক্ষার কোচ। আপনার দক্ষতা পরীক্ষা করতে এবং সে অনুযায়ী অনুশীলনের পরিকল্পনা করতে নিচের বাটনে ক্লিক করুন। 📊
            </p>

            <button
              onClick={handleStartOnboarding}
              className="w-full bg-[#141414] text-white py-4 rounded-xl font-medium hover:bg-black/90 transition-all flex items-center justify-center gap-2 group"
            >
              প্রাথমিক অ্যাসেসমেন্ট শুরু করুন
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      )}

      {/* Interests View (Step 3) */}
      {currentView === 'interests' && (
        <div className="max-w-2xl mx-auto pt-20 px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-[32px] shadow-sm border border-black/5"
          >
            <h2 className="text-3xl font-serif font-black mb-4">🎯 আপনার আগ্রহের বিষয়</h2>
            <p className="text-black/60 mb-8 leading-relaxed font-sans">
              আপনার পছন্দের বিষয়গুলো আমাদের জানান যাতে আমি সেই টপিকগুলো ব্যবহার করে আপনার প্র্যাকটিস লুপ তৈরি করতে পারি। ⚡
            </p>

            <div className="space-y-6">
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-black/40 block mb-3">
                  বিষয় নির্বাচন করুন
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { en: 'Technology', bn: 'প্রযুক্তি' },
                    { en: 'Business', bn: 'ব্যবসা' },
                    { en: 'Art', bn: 'শিল্পকলা' },
                    { en: 'Environment', bn: 'পরিবেশ' },
                    { en: 'Psychology', bn: 'মনোবিজ্ঞান' },
                    { en: 'Education', bn: 'শিক্ষা' },
                    { en: 'Travel', bn: 'ভ্রমণ' }
                  ].map(topic => (
                    <button
                      key={topic.en}
                      onClick={() => setSelectedInterests(prev => 
                        prev.includes(topic.en) ? prev.filter(t => t !== topic.en) : [...prev, topic.en]
                      )}
                      className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border ${
                        selectedInterests.includes(topic.en) 
                        ? 'bg-[#5A5A40] text-white border-transparent' 
                        : 'bg-white border-black/10 hover:border-black/20 text-black/60'
                      }`}
                    >
                      {topic.bn}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleFinishInterests}
                disabled={selectedInterests.length === 0}
                className="w-full bg-[#141414] text-white py-4 rounded-xl font-medium hover:bg-black/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                ড্যাশবোর্ডে যান
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dashboard View */}
      {currentView === 'dashboard' && (
        <div className="max-w-5xl mx-auto pt-10 px-6 pb-20">
          <div className="flex justify-center mb-16">
            <h1 className="text-5xl font-serif font-black"><b>ANIK~MAMA</b></h1>
          </div>
          <header className="flex flex-col items-center text-center mb-12 border-b border-black/5 pb-10">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-black/30 mb-2">MAMA DASHBOARD</p>
            <h1 className="text-6xl font-serif font-black flex items-center gap-4 mb-2">
              ব্যান্ড {userState.currentBand} 🎯
            </h1>
            <p className="text-sm text-[#5A5A40] font-bold mb-8">⚡ লেভেল: একদম প্রাথমিক (Absolute Beginner)</p>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-black/30 mb-1">সম্পন্ন কাজ</p>
                <p className="text-3xl font-black">{userState.completedTasks.length}</p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-black/30" />
                <h2 className="text-xs uppercase font-bold tracking-[0.2em] text-black/40">আজকের লুপ</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { type: SkillType.READING, bn: '📚 রিডিং (Reading)' },
                  { type: SkillType.WRITING, bn: '✍️ রাইটিং (Writing)' },
                  { type: SkillType.SPEAKING, bn: '🗣️ স্পিকিং (Speaking)' },
                  { type: SkillType.LISTENING, bn: '🎧 লিসেনিং (Listening)' },
                  { type: SkillType.VOCABULARY, bn: '🧠 ভোকাবুলারি (Vocabulary)' },
                  { type: SkillType.GRAMMAR, bn: '⚙️ গ্রামার (Grammar)' },
                  { type: SkillType.SENTENCE_FORMATION, bn: '🏗️ বাক্য গঠন (Sentence Formation)' }
                ].map((item) => {
                  const today = new Date().toISOString().split('T')[0];
                  const completed = userState.dailyProgress[today]?.includes(item.type);

                  return (
                    <button
                      key={item.type}
                      onClick={() => !completed && handleStartExercise(item.type)}
                      disabled={completed}
                      className={`p-6 rounded-2xl border text-left transition-all group relative overflow-hidden ${
                        completed 
                        ? 'bg-white border-black/5 opacity-50 cursor-default' 
                        : 'bg-white border-black/5 hover:border-[#5A5A40]/30 hover:shadow-xl hover:shadow-[#5A5A40]/5'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${completed ? 'bg-green-50 text-green-600' : 'bg-[#F5F5F0] text-[#5A5A40]'}`}>
                          {completed ? <CheckCircle2 className="w-5 h-5" /> : getIcon(item.type)}
                        </div>
                        {!completed && (
                          <div className="bg-[#5A5A40]/10 text-[#5A5A40] text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                            অনুশীলন
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium text-lg mb-1">{item.bn}</h3>
                      <p className="text-xs text-black/40">
                        {completed ? 'নিখুঁতভাবে সম্পন্ন' : `টার্গেট ব্যান্ড ${userState.currentBand + 0.5}`}
                      </p>
                      
                      {!completed && (
                        <div className="absolute bottom-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                          <ChevronRight className="w-5 h-5 text-[#5A5A40]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-[#141414] text-white p-8 rounded-[32px] relative overflow-hidden group">
                <TrendingUp className="w-12 h-12 text-white/10 absolute -top-2 -right-2 transform rotate-12 group-hover:scale-110 transition-transform" />
                <h3 className="text-sm uppercase tracking-widest font-bold text-white/50 mb-4">সাফল্যের রোডম্যাপ</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-white/40">পরবর্তী মাইলফলক</span>
                    <span className="text-xl font-semibold">ব্যান্ড {(userState.currentBand + 1).toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#5A5A40] h-full transition-all duration-1000" 
                      style={{ width: `${(userState.currentBand / 9) * 100}%` }} 
                    />
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed uppercase font-bold tracking-widest">
                    আপনার দক্ষতার সাথে সামঞ্জস্য রেখে কাঠিন্য স্বয়ংক্রিয়ভাবে পরিবর্তিত হচ্ছে।
                  </p>
                </div>
              </div>

              <div className="bg-[#5A5A40]/10 p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-[#5A5A40]" />
                  <h4 className="text-xs uppercase font-bold tracking-widest text-[#5A5A40]">কোচের পরামর্শ</h4>
                </div>
                <p className="text-sm leading-relaxed text-[#5A5A40]/80">
                   "আপনার আগ্রহের বিষয়গুলোর সাথে নিয়মিত অনুশীলন ভোকাবুলারি বাড়ানোর সহজতম উপায়।"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercise View (Used for Assessment Step 1 and Phase 4) */}
      {(currentView === 'exercise' || currentView === 'assessment') && activeExercise && (
        <div className="max-w-4xl mx-auto pt-10 px-6 pb-20">
          {!userState.hasOnboarded && (
            <div className="mb-6 p-4 bg-[#5A5A40]/10 rounded-xl text-[#5A5A40] text-sm font-medium">
              ধাপ ১: প্রাথমিক অ্যাসেসমেন্ট চলছে (Assessment Step 1)
            </div>
          )}
          {userState.hasOnboarded && (
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-2 text-black/40 hover:text-black mb-8 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              ড্যাশবোর্ডে ফিরে যান
            </button>
          )}

          <div className="bg-white rounded-[32px] shadow-sm border border-black/5 overflow-hidden">
            <div className="bg-[#141414] p-8 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1">{activeExercise.type}</p>
                <h2 className="text-2xl font-serif">{activeExercise.title}</h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-white/40 mb-1">টার্গেট ব্যান্ড</p>
                <p className="text-2xl font-medium">{activeExercise.difficulty}</p>
              </div>
            </div>

            <div className="p-10 space-y-8">
              <div className="bg-[#F5F5F0] p-6 rounded-2xl border border-black/5">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white rounded-lg text-black/40">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase font-bold tracking-widest text-black/40 mb-2">কোচ ড্যাশবোর্ড (Coach Dashboard)</h4>
                    <div className="leading-relaxed text-black/70 prose prose-sm max-w-none prose-headings:font-bold prose-strong:font-bold prose-hr:border-black/10">
                      <Markdown rehypePlugins={[rehypeRaw]}>{activeExercise.instructions}</Markdown>
                    </div>
                  </div>
                </div>
              </div>

              <div className="prose prose-slate max-w-none prose-headings:font-bold prose-strong:font-bold">
                <h4 className="text-xs uppercase font-bold tracking-widest text-black/40 mb-4">অনুশীলন বিষয়বস্তু (English)</h4>
                <div className="bg-white p-8 rounded-2xl border border-black/5 whitespace-pre-wrap leading-relaxed text-lg text-black/80 font-sans prose prose-lg max-w-none prose-strong:font-bold">
                  <Markdown rehypePlugins={[rehypeRaw]}>{activeExercise.content}</Markdown>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs uppercase font-bold tracking-widest text-black/40">আপনার উত্তর</label>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="এখানে আপনার উত্তর টাইপ করুন..."
                  className="w-full h-48 p-6 rounded-2xl border border-black/10 focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] outline-none transition-all resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSubmitResponse}
                  disabled={loading || !userInput.trim()}
                  className="bg-[#5A5A40] text-white px-8 py-4 rounded-xl font-medium hover:bg-[#4A4A30] transition-all flex items-center gap-2 group disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'মূল্যায়নের জন্য জমা দিন'}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback View */}
      <AnimatePresence>
        {currentView === 'feedback' && activeFeedback && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#F5F5F0] max-w-2xl w-full rounded-[40px] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-[#141414] p-10 text-white text-center relative overflow-hidden">
                <Trophy className="w-20 h-20 text-white/5 absolute -top-4 -left-4 transform -rotate-12" />
                {!userState.hasOnboarded && <p className="text-xs uppercase tracking-[0.3em] font-bold text-white/40 mb-3">ধাপ ২: লেভেল এস্টিমেশন (Level Estimation)</p>}
                {userState.hasOnboarded && <p className="text-xs uppercase tracking-[0.3em] font-bold text-white/40 mb-3">মূল্যায়ন ফলাফল</p>}
                <h2 className="text-7xl font-serif font-black mb-2">{activeFeedback.score.toFixed(1)}</h2>
                <div className="flex justify-center gap-1">
                  {[...Array(9)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-4 h-1 rounded-full ${i < activeFeedback.score ? 'bg-[#5A5A40]' : 'bg-white/10'}`} 
                    />
                  ))}
                </div>
              </div>

              <div className="p-10 space-y-8">
                <div>
                  <div className="text-black/70 leading-relaxed font-serif text-lg prose prose-neutral max-w-none prose-headings:font-bold prose-strong:font-bold prose-hr:border-black/5">
                    <Markdown rehypePlugins={[rehypeRaw]}>{activeFeedback.feedback}</Markdown>
                  </div>
                </div>

                {activeFeedback.corrections && activeFeedback.corrections.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-black/5">
                    <h4 className="text-xs uppercase font-bold tracking-widest text-black/40 mb-4">শুদ্ধিকরণ ও উন্নতি</h4>
                    <ul className="space-y-3">
                      {activeFeedback.corrections.map((c, i) => (
                        <li key={i} className="flex gap-3 text-sm text-black/60">
                          <span className="text-[#5A5A40] font-bold">0{i+1}.</span>
                          <div className="prose prose-sm max-w-none prose-headings:font-bold prose-strong:font-bold">
                            <Markdown>{c}</Markdown>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeFeedback.vocabularySuggestions && (
                  <div>
                    <h4 className="text-xs uppercase font-bold tracking-widest text-black/40 mb-4">ভোকাবুলারি শব্দকোষ</h4>
                    <div className="flex flex-wrap gap-2">
                      {activeFeedback.vocabularySuggestions.map(v => (
                        <span key={v} className="bg-white border border-black/5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#5A5A40]">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (userState.hasOnboarded) {
                      setCurrentView('dashboard');
                    } else {
                      setCurrentView('interests');
                    }
                  }}
                  className="w-full bg-[#141414] text-white py-4 rounded-xl font-medium hover:bg-black/90 transition-all font-sans"
                >
                  {userState.hasOnboarded ? 'ড্যাশবোর্ডে ফিরে যান' : 'পরবর্তী ধাপ (আগ্রহ নির্বাচন) এ যান'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
