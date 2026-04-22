/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Sparkles, 
  Zap, 
  FileText, 
  Lightbulb, 
  CheckCircle2, 
  Brain, 
  FileSignature, 
  History, 
  ShieldCheck, 
  ChevronDown, 
  UploadCloud, 
  Loader2, 
  Wand2, 
  Star, 
  Download, 
  Copy, 
  RefreshCw, 
  Bell, 
  LayoutGrid, 
  MousePointer2, 
  Settings, 
  PlusCircle, 
  HelpCircle, 
  LogOut,
  CheckCircle,
  Github,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils.ts';

// Custom Genie Logo Component (Lamp + Document)
const GenieLogo = ({ className, fill = "white" }: { className?: string, fill?: string }) => (
  <svg viewBox="0 0 100 100" className={cn("w-8 h-8", className)} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Sparkles */}
    <path d="M75 10L77 15L82 17L77 19L75 24L73 19L68 17L73 15L75 10Z" fill={fill} />
    <path d="M60 5L61.5 8L64.5 9.5L61.5 11L60 14L58.5 11L55.5 9.5L58.5 8L60 5Z" fill={fill} />
    <path d="M85 25L86 28L89 29L86 30L85 33L84 30L81 29L84 28L85 25Z" fill={fill} />
    
    {/* Smoke/Genie Swirl */}
    <path d="M72 40C72 40 68 30 72 25C76 20 70 15 72 12" stroke={fill} strokeWidth="2" strokeLinecap="round" />
    
    {/* Magic Lamp Body */}
    <path d="M25 55C25 55 20 50 15 50C10 50 10 65 15 65C20 65 25 60 25 60L23 65C23 65 30 75 50 75C70 75 77 65 77 65L82 60C82 60 85 58 82 55C79 52 70 55 70 55L55 45L45 45L25 55Z" fill={fill} />
    <path d="M40 45C40 40 60 40 60 45" stroke={fill} strokeWidth="2" />
    <circle cx="50" cy="40" r="3" fill={fill} />
    
    {/* Base of Lamp */}
    <path d="M40 75L35 85H65L60 75" fill={fill} />

    {/* Subtile Document lines behind lamp to suggest the "paper" aspect */}
    <rect x="30" y="50" width="40" height="40" rx="4" fill={fill} fillOpacity="0.1" />
  </svg>
);

// Reusable Components
const GlassCard = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn("glass-card rounded-3xl p-6", className)} {...props}>
    {children}
  </div>
);

const FeatureCard = ({ icon: Icon, title, description, colorClass, children, ...props }: { icon: any, title: string, description: string, colorClass: string, children?: React.ReactNode; [key: string]: any }) => (
  <GlassCard className="flex flex-col group h-full" {...props}>
    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", colorClass)}>
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-slate-600 text-sm leading-relaxed mb-6">{description}</p>
    {children}
  </GlassCard>
);

export default function App() {
  const [view, setView] = useState<'landing' | 'generator'>('landing');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkServer = async () => {
      try {
        const resp = await fetch('/api/health');
        if (resp.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      } catch (err) {
        setServerStatus('offline');
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);
  const [fileName, setFileName] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    jobDescription: ''
  });

  // Result State
  const [result, setResult] = useState<{
    letter: string;
    matchScore: number;
    advice: string;
    highlights: string[];
    extractedSkills: string[];
  } | null>(null);

  const [aiInstance, setAiInstance] = useState<any>(null);

  useEffect(() => {
    // Initialize AI once
    const key = (process.env as any).GEMINI_API_KEY;
    if (key) {
      setAiInstance(new GoogleGenAI({ apiKey: key }));
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.text) {
        setResumeText(data.text);
      } else if (data.error) {
        alert(`PDF Parsing Error: ${data.error}. ${data.details || ''}`);
      }
    } catch (error) {
      console.error('Failed to parse resume:', error);
      alert('Failed to connect to the server for PDF parsing. Please check if the server is running.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSmartExtract = async () => {
    if (!formData.jobDescription) {
      alert('Please paste a job description first');
      return;
    }

    if (!aiInstance) {
      alert('AI system is initializing or API key is missing.');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `
        Summarize the following job description into 3 bullet points of core requirements. 
        Focus on the most important skills and experience required.
        Job Description: ${formData.jobDescription}
        
        Return ONLY the 3 bullet points.
      `;
      const response = await aiInstance.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      const text = response.text;
      if (text) {
        setFormData(prev => ({ ...prev, jobDescription: text.trim() }));
      }
    } catch (error) {
      console.error('Smart extract failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.name || !formData.role || !formData.company) {
      alert('Please fill in Name, Role, and Company');
      return;
    }
    
    if (!resumeText) {
      const proceed = confirm('No resume has been uploaded/parsed yet. The AI will generate a generic letter based only on your Name and Role. Continue?');
      if (!proceed) return;
    }

    if (!aiInstance) {
      alert('AI system is initializing or API key is missing. Please check your environment variables.');
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setIsCopied(false);

    try {
      const prompt = `
        ### ROLE
        You are an expert Career Coach and Professional Resume Writer. 
        Your task is to write a highly personalized cover letter based ONLY on the provided Resume Content and the Job Description.

        ### INPUT DATA
        - Candidate Name: ${formData.name}
        - Target Role: ${formData.role}
        - Target Company: ${formData.company}
        - Job Description: "${formData.jobDescription || 'Standard requirements for ' + formData.role}"
        - Resume Content: "${resumeText || 'NOT PROVIDED (User did not upload a resume)'}"

        ### CRITICAL CONSTRAINTS:
        1. **STRICT EVIDENCE-BASED WRITING:** You must ONLY use skills, tools, and accomplishments explicitly written in the "Resume Content". 
        2. **ZERO HALLUCINATIONS:** If a skill (e.g., Kubernetes) is NOT in the Resume Content, you are FORBIDDEN from mentioning it.
        3. **FORMATTING:** Professional business letter. DO NOT include a date. You MUST use exactly TWO newline characters (\n\n) between EVERY paragraph (Salutation, Body Paragraphs, and Closing). DO NOT return a single block of text.
        4. **SPACING:** Ensure the letter has a clear structure: Salutation, 3-4 body paragraphs, and a Closing.
        5. **WORD COUNT:** The cover letter MUST be between 250 and 400 words.
        6. **SKILL EXTRACTION:** Extract at least 8-12 core technical and soft skills from the Job Description that the candidate possesses.
      `;

      const response = await aiInstance.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              letter: { type: Type.STRING },
              matchScore: { type: Type.NUMBER },
              advice: { type: Type.STRING },
              highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
              extractedSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["letter", "matchScore", "advice", "highlights", "extractedSkills"]
          }
        }
      });
      
      const text = response.text;
      
      if (!text) throw new Error('No response from AI');
      
      const parsedData = JSON.parse(text);
      setResult(parsedData);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('AI Generation failed. This might be due to a missing API key or complex input. Please ensure your GEMINI_API_KEY is set.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.letter) {
      navigator.clipboard.writeText(result.letter);
      setIsCopied(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

const Navbar = ({ onNavigate }: { onNavigate: (id: string) => void }) => (
    <nav className="fixed top-4 md:top-8 left-1/2 -translate-x-1/2 w-full max-w-5xl z-50 px-4 md:px-6 flex justify-between items-center bg-transparent pointer-events-none">
      {/* Brand & Links Pill */}
      <div className="nav-pill-main pointer-events-auto h-10 md:h-12 px-4 md:px-6 gap-4 md:gap-8 overflow-hidden">
        <div 
          className="flex items-center gap-2 md:gap-3 cursor-pointer md:pr-6 md:border-r border-white/20" 
          onClick={() => { setView('landing'); setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        >
          <GenieLogo className="w-5 h-5 md:w-7 md:h-7" />
          <span className="text-sm md:text-lg font-extrabold tracking-tighter text-white">CoverGenie</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'About', id: 'about' },
            { label: 'Features', id: 'features' },
            { label: 'How It Works', id: 'how-it-works' },
            { label: 'FAQ', id: 'faq' }
          ].map((item) => (
            <button 
              key={item.id} 
              className="nav-link-pill" 
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action/CTA Pill */}
      <div className="nav-pill-actions pointer-events-auto h-10 md:h-12">
        <button 
          onClick={() => onNavigate('generator')}
          className="action-pill bg-white/10 hover:bg-white/20 h-8 md:h-10 px-4 md:px-6 text-[10px] md:text-sm"
        >
          Generate Now
        </button>
      </div>
    </nav>
  );

  const scrollToSection = (id: string) => {
    if (id === 'generator') {
      setView('generator');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (view !== 'landing') {
      setView('landing');
      // Wait for re-render then scroll
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen mesh-gradient mesh-grid flex flex-col items-center">
        <Navbar onNavigate={scrollToSection} />

        {/* Hero Section */}
        <section className="relative z-10 pt-40 md:pt-64 pb-16 md:pb-24 px-6 flex flex-col items-center justify-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <h1 className="text-5xl md:text-8xl lg:text-[140px] font-display font-medium text-black mb-6 md:mb-8 leading-[0.9] md:leading-[0.8] tracking-[-0.02em] md:tracking-[-0.05em] uppercase">
              cover<br/>intelligently
            </h1>
            <p className="text-base md:text-xl text-slate-800 max-w-2xl mx-auto mb-8 md:mb-12 font-medium leading-relaxed opacity-80">
              Personalized, impact-driven cover letters generated by advanced AI. Land your dream job with narratives that resonate.
            </p>
            
            <div className="flex justify-center mt-4">
              <button 
                onClick={() => setView('generator')}
                className="btn-black gap-3 py-4 md:py-5 px-8 md:px-12 text-base md:text-xl group shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" />
                Create a Cover Letter
              </button>
            </div>
          </motion.div>
        </section>

        {/* Logo cloud */}
        <div className="w-full max-w-5xl mx-auto px-6 mt-8 md:mt-12 mb-20 md:mb-32 opacity-30 grayscale flex flex-wrap justify-center gap-8 md:gap-16 items-center">
           {['AXA', 'HISCOX', 'ZURICH', 'RSA', 'MARL'].map(brand => (
             <span key={brand} className="text-xl md:text-2xl font-black tracking-[0.2em] text-black">{brand}</span>
           ))}
        </div>

        {/* About Section */}
        <section id="about" className="w-full py-20 md:py-32 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center border-t border-black/5">
          <div>
            <h2 className="text-4xl md:text-6xl font-display font-medium text-black mb-6 md:mb-8 leading-[1.1] md:leading-[0.9]">Transforming your career narrative.</h2>
            <p className="text-base md:text-lg text-slate-600 font-medium leading-relaxed">
              CoverGenie isn't just an AI writer. It's a strategic career tool that analyzes job requirements and connects them to your unique background, creating a narrative that recruiters actually want to read.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-palette-lime opacity-20 blur-[100px]" />
            <GlassCard className="relative z-10 p-12 rounded-[3rem] border-white/40 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center">
                  <Brain className="text-white w-6 h-6" />
                </div>
                <span className="font-bold uppercase tracking-widest text-xs">AI Insight</span>
              </div>
              <div className="space-y-4">
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '80%' }} transition={{ duration: 2, delay: 0.5 }} className="h-full bg-palette-lime" />
                </div>
                <div className="h-4 w-3/4 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 2, delay: 0.7 }} className="h-full bg-palette-blue" />
                </div>
                <div className="h-4 w-5/6 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '90%' }} transition={{ duration: 2, delay: 0.9 }} className="h-full bg-palette-mint" />
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-32 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <FeatureCard 
               icon={Zap} 
               title="Smart Extraction" 
               description="Automatically parse complex job descriptions into core requirements."
               colorClass="bg-palette-lime"
             />
             <FeatureCard 
               icon={ShieldCheck} 
               title="Zero Hallucination" 
               description="We strictly use facts from your resume. No fake skills, no false claims."
               colorClass="bg-palette-blue"
             />
             <FeatureCard 
               icon={FileSignature} 
               title="Expert Formatting" 
               description="Perfectly structured business letters that follow industry standards."
               colorClass="bg-palette-mint"
             />
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-20 md:py-32 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-24">
             <h2 className="text-5xl md:text-7xl font-display font-medium text-black mb-6 leading-[1.1] md:leading-none tracking-tight">The coverage you<br className="hidden md:block"/>need for less</h2>
          </div>
          
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] bg-black/5 hidden md:block" />
            
            <div className="space-y-32">
              {[
                { id: '01', title: 'Connect Resume', desc: 'Securely upload your experience. Our AI maps every skill and project details.', icon: UploadCloud },
                { id: '02', title: 'Target Opportunity', desc: 'Paste the job description. We identify the "silent" needs of the employer.', icon: Zap },
                { id: '03', title: 'Generate & Polish', desc: 'Get a precision-tailored letter in seconds. Refine and copy with one click.', icon: Sparkles }
              ].map((step, i) => (
                <div key={step.id} className={cn("relative flex flex-col md:flex-row items-center gap-12", i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse")}>
                  {/* Step Bubble */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold z-10 hidden md:flex">
                    {step.id}
                  </div>
                  
                  <div className="w-full md:w-1/2 flex justify-center">
                    <GlassCard className="p-10 rounded-[3rem] w-full max-w-sm hover:scale-105 transition-transform">
                      <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center mb-6">
                        <step.icon className="w-6 h-6 text-black" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                      <p className="text-slate-500 leading-relaxed font-medium">{step.desc}</p>
                    </GlassCard>
                  </div>
                  <div className="w-full md:w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full py-20 md:py-32 px-6 max-w-3xl mx-auto border-t border-black/5">
          <h2 className="text-4xl md:text-6xl font-display font-medium text-black mb-12 md:mb-16 tracking-tight text-center">FAQs</h2>
          <div className="space-y-4">
            {[
              { q: 'Is my data secure?', a: 'Yes, we do not store your resumes permanently. Parsing happens in-memory and is discarded after your session ends.' },
              { q: 'Does it use my real experience?', a: 'Strictly. We have a "zero-hallucination" policy. If it is not on your resume, it will not be in the letter.' },
              { q: 'Can I regenerate the letter?', a: 'As many times as you like. Each generation uses strategic variation to find the best tone.' }
            ].map((faq, i) => (
              <GlassCard key={i} className="p-8 rounded-[2rem] hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-bold">{faq.q}</h4>
                  <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-black transition-colors" />
                </div>
                <p className="mt-4 text-slate-500 font-medium hidden group-hover:block">{faq.a}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Giant Footer Watermark */}
        <footer className="w-full py-24 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-12 relative z-10">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <Sparkles className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-extrabold tracking-tighter">CoverGenie</span>
              </div>
              <p className="max-w-sm text-slate-400 text-xs leading-relaxed">
                <span className="font-bold text-black opacity-60">CoverGenie</span> is an AI-powered tool that creates personalized cover letters by analyzing your resume, job description, and skills. It helps you generate professional, tailored content quickly and efficiently.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-16 text-sm font-bold">
              <div className="flex flex-col gap-4">
                <span className="text-slate-300 uppercase tracking-widest text-[10px]">Links</span>
                {['About', 'FAQs', 'Contact', 'Team'].map(l => <a key={l} href="#" className="hover:text-slate-500">{l}</a>)}
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-slate-300 uppercase tracking-widest text-[10px]">Legal</span>
                {['Privacy', 'Terms', 'Complaints'].map(l => <a key={l} href="#" className="hover:text-slate-500">{l}</a>)}
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-slate-300 uppercase tracking-widest text-[10px]">Contact</span>
                <div className="flex flex-col gap-2">
                  <a href="mailto:22d41a7251@gmail.com" className="flex items-center gap-2 hover:text-slate-500 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-900 font-bold">22d41a7251@gmail.com</span>
                  </a>
                  <a href="https://github.com/Sadashivk47" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-slate-500 transition-colors">
                    <Github className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-900 font-bold">Sadashivk47</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="footer-watermark mt-20 opacity-5 flex items-center justify-center pointer-events-none">
            <span>Cover</span>
            <GenieLogo className="w-[18vw] h-[18vw] -ml-[2vw]" fill="black" />
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient mesh-grid flex flex-col">
      <Navbar onNavigate={scrollToSection} />
      
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-xl"
          >
            <div className="glass-card p-12 flex flex-col items-center text-center max-w-sm rounded-[3rem]">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-black animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 bg-black rounded-sm rotate-45 animate-pulse flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <h3 className="text-3xl font-display font-medium text-black mb-3 leading-tight tracking-tight">Generating magic...</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Analyzing requirements and aligning your story with the role.
              </p>
              <div className="mt-8 flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-2.5 h-2.5 rounded-full bg-black"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full pt-20 md:pt-24 pb-12 px-4 md:px-6 relative z-10">
        <header className="mb-6 text-center px-4">
          <h2 className="text-3xl md:text-4xl font-display font-medium text-black tracking-tighter mb-2 leading-tight">Create your letter</h2>
          <p className="text-slate-500 max-w-xl mx-auto text-xs md:text-sm font-medium">Precision-tailored narratives powered by generative intelligence.</p>
        </header>

        <AnimatePresence>
          {showToast && (
            <motion.div 
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="fixed top-24 left-1/2 z-[150] bg-black text-white px-6 py-3 rounded-full font-bold text-[10px] md:text-xs shadow-2xl flex items-center gap-3 w-max max-w-[90vw]"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Copied to clipboard</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-6 md:gap-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
            {/* Left: Input */}
            <section className="flex flex-col">
              <GlassCard className="p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] flex flex-col overflow-hidden">
                <h3 className="text-lg md:text-xl font-bold mb-6 md:mb-8 flex items-center gap-3">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-black flex items-center justify-center">
                    <Sparkles className="text-white w-3 h-3 md:w-4 md:h-4" />
                  </div>
                  <span>Enter your details</span>
                </h3>
                
                  <div className="space-y-8 flex-1 flex flex-col">
                    <InputGroup 
                      label="Candidate Name" 
                      placeholder="e.g. Alex Rivera" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputGroup 
                        label="Target Role" 
                        placeholder="Senior UX Designer" 
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                      />
                      <InputGroup 
                        label="Target Company" 
                        placeholder="Lumina Tech" 
                        value={formData.company}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Resume Data</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="relative group cursor-pointer"
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept=".pdf" 
                          onChange={handleFileUpload} 
                        />
                        <div className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6 flex flex-col items-center justify-center transition-all group-hover:border-black group-hover:bg-white">
                          <div className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                            <UploadCloud className={cn("w-6 h-6", fileName ? "text-emerald-500" : "text-black")} />
                          </div>
                          <p className="text-black font-bold text-base mb-0.5">{fileName || 'Upload Resume'}</p>
                          {isParsing ? (
                            <div className="mt-1 flex items-center space-x-2 text-black text-xs font-bold">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Parsing...</span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">PDF format only</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requirements</label>
                        <button 
                          onClick={handleSmartExtract}
                          disabled={isGenerating || !formData.jobDescription}
                          className="text-[10px] font-bold text-black flex items-center space-x-1.5 hover:opacity-70 disabled:opacity-30 uppercase tracking-widest transition-all cursor-pointer"
                        >
                          <Zap className="w-3 h-3 fill-black" />
                          <span>Smart Extract</span>
                        </button>
                      </div>
                      <textarea 
                        className="w-full bg-slate-50 border border-slate-100 focus:border-black focus:ring-0 rounded-[1.5rem] p-6 text-black transition-all resize-none min-h-[160px] text-xs leading-relaxed font-medium"
                        placeholder="Paste keywords or a full description..."
                        value={formData.jobDescription}
                        onChange={(e) => setFormData({...formData, jobDescription: e.target.value})}
                      ></textarea>
                    </div>

                    <button 
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="btn-black w-full h-14 text-sm shadow-xl shadow-black/10"
                    >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Analyzing requirements and aligning your skills with the role.</span>
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-sm rotate-45" />
                        </div>
                        Generate application
                      </>
                    )}
                  </button>

                  <AnimatePresence>
                    {result && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mt-8 space-y-6 pt-6 border-t border-slate-100 flex-1 flex flex-col"
                      >
                        <div className="bg-black text-white rounded-[2rem] p-6 flex items-start shadow-xl">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                            <Lightbulb className="text-white w-4 h-4" />
                          </div>
                          <div className="ml-4">
                            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">AI Strategic Advice</h4>
                            <p className="text-[13px] font-medium leading-relaxed italic">"{result.advice}"</p>
                          </div>
                        </div>

                        <div className="px-2 flex-1 flex flex-col">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                            <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Target Skills</h4>
                          </div>
                          <div className="flex flex-wrap gap-2 content-start">
                            {result.extractedSkills.slice(0, 12).map(skill => (
                              <span key={skill} className="px-4 py-2 bg-slate-50 border border-slate-100 text-black rounded-full text-[10px] font-bold tracking-tight hover:border-black transition-all hover:bg-white">{skill}</span>
                            ))}
                            {result.extractedSkills.length > 12 && <span className="text-[10px] font-bold text-slate-300">+{result.extractedSkills.length - 12} more</span>}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </GlassCard>
            </section>

            {/* Right: The Draft */}
            <section className="h-full mt-4 lg:mt-0">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                    className="h-full"
                  >
                    <GlassCard className="rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 min-h-full flex flex-col relative overflow-hidden group h-full">
                      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none hidden md:block">
                         <FileText className="w-48 h-48 text-black" />
                      </div>
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8 relative z-10 flex-shrink-0">
                        <div className="flex items-center space-x-3 md:space-x-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black flex items-center justify-center">
                            <FileText className="text-white w-5 h-5 md:w-6 md:h-6" />
                          </div>
                          <div>
                            <h4 className="font-display font-medium text-xl md:text-2xl text-black tracking-tight mb-0.5">Cover letter</h4>
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Aligned • Validated • Professional</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <button 
                            onClick={copyToClipboard}
                            className={cn(
                              "h-10 md:h-12 px-4 md:px-6 rounded-full border transition-all flex items-center gap-2 shadow-sm text-[10px] md:text-xs font-bold flex-1 md:min-w-[140px] justify-center cursor-pointer",
                              isCopied 
                                ? "bg-emerald-500 border-emerald-500 text-white" 
                                : "border-slate-100 bg-white text-black hover:border-black"
                            )}
                          >
                            {isCopied ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy
                              </>
                            )}
                          </button>
                          <button 
                            onClick={handleGenerate}
                            className="h-10 w-10 md:h-12 md:w-12 rounded-full border border-slate-100 bg-white text-black font-bold text-sm hover:border-black transition-all flex items-center justify-center shadow-sm cursor-pointer"
                            title="Regenerate"
                          >
                            <RefreshCw className="w-3.5 h-3.5 md:w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 text-slate-900 whitespace-pre-wrap leading-relaxed text-sm md:text-base font-medium selection:bg-black selection:text-white relative z-10 overflow-y-auto pr-2 md:pr-4 scrollbar-hide min-h-[400px] md:min-h-[550px]">
                        {result.letter}
                      </div>
                    </GlassCard>
                  </motion.div>
                ) : (
                  <div className="h-full min-h-[400px] md:min-h-[800px] flex flex-col items-center justify-center p-8 md:p-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem] md:rounded-[4rem] bg-white/10 group hover:border-black/20 transition-all duration-700">
                    <div className="w-20 h-20 md:w-32 md:h-32 bg-white rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mb-6 md:mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                      <div className="w-10 h-10 md:w-16 md:h-16 bg-black rounded-xl rotate-45 flex items-center justify-center">
                         <Sparkles className="w-5 h-5 md:w-8 md:h-8 text-white -rotate-45" />
                      </div>
                    </div>
                    <h3 className="text-3xl md:text-5xl font-display font-medium text-black mb-4 md:mb-6 tracking-tighter leading-tight italic px-4">
                      Ready to shine <br/><span className="text-slate-350">tomorrow?</span>
                    </h3>
                    <p className="text-slate-400 max-w-sm text-sm md:text-lg leading-relaxed mb-6 md:mb-10 font-bold italic">
                      Fill in your details to start generating.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </section>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <GlassCard className="flex items-center space-x-6 p-8 rounded-[2rem]">
                  <div className="relative flex items-center justify-center scale-90">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle className="text-slate-50" cx="48" cy="48" fill="transparent" r="42" stroke="currentColor" strokeWidth="10"></circle>
                      <circle className="text-black" cx="48" cy="48" fill="transparent" r="42" stroke="currentColor" strokeDasharray="263.89" strokeDashoffset={263.89 - (263.89 * result.matchScore) / 100} strokeWidth="10" strokeLinecap="round"></circle>
                    </svg>
                    <span className="absolute text-2xl font-display font-medium text-black tracking-tighter">{result.matchScore}%</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-black mb-1">Resume Match</h4>
                    <p className="text-slate-400 text-sm font-medium leading-snug">AI-driven keyword & experience alignment.</p>
                  </div>
                </GlassCard>

                <GlassCard className="p-8 rounded-[2rem]">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Narrative Focus</h4>
                  </div>
                  <div className="space-y-4">
                    {result.highlights.slice(0, 2).map((h, i) => (
                      <div key={i} className="flex items-start space-x-3 group">
                        <CheckCircle className="w-4 h-4 text-black mt-0.5 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                        <span className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">{h}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="w-full py-16 md:py-24 bg-white relative overflow-hidden border-t border-black/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-8 md:gap-12 relative z-10">
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-black rounded-full flex items-center justify-center">
                <GenieLogo className="w-5 h-5 md:w-7 md:h-7" />
              </div>
              <span className="text-xl md:text-2xl font-extrabold tracking-tighter">CoverGenie</span>
            </div>
            <p className="max-w-sm text-slate-400 text-[11px] md:text-xs leading-relaxed font-medium">
              <span className="font-bold text-black opacity-60">CoverGenie</span> is an AI-powered tool that creates personalized cover letters by analyzing your resume, job description, and skills. It helps you generate professional, tailored content quickly and efficiently.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 md:gap-16 text-xs md:text-sm font-bold w-full md:w-auto">
            <div className="flex flex-col gap-3 md:gap-4">
              <span className="text-slate-300 uppercase tracking-widest text-[9px] md:text-[10px]">Links</span>
              {['About', 'Features', 'How It Works', 'FAQ'].map(l => <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="hover:text-slate-500 transition-colors">{l}</a>)}
            </div>
            <div className="flex flex-col gap-3 md:gap-4">
              <span className="text-slate-300 uppercase tracking-widest text-[9px] md:text-[10px]">Legal</span>
              {['Privacy', 'Terms'].map(l => <a key={l} href="#" className="hover:text-slate-500 transition-colors">{l}</a>)}
            </div>
            <div className="flex flex-col gap-3 md:gap-4 col-span-2 lg:col-span-1 border-t md:border-t-0 pt-6 md:pt-0">
              <span className="text-slate-300 uppercase tracking-widest text-[9px] md:text-[10px]">Contact</span>
              <div className="flex flex-col gap-2">
                <a href="mailto:22d41a7251@gmail.com" className="flex items-center gap-2 hover:text-slate-500 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>22d41a7251@gmail.com</span>
                </a>
                <a href="https://github.com/Sadashivk47" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-slate-500 transition-colors">
                  <Github className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sadashivk47</span>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-watermark mt-12 md:mt-20 opacity-5 flex items-center justify-center pointer-events-none scale-75 md:scale-100">
          <span>Cover</span>
          <GenieLogo className="w-[18vw] h-[18vw] -ml-[2vw]" fill="black" />
        </div>
      </footer>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={cn(
      "px-4 py-2.5 rounded-full mx-2 flex items-center space-x-3 cursor-pointer group transition-all duration-200",
      active ? "bg-brand-primary text-white shadow-lg shadow-indigo-500/30" : "text-slate-500 hover:text-brand-primary hover:bg-indigo-50/50"
    )}>
      <Icon className={cn("w-5 h-5", active ? "fill-white" : "group-hover:text-brand-primary")} />
      <span className="font-medium text-sm">{label}</span>
    </div>
  );
}

function InputGroup({ label, placeholder, value, onChange }: { label: string, placeholder: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-4">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{label}</label>
      <input 
        type="text" 
        className="w-full h-15 bg-slate-50 border border-slate-100 focus:border-black focus:ring-0 rounded-full px-8 text-black transition-all font-medium text-sm placeholder:text-slate-300" 
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
