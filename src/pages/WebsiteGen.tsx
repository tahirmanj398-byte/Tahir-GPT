import React, { useState, useEffect } from 'react';
import { Code, Loader2, Play, Download, ExternalLink, Globe, Copy, Check, Trash2, History, Paperclip, X, Mic, MicOff, Send } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useGenStore } from '../store/genStore';
import JSZip from 'jszip';
import { localDb } from '../utils/localDb';

const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
  'text/plain', 'text/markdown', 'application/pdf', 'text/csv', 'text/html', 'text/xml',
  'application/rtf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
  'video/mp4', 'video/mpeg', 'video/quicktime'
];

export default function WebsiteGen() {
  const { token } = useAuthStore();
  const {
    websitePrompt: prompt,
    websiteCode: code,
    websiteUrl: deployedUrl,
    isWebsiteGenerating: isLoading,
    isWebsiteDeploying: isDeploying,
    websiteError: error,
    setWebsiteState,
    generateWebsite
  } = useGenStore();

  const setPrompt = (p: string) => setWebsiteState({ websitePrompt: p });
  const setCode = (c: string) => setWebsiteState({ websiteCode: c });
  const setDeployedUrl = (u: string) => setWebsiteState({ websiteUrl: u });

  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHistory(localDb.getWebsites());
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setWebsiteState({ websiteError: 'File size must be less than 10MB' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && !selectedFile) || isLoading) return;

    let fileContext: { data: string, mimeType: string } | undefined;
    if (selectedFile) {
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
        });
        reader.readAsDataURL(selectedFile);
        const base64 = await base64Promise;
        fileContext = { data: base64, mimeType: selectedFile.type };
      } catch (err) {
        console.error('File read error:', err);
      }
    }

    await generateWebsite(prompt, code, fileContext);
    setSelectedFile(null);
    setHistory(localDb.getWebsites());
    setActiveTab('preview');
  };

  const handleDownloadZip = async () => {
    try {
      const zip = new JSZip();
      zip.file("index.html", code);
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'website_dist.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate zip", err);
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadHistoryItem = (item: any) => {
    setPrompt(item.prompt);
    setCode(item.code);
    setDeployedUrl(item.url || '');
    setActiveTab('preview');
    setShowHistory(false);
  };

  const deleteHistoryItem = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    
    localDb.deleteWebsite(id);
    setHistory(localDb.getWebsites());
    if (code && history.find(h => h.id === id)?.code === code) {
      setCode('');
      setPrompt('');
      setDeployedUrl('');
    }
    setConfirmDeleteId(null);
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      setRecordingTime(0);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setWebsiteState({ websiteError: 'Voice input is not supported in this browser.' });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setRecordingTime(0);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          setWebsiteState({ websitePrompt: prompt + transcript });
          setInterimTranscript('');
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.start();
  };

  useEffect(() => {
    let interval: any;
    if (isListening) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto space-y-6 relative">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col items-center justify-center text-center space-y-4 w-full">
          <div className="w-16 h-16 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Code className="w-8 h-8 text-white dark:text-zinc-900" />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Tahir GPT Website Builder</h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-lg font-medium">
            Describe the website you want, and Tahir GPT will generate the HTML, CSS, and JS for you.
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="absolute top-0 right-0 p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700"
          title="History"
        >
          <History className="w-6 h-6" />
        </button>
      </div>

      {showHistory && (
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 max-h-64 overflow-y-auto custom-scrollbar">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider">Website History</h3>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No websites generated yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} onClick={() => loadHistoryItem(item)} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors border border-gray-100 dark:border-zinc-800">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.prompt}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={(e) => deleteHistoryItem(item.id, e)} 
                    className={`p-2 transition-colors rounded-lg ${confirmDeleteId === item.id ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                    title={confirmDeleteId === item.id ? 'Click again to confirm' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700">
        <div className="max-w-full mx-auto w-full">
          {selectedFile && (
            <div className="mb-3 flex items-center bg-zinc-50 dark:bg-zinc-800/50 p-2 px-3 rounded-xl inline-flex border border-gray-200 dark:border-zinc-700 backdrop-blur-sm">
              <Paperclip className="w-3 h-3 text-zinc-600 mr-2" />
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 truncate max-w-[150px]">{selectedFile.name}</span>
              <button 
                type="button" 
                onClick={() => setSelectedFile(null)}
                className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          
          <form onSubmit={handleGenerate} className="relative flex items-center w-full gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept={ALLOWED_TYPES.join(',')}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-400 hover:text-zinc-600 dark:hover:text-zinc-400 transition-all active:scale-90 shrink-0"
              title="Attach File"
            >
              <Paperclip className="w-6 h-6" />
            </button>

            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                rows={1}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isListening ? (interimTranscript || "Listening...") : "Describe the website you want to build..."}
                className={`w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:bg-white dark:focus:bg-zinc-800 transition-all text-base resize-none overflow-y-auto break-words custom-scrollbar ${isListening ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
                disabled={isLoading}
              />

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black dark:text-white transition-colors z-10"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                <span className="text-[10px] font-black tracking-tighter hover:scale-110 transition-transform inline-block">{"<>"}</span>
              </button>

              {isListening && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2 bg-white dark:bg-zinc-900 px-2 py-1 rounded-lg border border-red-100 dark:border-red-900/30 z-10">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  <span className="text-[9px] font-black text-red-500">{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center shrink-0 gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl transition-all ${isListening ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-400 hover:text-zinc-600 dark:hover:text-zinc-400'}`}
                title={isListening ? "Stop Listening" : "Start Voice Input"}
              >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              
              <button
                type="submit"
                disabled={(!prompt.trim() && !selectedFile) || isLoading}
                className="p-2.5 text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              </button>
            </div>
          </form>
          {error && <p className="text-[10px] text-red-500 font-bold text-center mt-2">{error}</p>}
        </div>
      </div>

      {deployedUrl && (
        <div className="bg-white dark:bg-zinc-800 border-2 border-emerald-500/30 p-5 rounded-2xl shadow-xl animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
                  <Globe className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-zinc-800 rounded-full animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Verified Live Deployment</p>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 rounded uppercase tracking-wider">Vercel</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px] sm:max-w-xs">{deployedUrl}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={() => copyToClipboard(deployedUrl)}
                className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-600 transition-all flex items-center justify-center"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <a
                href={deployedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Site
              </a>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-700/50 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Status: Online & Secured</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">SSL: Active</span>
          </div>
        </div>
      )}

      {isDeploying && !deployedUrl && (
        <div className="flex items-center justify-center p-4 text-indigo-600 dark:text-indigo-400 text-sm font-medium animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Deploying to Vercel...
        </div>
      )}

      {code && (
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 overflow-hidden min-h-[500px]">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={"px-4 py-2 text-sm font-medium rounded-lg transition-colors " + (activeTab === 'preview' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700')}
              >
                <Play className="w-4 h-4 inline-block mr-2" />
                Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={"px-4 py-2 text-sm font-medium rounded-lg transition-colors " + (activeTab === 'code' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700')}
              >
                <Code className="w-4 h-4 inline-block mr-2" />
                Code
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleDownloadHtml}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors flex items-center shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                index.html
              </button>
              <button
                onClick={handleDownloadZip}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors flex items-center shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                ZIP (dist)
              </button>
            </div>
          </div>

          <div className="flex-1 relative bg-white dark:bg-zinc-900">
            {activeTab === 'preview' ? (
              <iframe
                srcDoc={code}
                title="Website Preview"
                className="absolute inset-0 w-full h-full border-0 bg-white"
                sandbox="allow-scripts"
              />
            ) : (
              <pre className="absolute inset-0 w-full h-full p-4 overflow-auto text-sm font-mono text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-zinc-900">
                <code>{code}</code>
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
