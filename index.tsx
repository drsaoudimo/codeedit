
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// Declaration for CDN libraries loaded in index.html
declare const JSZip: any;
declare const saveAs: any;

const SNIPPETS = [
  { label: 'Tailwind Card', type: 'html', content: '<div class="max-w-sm rounded overflow-hidden shadow-lg bg-white p-6 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">\n  <h2 class="font-bold text-xl mb-2 text-slate-800 dark:text-white">بطاقة مميزة</h2>\n  <p class="text-gray-700 dark:text-gray-300 text-base">هذا مثال لبطاقة باستخدام Tailwind CSS تدعم الوضع الداكن.</p>\n</div>' },
  { label: 'Flex Center', type: 'css', content: '.flex-center {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}' },
  { label: 'Fetch API', type: 'js', content: 'async function fetchData() {\n  try {\n    const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");\n    const data = await response.json();\n    console.log("Data loaded:", data);\n    return data;\n  } catch (err) {\n    console.error("Fetch error:", err);\n  }\n}' },
  { label: 'React Hook', type: 'js', content: 'const [data, setData] = React.useState(null);\nReact.useEffect(() => {\n  console.log("Component mounted");\n}, []);' },
  { label: 'Neon Glow', type: 'css', content: '.glow {\n  text-shadow: 0 0 10px rgba(99, 102, 241, 0.8), 0 0 20px rgba(99, 102, 241, 0.4);\n  color: #818cf8;\n}' },
];

const App = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [htmlCode, setHtmlCode] = useState('<!-- المحتوى يظهر هنا -->\n<div class="p-8 text-center">\n  <h1 class="text-4xl font-bold mb-4">أهلاً بك في المحرر الذكي</h1>\n  <p class="text-lg opacity-80 text-gray-400">ارفع ملفاتك أو ابدأ بكتابة الوصف للتعديل</p>\n</div>');
  const [cssCode, setCssCode] = useState('body { background-color: #0f172a; color: white; transition: all 0.3s; }');
  const [jsCode, setJsCode] = useState('console.log("المحرر جاهز!");');
  
  const [htmlName, setHtmlName] = useState('index.html');
  const [cssName, setCssName] = useState('style.css');
  const [jsName, setJsName] = useState('script.js');

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [isReactMode, setIsReactMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');

  const [selection, setSelection] = useState('');
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null); // Ref for the iframe
  const [isFullscreen, setIsFullscreen] = useState(false); // New state for fullscreen

  // Effect to handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === previewIframeRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('ai-editor-theme') as 'dark' | 'light';
    if (savedTheme) setTheme(savedTheme);

    const savedData = localStorage.getItem('ai-editor-v6');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.htmlCode) setHtmlCode(parsed.htmlCode);
        if (parsed.cssCode) setCssCode(parsed.cssCode);
        if (parsed.jsCode) setJsCode(parsed.jsCode);
        if (parsed.isReactMode !== undefined) setIsReactMode(parsed.isReactMode);
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    }
  }, []);

  useEffect(() => {
    const state = { htmlCode, cssCode, jsCode, isReactMode };
    localStorage.setItem('ai-editor-v6', JSON.stringify(state));
  }, [htmlCode, cssCode, jsCode, isReactMode]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('ai-editor-theme', newTheme);
  };

  const handleTextareaSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const selectedText = target.value.substring(target.selectionStart, target.selectionEnd);
    setSelection(selectedText);
  };

  const explainCode = async () => {
    if (!selection) return;
    setExplaining(true);
    setShowExpModal(true);
    setExplanation('جاري تحليل الكود وشرحه...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Explain the following ${activeTab.toUpperCase()} code in Arabic clearly. Focus on functionality. Code:\n\n${selection}`,
        config: {
          systemInstruction: "You are a professional software engineer. Explain code concisely in Arabic. Use markdown.",
        }
      });
      setExplanation(response.text || 'لم يتم العثور على شرح.');
    } catch (err) {
      setExplanation('فشل الاتصال بالذكاء الاصطناعي لشرح الكود.');
    } finally {
      setExplaining(false);
    }
  };

  const insertSnippet = (content: string) => {
    if (activeTab === 'html') setHtmlCode(prev => prev + '\n' + content);
    if (activeTab === 'css') setCssCode(prev => prev + '\n' + content);
    if (activeTab === 'js') setJsCode(prev => prev + '\n' + content);
    setStatus('تمت الإضافة!');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleFileChange = async (file: File | undefined, type: 'html' | 'css' | 'js') => {
    if (!file) return;
    const isReactFile = file.name.endsWith('.jsx') || file.name.endsWith('.tsx');
    if (isReactFile) setIsReactMode(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (type === 'html') { setHtmlCode(content); setHtmlName(file.name); }
      if (type === 'css') { setCssCode(content); setCssName(file.name); }
      if (type === 'js') { setJsCode(content); setJsName(file.name); }
      setStatus(`تم رفع ${file.name}`);
      setTimeout(() => setStatus(''), 2000);
      setPreviewKey(prev => prev + 1);
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!prompt) {
      setError('الرجاء إدخال وصف للتعديل.');
      return;
    }
    setLoading(true);
    setStatus(thinkingMode ? 'جاري التفكير المعمق...' : 'جاري المعالجة...');
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `You are a World-Class Fullstack Engineer. 
      You will be given three web project files (HTML, CSS, and JS). 
      The user will request modifications. 
      Analyze the existing code across all files and update them to satisfy the request.
      
      RULES:
      1. ALWAYS return FULL content for "html", "css", and "js".
      2. If "React Mode" is active, "js" contains JSX/React component code.
      3. Use modern, accessible, and responsive practices (Tailwind CSS is available).
      4. Ensure cross-file consistency.
      5. Output ONLY a valid JSON object matching the schema.
      6. If a file is missing or not needed, return it as empty string but keep the key.
      7. Language should remain Arabic for UI elements if already in Arabic.`;

      const contents = `
      USER REQUEST: "${prompt}"
      REACT MODE: ${isReactMode ? 'ENABLED' : 'DISABLED'}
      
      CURRENT FILES:
      - ${htmlName}: ${htmlCode || 'empty'}
      - ${cssName}: ${cssCode || 'empty'}
      - ${jsName}: ${jsCode || 'empty'}
      `;

      const modelName = thinkingMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction,
          thinkingConfig: thinkingMode ? { thinkingBudget: 4000 } : undefined,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              html: { type: Type.STRING },
              css: { type: Type.STRING },
              js: { type: Type.STRING }
            },
            required: ["html", "css", "js"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      const result = JSON.parse(text);
      
      setHtmlCode(result.html || '');
      setCssCode(result.css || '');
      setJsCode(result.js || '');
      setPreviewKey(prev => prev + 1);
      setStatus('تم التحديث بنجاح! 🎉');
      setPrompt('');
    } catch (err) {
      console.error(err);
      setError("فشلت عملية التوليد. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const clearWorkspace = () => {
    if (confirm('هل أنت متأكد من مسح مساحة العمل؟')) {
      setHtmlCode('');
      setCssCode('');
      setJsCode('');
      setStatus('تم المسح');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const getCombinedCode = useCallback(() => {
    const html = htmlCode.trim();
    const css = cssCode.trim();
    const js = jsCode.trim();

    if (!html && !css && !js) {
      return `<html><body style="background:#020617;color:#94a3b8;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;direction:rtl;"><div>بانتظار ملفاتك...</div></body></html>`;
    }

    if (isReactMode) {
      return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script type="importmap">
            {
              "imports": {
                "react": "https://esm.sh/react@18.2.0",
                "react-dom": "https://esm.sh/react-dom@18.2.0/client",
                "lucide-react": "https://esm.sh/lucide-react"
              }
            }
            </script>
            <style>
              body { margin: 0; min-height: 100vh; } 
              ${css}
            </style>
          </head>
          <body>
            <div id="root">${html.includes('id="root"') ? '' : html}</div>
            <script type="text/babel" data-type="module">
              import React from 'react';
              import { createRoot } from 'react-dom';
              try {
                ${js}
                if (typeof App !== 'undefined') {
                   const root = createRoot(document.getElementById('root'));
                   root.render(<App />);
                }
              } catch (err) {
                document.getElementById('root').innerHTML = '<div style="color:red;padding:20px;font-family:monospace;direction:ltr;">React Error: ' + err.message + '</div>';
              }
            </script>
          </body>
        </html>
      `;
    }

    const styleTag = css ? `<style>${css}</style>` : '';
    const scriptTag = js ? `<script>${js}</script>` : '';
    
    // Check if it's a full document
    if (/<html/i.test(html)) {
      let combined = html;
      if (css && !combined.includes(css)) combined = combined.replace('</head>', `${styleTag}</head>`);
      if (js && !combined.includes(js)) combined = combined.replace('</body>', `${scriptTag}</body>`);
      return combined;
    }

    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script>${styleTag}</head><body>${html}${scriptTag}</body></html>`;
  }, [htmlCode, cssCode, jsCode, isReactMode]);

  const previewSrcDoc = useMemo(() => getCombinedCode(), [getCombinedCode, previewKey]);

  const downloadProjectZip = async () => {
    setStatus('جاري التحميل...');
    try {
      const zip = new JSZip();
      if (htmlCode) zip.file(htmlName, htmlCode);
      if (cssCode) zip.file(cssName, cssCode);
      if (jsCode) zip.file(jsName, jsCode);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "ai_optimized_web_project.zip");
      setStatus('تم التحميل! ✨');
      setTimeout(() => setStatus(''), 2000);
    } catch (e) {
      setError('فشل التصدير: ' + (e as Error).message);
    }
  };

  const toggleFullscreen = () => {
    if (previewIframeRef.current) {
      if (document.fullscreenElement) { // If any element is currently fullscreen
        document.exitFullscreen();
      } else {
        previewIframeRef.current.requestFullscreen().catch(err => {
          console.error("Error attempting to enable full-screen mode: ", err);
        });
      }
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'} ${isFullscreen ? 'p-0' : 'p-4 md:p-6'} font-['Cairo'] transition-colors duration-300 flex flex-col`}>
      
      {/* Explanation Modal */}
      {showExpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className={`w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col border border-white/10 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-indigo-600">
                 <div className="flex items-center gap-2">
                   <span className="text-xl">✨</span>
                   <h3 className="font-bold text-white">شرح الكود</h3>
                 </div>
                 <button onClick={() => setShowExpModal(false)} className="text-white/80 hover:text-white transition-colors">✕</button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto whitespace-pre-wrap leading-relaxed text-sm">
                {explaining ? (
                   <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                      <p className="text-sm font-medium opacity-60">جاري التحليل لتقديم أفضل شرح...</p>
                   </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    {explanation}
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-800/20 flex justify-end">
                 <button onClick={() => setShowExpModal(false)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all">إغلاق</button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      {!isFullscreen && (
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/40 transform rotate-3">
              <span className="text-2xl">🧠</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">محرر الكود <span className="text-indigo-500">الذكي</span></h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Powered by Gemini AI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                <button 
                  onClick={() => setIsReactMode(false)} 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!isReactMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Vanilla
                </button>
                <button 
                  onClick={() => setIsReactMode(true)} 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isReactMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  React
                </button>
             </div>
             <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-2xl border border-white/5">
                <span className="text-xs font-bold text-slate-400">تفكير:</span>
                <button 
                  onClick={() => setThinkingMode(!thinkingMode)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${thinkingMode ? 'bg-indigo-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${thinkingMode ? 'right-6' : 'right-1'}`}></div>
                </button>
             </div>
             <button onClick={toggleTheme} className="p-3 bg-slate-800 rounded-2xl border border-white/10 hover:bg-slate-700 transition-all">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>
      )}

      {/* Main Workspace */}
      <div className={`flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 ${isFocusMode ? 'mt-0' : ''}`}>
        
        {/* Editor Column */}
        {!isFullscreen && (
          <div className={`${isFocusMode ? 'lg:col-span-12' : 'lg:col-span-7'} flex flex-col gap-5`}>
            <div className="flex items-center justify-between bg-slate-900/40 p-2 rounded-3xl border border-white/5 backdrop-blur-md">
              <div className="flex gap-2 p-1">
                {(['html', 'css', 'js'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:text-white'}`}
                  >
                    {tab === 'js' && isReactMode ? 'JSX' : tab.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                 {selection && (
                   <button onClick={explainCode} className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[11px] rounded-xl font-bold hover:bg-amber-500 hover:text-white transition-all">
                     شرح 🤔
                   </button>
                 )}
                 <button onClick={clearWorkspace} className="p-2 text-slate-500 hover:text-red-500 transition-colors" title="مسح الكل">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
                 {isFocusMode ? (
                   <button onClick={() => setIsFocusMode(false)} className="px-4 py-2 bg-slate-800 text-white text-[11px] rounded-xl font-bold hover:bg-slate-700 transition-all">إغلاق التركيز</button>
                 ) : (
                   <button onClick={() => setIsFocusMode(true)} className="p-2 text-slate-400 hover:text-white transition-colors" title="وضع التركيز">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                   </button>
                 )}
              </div>
            </div>

            <div className="relative flex-1 group shadow-2xl">
              <textarea
                ref={textareaRef}
                value={activeTab === 'html' ? htmlCode : activeTab === 'css' ? cssCode : jsCode}
                onChange={(e) => {
                  if (activeTab === 'html') setHtmlCode(e.target.value);
                  if (activeTab === 'css') setCssCode(e.target.value);
                  if (activeTab === 'js') setJsCode(e.target.value);
                }}
                onSelect={handleTextareaSelect}
                spellCheck={false}
                className={`w-full h-full p-8 font-mono text-sm rounded-[2.5rem] border-2 outline-none transition-all focus:ring-8 focus:ring-indigo-500/5 resize-none leading-relaxed ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-blue-300' : 'bg-white border-slate-200 text-slate-800'}`}
                placeholder={`أدخل كود ${activeTab.toUpperCase()} هنا...`}
              />
              
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  {SNIPPETS.filter(s => s.type === activeTab).map((snippet, idx) => (
                    <button
                      key={idx}
                      onClick={() => insertSnippet(snippet.content)}
                      className="p-3 bg-slate-800/90 backdrop-blur-md border border-white/10 text-white rounded-2xl shadow-xl text-[10px] font-bold hover:bg-indigo-600 hover:scale-110 transition-all text-left whitespace-nowrap pointer-events-auto"
                    >
                      + {snippet.label}
                    </button>
                  ))}
              </div>
            </div>

            {/* Prompt Section */}
            {!isFocusMode && (
              <div className="bg-slate-900/60 p-6 rounded-[3rem] border border-white/5 space-y-4 shadow-xl backdrop-blur-sm">
                 <div className="relative">
                   <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className={`w-full h-28 p-6 rounded-3xl border-2 outline-none transition-all text-sm leading-relaxed ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400'}`}
                    placeholder="كيف تريد تعديل مشروعك اليوم؟ (مثلاً: حوّل التصميم إلى نظام بطاقات أنيق بوضع ليلي)"
                   />
                   <div className="absolute left-4 bottom-4 flex gap-2">
                      <Uploader label="HTML" onFile={f => handleFileChange(f, 'html')} />
                      <Uploader label="CSS" onFile={f => handleFileChange(f, 'css')} />
                      <Uploader label="JS" onFile={f => handleFileChange(f, 'js')} />
                   </div>
                 </div>
                 <div className="flex gap-4">
                   <button 
                    onClick={handleGenerate} 
                    disabled={loading}
                    className="flex-1 py-5 bg-gradient-to-r from-indigo-600 to-blue-700 text-white font-black rounded-3xl shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                     {loading ? (
                       <div className="flex items-center gap-3">
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                         <span>جاري المعالجة...</span>
                       </div>
                     ) : (
                       <div className="flex items-center gap-3">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                         <span>تحديث ذكي</span>
                       </div>
                     )}
                   </button>
                   <button 
                    onClick={downloadProjectZip} 
                    className="px-8 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 font-bold rounded-3xl hover:bg-emerald-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                     <span>ZIP</span>
                   </button>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Column */}
        <div className={`${isFullscreen ? 'lg:col-span-12' : isFocusMode ? 'hidden' : 'lg:col-span-5'} flex flex-col gap-5 h-full`}>
           <div className={`bg-slate-900/40 p-3 rounded-2xl border border-white/5 flex items-center justify-between px-5 ${isFullscreen ? 'hidden' : ''}`}>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">المعاينة المباشرة</span>
             </div>
             <div className="flex gap-2"> {/* Grouping buttons */}
               <button onClick={() => setPreviewKey(k => k + 1)} className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">تحديث 🔄</button>
               <button onClick={toggleFullscreen} className="p-1 text-[11px] font-bold text-slate-400 hover:text-white transition-colors" title="ملء الشاشة">
                 {isFullscreen ? (
                   // Exit fullscreen icon
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9V3L5 8V14M14 15v6l5-5V9" /></svg>
                 ) : (
                   // Enter fullscreen icon
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" /></svg>
                 )}
               </button>
             </div>
           </div>
           
           <div className={`${isFullscreen ? 'rounded-none border-none' : 'rounded-[3rem] border-4'} flex-1 overflow-hidden shadow-2xl bg-white relative transition-all min-h-[500px] ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
              <iframe 
                ref={previewIframeRef} // Attach ref to iframe
                key={previewKey}
                srcDoc={previewSrcDoc}
                className="w-full h-full border-none"
                title="Live Preview"
                sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              />
           </div>

           {!isFullscreen && (
             <div className="min-h-[60px]">
               {status && (
                  <div className="bg-emerald-500/10 py-3 px-6 rounded-2xl border border-emerald-500/20 text-emerald-500 text-xs font-bold text-center animate-in slide-in-from-top-2">
                     {status}
                  </div>
                )}
                {error && (
                  <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-center animate-in shake duration-300">
                    <p className="text-xs font-black text-red-500">{error}</p>
                  </div>
                )}
             </div>
           )}
        </div>
      </div>

      {!isFullscreen && (
        <footer className="mt-12 text-center opacity-40 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
            PRO CODE EDITOR • SAOUDI MOHAMED • ALGERIA 2025
          </p>
        </footer>
      )}
    </div>
  );
};

const Uploader = ({ label, onFile }: { label: string, onFile: (f: File) => void }) => (
  <div className="relative group bg-slate-900/60 border border-white/10 p-2 px-3 rounded-xl text-center hover:bg-indigo-600/20 hover:border-indigo-500 transition-all cursor-pointer">
    <span className="text-[9px] font-black text-slate-400 group-hover:text-indigo-400 transition-colors uppercase">{label}</span>
    <input type="file" onChange={e => e.target.files && onFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
  </div>
);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);