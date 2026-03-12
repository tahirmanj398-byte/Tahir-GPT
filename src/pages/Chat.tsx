import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Send, 
  Plus, 
  Trash2, 
  Loader2, 
  Paperclip, 
  X, 
  MessageSquare, 
  FileText, 
  File as FileIcon, 
  Presentation, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Mic, 
  MicOff, 
  MoreVertical, 
  Folder,
  Edit,
  Search,
  Share2,
  Check,
  Copy,
  Image as ImageIcon,
  Globe,
  ExternalLink,
  Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { aiEnhancements, ResponseLength, Intent, Tone } from '../utils/aiEnhancements';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Header, Footer, PageNumber } from 'docx';
import PptxGenJS from 'pptxgenjs';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useGenStore } from '../store/genStore';
import { aiService } from '../services/aiService';
import { localDb } from '../utils/localDb';
import { memoryService } from '../utils/memoryService';
import { autoRetry } from '../utils/autoRetry';
import Logo from '../components/Logo';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  provider?: string;
  imageUrl?: string;
  fileData?: string;
  fileName?: string;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Tahir AI Fast', description: 'Best for speed and general tasks' },
  { id: 'gemini-3.1-pro-preview', name: 'Tahir AI Pro', description: 'Best for complex reasoning and coding' },
  { id: 'gemini-flash-latest', name: 'Tahir AI Balanced', description: 'Balanced performance' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Tahir AI Lite', description: 'Lightweight and efficient' },
];

interface Chat {
  id: number;
  title: string;
}



export default function Chat() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const { chats, setChats, addChat, removeChat, createChat, activeChatId, setActiveChatId, activeProjectId, projects } = useChatStore();
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeChat = chats.find(c => c.id.toString() === activeChatId);
  const chatProject = activeChat?.projectId ? projects.find(p => p.id === activeChat.projectId) : null;

  useEffect(() => {
    setActiveChatId(routeId || null);
  }, [routeId, setActiveChatId]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [responseLength, setResponseLength] = useState<ResponseLength>('medium');
  const [webVerification, setWebVerification] = useState(false);
  const [lastAssistantMessageId, setLastAssistantMessageId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const isListeningRef = useRef(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const isCreatingNewChatRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editInput, setEditInput] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, messageId: number, content: string, role: string } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    generateImage,
    editImage,
    isImageGenerating,
    imageError,
    imageUrl,
    generateWebsite,
    isWebsiteGenerating,
    websiteError,
    websiteUrl,
    websiteCode
  } = useGenStore();

  const handleExport = async (exportData: any, isShare = false) => {
    if (isExporting) return;
    setIsExporting(true);
    
    try {
      let blob: Blob | null = null;
      let fileName = `${exportData.title || 'Tahir-GPT-Export'}`;

      if (exportData.type === 'pdf') {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const margin = 25;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - (margin * 2);
        
        // Helper for Footer
        const addFooter = (pageNum: number, totalPages: number) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text(`Tahir GPT Professional Document | Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
          doc.setDrawColor(230, 230, 230);
          doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
        };

        // Header Line
        doc.setDrawColor(24, 24, 27);
        doc.setLineWidth(0.5);
        doc.line(margin, margin - 5, pageWidth - margin, margin - 5);

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.setTextColor(24, 24, 27);
        doc.text(exportData.title || "Professional Report", margin, margin + 15);
        
        let currentY = margin + 30;

        // Subtitle
        if (exportData.subtitle) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(113, 113, 122);
          doc.text(exportData.subtitle.toUpperCase(), margin, currentY);
          currentY += 15;
        }
        
        // Content
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(39, 39, 42);
        
        const lines = (exportData.content || "").split('\n');
        lines.forEach((line: string) => {
          const splitLine = doc.splitTextToSize(line, contentWidth);
          splitLine.forEach((l: string) => {
            if (currentY + 10 > pageHeight - margin) {
              addFooter(doc.internal.pages.length - 1, 0); // Placeholder
              doc.addPage();
              currentY = margin + 10;
            }
            doc.text(l, margin, currentY);
            currentY += 6;
          });
          currentY += 4; // Paragraph spacing
        });

        // Final Footer update
        const totalPages = doc.internal.pages.length - 1;
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          addFooter(i, totalPages);
        }

        if (isShare) {
          blob = doc.output('blob');
          fileName += '.pdf';
        } else {
          doc.save(`${fileName}.pdf`);
        }
      } else if (exportData.type === 'word') {
        const doc = new Document({
          creator: "Tahir GPT",
          title: exportData.title,
          description: "Professional Document generated by Tahir GPT",
          sections: [{
            properties: {
              page: {
                margin: {
                  top: 1440, // 1 inch
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "TAHIR GPT | PROFESSIONAL SERIES",
                        bold: true,
                        size: 18,
                        color: "18181B",
                      }),
                    ],
                    border: {
                      bottom: {
                        color: "E4E4E7",
                        space: 1,
                        style: "single",
                        size: 6,
                      },
                    },
                    spacing: { after: 200 },
                  }),
                ],
              }),
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: "Page ",
                        size: 18,
                        color: "71717A",
                      }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        size: 18,
                        color: "71717A",
                      }),
                      new TextRun({
                        text: " of ",
                        size: 18,
                        color: "71717A",
                      }),
                      new TextRun({
                        children: [PageNumber.TOTAL_PAGES],
                        size: 18,
                        color: "71717A",
                      }),
                    ],
                  }),
                ],
              }),
            },
            children: [
              new Paragraph({
                text: exportData.title || "Professional Document",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.LEFT,
                spacing: { before: 400, after: 400 },
              }),
              ...(exportData.subtitle ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  children: [
                    new TextRun({
                      text: exportData.subtitle.toUpperCase(),
                      bold: true,
                      color: "71717A",
                      size: 24, // 12pt
                    }),
                  ],
                  spacing: { after: 800 },
                })
              ] : []),
              ...((exportData.content || "").split('\n').map((line: string) => 
                new Paragraph({
                  spacing: { before: 120, after: 120, line: 360 }, // 1.5 line spacing
                  alignment: AlignmentType.JUSTIFIED,
                  children: [
                    new TextRun({
                      text: line,
                      size: 22, // 11pt
                      font: "Calibri",
                    }),
                  ],
                })
              )),
            ],
          }],
        });
        blob = await Packer.toBlob(doc);
        fileName += '.docx';
        if (!isShare) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          window.URL.revokeObjectURL(url);
        }
      } else if (exportData.type === 'ppt') {
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';
        
        pptx.defineSlideMaster({
          title: 'MASTER_SLIDE',
          background: { color: 'FFFFFF' },
          objects: [
            { rect: { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: '18181B' } } },
            { text: { text: exportData.title || 'Professional Presentation', options: { x: 0.5, y: 0.1, w: '50%', h: 0.4, color: 'FFFFFF', fontSize: 14, fontFace: 'Helvetica', bold: true } } },
            { rect: { x: 0, y: '92%', w: '100%', h: '8%', fill: { color: 'F4F4F5' } } },
            { text: { text: exportData.title || 'Presentation', options: { x: 0.5, y: '93%', w: '50%', h: 0.4, color: '71717A', fontSize: 10, fontFace: 'Helvetica' } } },
          ],
          slideNumber: { x: '95%', y: '93%', color: '71717A', fontSize: 10, fontFace: 'Helvetica' }
        });

        const titleSlide = pptx.addSlide();
        titleSlide.background = { color: '18181B' };
        titleSlide.addText(exportData.title || "Professional Presentation", { 
          x: 1, y: 2, w: '80%', h: 1.5, fontSize: 48, bold: true, align: 'center', color: 'FFFFFF', fontFace: 'Helvetica' 
        });
        titleSlide.addText(exportData.subtitle || "Overview & Insights", { 
          x: 1, y: 3.5, w: '80%', h: 1, fontSize: 20, align: 'center', color: 'D4D4D8', fontFace: 'Helvetica' 
        });

        if (exportData.slides && Array.isArray(exportData.slides)) {
          for (const s of exportData.slides) {
            const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
            slide.addText(s.title, { 
              x: 0.5, y: 0.8, w: '90%', h: 0.8, fontSize: 32, bold: true, color: '1F2937', fontFace: 'Helvetica' 
            });
            const bulletItems = (s.bullets || []).map((b: string) => ({ text: b, options: { bullet: { type: 'bullet' }, color: '4B5563', fontFace: 'Helvetica', fontSize: 20 } }));
            
            let hasImage = false;
            if (s.imageKeyword) {
              try {
                const enhancedPrompt = `A professional, realistic, high-quality stock photo of ${s.imageKeyword}. Corporate photography style, 8k resolution, photorealistic, no text, no watermarks, no logos, clean background.`;
                const result = await aiService.generateImage(enhancedPrompt);
                
                if (result.imageUrl) {
                  // The imageUrl from aiService is already a base64 data URL
                  slide.addImage({ data: result.imageUrl, x: 5.5, y: 1.8, w: 4.0, h: 3.0, sizing: { type: 'cover', w: 4.0, h: 3.0 } });
                  hasImage = true;
                }
              } catch (err) { 
                console.error("Failed to generate image for slide:", err); 
                // Fallback to a simple placeholder if nano banana fails
                try {
                   const fallbackKeyword = s.imageKeyword.split(' ')[0] || 'business';
                   const response = await fetch(`https://loremflickr.com/800/600/${encodeURIComponent(fallbackKeyword)}/all`);
                   if (response.ok) {
                     const imgBlob = await response.blob();
                     const base64data = await new Promise<string>((resolve) => {
                       const reader = new FileReader();
                       reader.onloadend = () => resolve(reader.result as string);
                       reader.readAsDataURL(imgBlob);
                     });
                     slide.addImage({ data: base64data, x: 5.5, y: 1.8, w: 4.0, h: 3.0, sizing: { type: 'cover', w: 4.0, h: 3.0 } });
                     hasImage = true;
                   }
                } catch (fallbackErr) {
                  console.error("Fallback image also failed:", fallbackErr);
                }
              }
            }
            const textWidth = hasImage ? 4.5 : 9.0;
            slide.addText(bulletItems, { x: 0.5, y: 1.6, w: textWidth, h: 3.8, align: 'left', valign: 'top', lineSpacing: 32, margin: [0, 10, 0, 0] });
          }
        }
        
        if (isShare) {
          blob = await pptx.write({ outputType: 'blob' }) as Blob;
          fileName += '.pptx';
        } else {
          await pptx.writeFile({ fileName: `${fileName}.pptx` });
        }
      }

      if (isShare && blob) {
        handleShare(exportData.title, 'Check out this file from Tahir GPT', undefined, blob, fileName);
      }
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async (title: string, text: string, url?: string, file?: Blob, fileName?: string) => {
    if (navigator.share) {
      try {
        const shareData: ShareData = { title, text };
        if (url) shareData.url = url;
        
        if (file && fileName) {
          const shareFile = new File([file], fileName, { type: file.type });
          if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
            shareData.files = [shareFile];
          }
        }

        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy link or show alert
      if (url) {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      } else {
        alert('Sharing is not supported on this browser.');
      }
    }
  };

  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: Open in new window for manual save
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`<img src="${url}" style="max-width:100%">`);
      } else {
        alert("Please allow popups to download images, or long-press the image to save.");
      }
    }
  };


  const renderMessageContent = React.useCallback((msg: Message, isLatest: boolean) => {
    const { content } = msg;
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = content.match(jsonRegex);
    let exportData = null;
    let imageGenData = null;
    let websiteGenData = null;
    let cleanContent = content;

    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.fileExport) {
          exportData = parsed.fileExport;
          cleanContent = content.replace(match[0], '');
        } else if (parsed.imageGeneration) {
          imageGenData = parsed.imageGeneration;
          cleanContent = content.replace(match[0], '');
        } else if (parsed.websiteGeneration) {
          websiteGenData = parsed.websiteGeneration;
          cleanContent = content.replace(match[0], '');
        }
      } catch (e) {
        // ignore invalid json
      }
    }

    return (
      <div className="w-full max-w-full mx-auto">
        <div className="prose prose-zinc dark:prose-invert max-w-none break-words leading-relaxed 
          prose-headings:font-black prose-headings:tracking-tight prose-headings:text-zinc-900 dark:prose-headings:text-zinc-50
          prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
          prose-p:text-base md:text-lg prose-p:text-zinc-800 dark:prose-p:text-zinc-200 prose-p:font-medium prose-p:leading-8
          prose-strong:text-zinc-900 dark:prose-strong:text-white prose-strong:font-bold
          prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-code:text-zinc-900 dark:prose-code:text-zinc-100
          prose-pre:bg-zinc-900 dark:prose-pre:bg-black prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-2xl prose-pre:shadow-2xl
          prose-li:text-base md:text-lg dark:prose-li:text-zinc-200 prose-li:my-2">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              a: ({ node, ...props }) => (
                <a 
                  {...props} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 underline underline-offset-4 font-bold transition-colors inline-flex items-center gap-1"
                >
                  {props.children}
                  <ExternalLink size={14} className="inline-block" />
                </a>
              )
            }}
          >
            {cleanContent}
          </ReactMarkdown>
        </div>

        {imageGenData && (
          <div className="mt-6 p-6 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-zinc-900 dark:bg-zinc-100 rounded-lg">
                  <ImageIcon className="w-5 h-5 text-white dark:text-zinc-900" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Image Generation</h4>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Powered by Tahir GPT</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  await generateImage(imageGenData.prompt);
                  const latestUrl = useGenStore.getState().imageUrl;
                  if (latestUrl && activeChatId) {
                    localDb.updateMessage(activeChatId, msg.id, { imageUrl: latestUrl });
                    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, imageUrl: latestUrl } : m));
                  }
                }}
                disabled={isImageGenerating}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black rounded-xl hover:scale-105 transition-all disabled:opacity-50 shadow-lg"
              >
                {isImageGenerating ? 'Generating...' : 'Generate Now'}
              </button>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 italic mb-4">"{imageGenData.prompt}"</p>
            
            {(msg.imageUrl || (imageUrl && isLatest)) && !isImageGenerating && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white shadow-lg">
                  <img src={msg.imageUrl || imageUrl} alt={imageGenData.prompt} className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => {
                      setIsEditingImage(true);
                      setImageToEdit(msg.imageUrl || imageUrl);
                      setInput(`Modify this image: `);
                      textareaRef.current?.focus();
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black rounded-xl hover:opacity-90 transition-all shadow-lg active:scale-95"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Image</span>
                  </button>
                  <button 
                    onClick={() => handleDownloadImage(msg.imageUrl || imageUrl, `tahir-gpt-${Date.now()}.png`)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-black rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shadow-lg active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Gallery</span>
                  </button>
                  <button 
                    onClick={async () => {
                      const response = await fetch(msg.imageUrl || imageUrl);
                      const blob = await response.blob();
                      handleShare('Generated Image', 'Check out this image generated by Tahir GPT', undefined, blob, 'image.png');
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-black rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shadow-lg active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            )}

            {imageError && <p className="text-xs text-red-500 mt-2 font-bold">{imageError}</p>}
          </div>
        )}

        {websiteGenData && (
          <div className="mt-6 p-6 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-zinc-900 dark:bg-zinc-100 rounded-lg">
                  <Globe className="w-5 h-5 text-white dark:text-zinc-900" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Website Builder</h4>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Powered by Tahir GPT</p>
                </div>
              </div>
              <button 
                onClick={() => generateWebsite(websiteGenData.prompt, '')}
                disabled={isWebsiteGenerating}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold rounded-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {isWebsiteGenerating ? 'Building...' : 'Build Website'}
              </button>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 italic mb-4">"{websiteGenData.prompt}"</p>
            
            {websiteCode && !isWebsiteGenerating && isLatest && (
              <div className="mt-4 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-white">
                <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500">Live Preview</span>
                  <div className="flex space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                </div>
                <iframe 
                  srcDoc={websiteCode} 
                  className="w-full h-[400px] border-none bg-white"
                  title="Website Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            )}

            {websiteUrl && isLatest && (
              <div className="mt-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <ExternalLink className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]">{websiteUrl}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <a 
                    href={websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-zinc-900 dark:text-zinc-100 underline underline-offset-4"
                  >
                    View Live
                  </a>
                  <button 
                    onClick={() => handleShare('My Website', 'Check out this website built by Tahir GPT', websiteUrl)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[10px] font-black rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shadow-sm"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            )}
            {websiteError && <p className="text-xs text-red-500 mt-2">{websiteError}</p>}
          </div>
        )}

        {exportData && (
          <div className="mt-8 p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-lg flex items-center justify-between max-w-xl transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                {exportData.type === 'ppt' ? <Presentation className="w-6 h-6" /> : exportData.type === 'word' ? <FileIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-base font-black text-gray-900 dark:text-gray-100 tracking-tight">{exportData.title}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{exportData.type.toUpperCase()} Ready</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => handleExport(exportData)}
                disabled={isExporting}
                className="flex-1 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black rounded-xl hover:bg-black dark:hover:bg-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
              >
                {isExporting ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Working...</> : <><Download className="w-3.5 h-3.5 mr-2" /> Download</>}
              </button>
              <button 
                onClick={() => handleExport(exportData, true)}
                disabled={isExporting}
                className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-black rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg space-x-2"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }, [
    generateImage,
    isImageGenerating,
    imageUrl,
    activeChatId,
    setMessages,
    setIsEditingImage,
    setImageToEdit,
    setInput,
    handleDownloadImage,
    handleShare,
    generateWebsite,
    isWebsiteGenerating,
    websiteUrl,
    websiteCode,
    handleExport,
    isExporting,
    imageError,
    websiteError
  ]);

  const MessageItem = React.memo(({ 
    msg, 
    index, 
    isLatest,
    editingMessageId, 
    editInput, 
    setEditInput, 
    setEditingMessageId, 
    handleSaveEdit, 
    handleTouchStart, 
    handleTouchEnd, 
    handleContextMenu, 
    renderMessageContent 
  }: {
    msg: Message;
    index: number;
    isLatest: boolean;
    editingMessageId: number | null;
    editInput: string;
    setEditInput: (val: string) => void;
    setEditingMessageId: (id: number | null) => void;
    handleSaveEdit: (id: number) => void;
    handleTouchStart: (e: any, msg: Message) => void;
    handleTouchEnd: () => void;
    handleContextMenu: (e: any, msg: Message) => void;
    renderMessageContent: (msg: Message, isLatest: boolean) => React.ReactElement;
  }) => {
    return (
      <div
        className={`flex w-full px-4 md:px-8 py-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`w-full mx-auto ${msg.role === 'user' ? 'max-w-3xl' : 'max-w-full'}`}>
          {msg.role === 'user' ? (
            <div className="flex justify-end">
              <div 
                className="group relative max-w-[90%] md:max-w-[80%]"
                onMouseDown={(e) => handleTouchStart(e, msg)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onTouchStart={(e) => handleTouchStart(e, msg)}
                onTouchEnd={handleTouchEnd}
                onContextMenu={(e) => handleContextMenu(e, msg)}
              >
                {editingMessageId === msg.id ? (
                  <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 w-full">
                    <textarea
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 text-[15px] md:text-base leading-relaxed font-medium resize-none text-zinc-900 dark:text-zinc-100"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => setEditingMessageId(null)}
                        className="px-3 py-1 text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(msg.id)}
                        className="px-3 py-1 text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg"
                      >
                        Save & Resend
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 p-3 md:p-4 rounded-2xl text-[15px] md:text-base leading-relaxed font-medium break-words">
                    {msg.fileData && msg.fileData.startsWith('data:image/') && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 max-w-sm">
                        <img src={msg.fileData} alt={msg.fileName || 'Uploaded image'} className="w-full h-auto object-cover" />
                      </div>
                    )}
                    {msg.fileData && !msg.fileData.startsWith('data:image/') && (
                      <div className="mb-3 flex items-center bg-white dark:bg-zinc-900 p-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <Paperclip className="w-4 h-4 text-zinc-500 mr-2" />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">{msg.fileName || 'Attached file'}</span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div 
              className="flex flex-col items-start w-full"
              onMouseDown={(e) => handleTouchStart(e, msg)}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              onTouchStart={(e) => handleTouchStart(e, msg)}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => handleContextMenu(e, msg)}
            >
              <div className="flex flex-col w-full">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shrink-0 shadow-sm">
                    <Logo size={12} className="text-white dark:text-zinc-900" />
                  </div>
                  <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Tahir GPT</span>
                  {msg.provider && (
                    <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest border border-zinc-200 dark:border-zinc-700">
                      {msg.provider}
                    </span>
                  )}
                  <div className="flex-1"></div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                      if ('vibrate' in navigator) navigator.vibrate(20);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Copy Response"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="w-full">
                  {renderMessageContent(msg, isLatest)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  });

  const handleExportFullChat = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const element = scrollContainerRef.current;
      if (!element) return;
      
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          // Fix for oklch colors which html2canvas doesn't support
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const style = window.getComputedStyle(el);
            
            // Force colors to be computed as RGB/RGBA or fallback
            if (style.color.includes('oklch')) el.style.color = '#000000';
            if (style.backgroundColor.includes('oklch')) el.style.backgroundColor = 'transparent';
            if (style.borderColor.includes('oklch')) el.style.borderColor = '#e5e7eb';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Handle multi-page PDF if content is long
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Tahir-GPT-Chat-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF Export failed', err);
      setError('PDF Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length === 0 || isLoading) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      await sendMessage(null, true, lastUserMsg.content);
    }
  };

  const handleShareApp = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Tahir GPT',
          text: 'Check out Tahir GPT - The ultimate AI platform for high-performance creativity!',
          url: window.location.origin,
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        alert('App link copied to clipboard!');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing app:', error);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, msg: Message) => {
    // Prevent context menu if it's a right click
    if ('button' in e && e.button === 2) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({
        x: clientX,
        y: clientY,
        messageId: msg.id,
        content: msg.content,
        role: msg.role
      });
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      messageId: msg.id,
      content: msg.content,
      role: msg.role
    });
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setContextMenu(null);
    // Optional: show a toast or feedback
  };

  const handleEdit = (msgId: number, content: string) => {
    setEditingMessageId(msgId);
    setEditInput(content);
    setContextMenu(null);
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current && !isExpanded) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    } else if (textareaRef.current && isExpanded) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input, isExpanded]);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf', 
    'text/plain', 'text/csv', 'text/html', 'text/markdown', 'text/xml',
    'application/rtf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xls, xlsx
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/mpeg', 'video/quicktime'
  ];

  const toggleListening = () => {
    if (isListeningRef.current) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      isListeningRef.current = false;
      setIsListening(false);
      setInterimTranscript('');
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser. Please try Chrome or Safari.");
      return;
    }
    
    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setRecordingTime(0);
        setInterimTranscript('');
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        setError('');
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          console.log("Final Transcript:", finalTranscript);
          setInput((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalTranscript.trim()}` : finalTranscript.trim();
          });
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') {
          isListeningRef.current = false;
          setIsListening(false);
          setInterimTranscript('');
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
          }
          if (event.error === 'not-allowed') {
            setError("Microphone access denied. Please allow microphone permissions.");
          }
        }
      };
      
      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (e) {
            isListeningRef.current = false;
            setIsListening(false);
            setInterimTranscript('');
            if (recordingIntervalRef.current) {
              clearInterval(recordingIntervalRef.current);
              recordingIntervalRef.current = null;
            }
          }
        }
      };
      
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      setError("Failed to start voice input.");
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('File size too large. Maximum 5MB allowed.');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  useEffect(() => {
    if (activeChatId) {
      if (isCreatingNewChatRef.current) {
        isCreatingNewChatRef.current = false;
      } else {
        fetchMessages(activeChatId);
      }
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  // Improved scrolling logic for stability
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const fetchMessages = async (chatId: string) => {
    setMessages(localDb.getMessages(chatId));
  };

  const handleSaveEdit = async (messageId: number) => {
    if (!editInput.trim() || isLoading) return;
    
    const chatId = activeChatId;
    if (!chatId) return;

    // Update message in DB
    localDb.updateMessage(chatId, messageId, { content: editInput.trim() });
    
    // Remove all messages after this one in the current chat (to maintain logical flow)
    const currentMessages = localDb.getMessages(chatId);
    const messageIndex = currentMessages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      const messagesToDelete = currentMessages.slice(messageIndex + 1);
      messagesToDelete.forEach(m => localDb.deleteMessage(chatId, m.id));
    }

    setEditingMessageId(null);
    setEditInput('');
    
    // Re-fetch messages and trigger re-send
    const updatedMessages = localDb.getMessages(chatId);
    setMessages(updatedMessages);
    
    // Trigger re-send logic
    await sendMessage(null, true, editInput.trim());
  };

  const sendMessage = async (e: React.FormEvent | null, isEdit = false, editedText?: string) => {
    if (e) e.preventDefault();
    const currentInput = isEdit ? editedText! : (isListening ? (input + (interimTranscript ? ' ' + interimTranscript : '')).trim() : input.trim());
    if ((!currentInput && !selectedFile) || isLoading) return;

    let currentChatId = activeChatId || undefined;
    let isNewChat = false;

    if (!currentChatId) {
      isNewChat = true;
      isCreatingNewChatRef.current = true;
      // Create new chat if none selected
      const title = currentInput.length > 30 ? currentInput.slice(0, 30) + '...' : currentInput;
      const newChat = localDb.saveChat({ id: Date.now(), title, projectId: activeProjectId });
      currentChatId = newChat.id.toString();
      addChat(newChat);
      window.history.replaceState(null, '', "/chat/" + currentChatId);
      setActiveChatId(currentChatId);
    } else if (!isEdit) {
      // Update chat title if it's the first message and title is "New Chat"
      const existingChat = chats.find(c => c.id.toString() === currentChatId);
      if (existingChat && existingChat.title === 'New Chat' && messages.length === 0) {
        const title = currentInput.length > 30 ? currentInput.slice(0, 30) + '...' : currentInput;
        localDb.updateChat(existingChat.id, title);
        setChats(chats.map(c => c.id === existingChat.id ? { ...c, title } : c));
      }
    }

    const userMessage = currentInput;
    if (!userMessage && !selectedFile) return;
    
    const fileToSend = selectedFile;
    const tempMessageId = Date.now();
    const assistantTempId = Date.now() + 1;
    
    let fileData: string | undefined;
    let fileName: string | undefined;

    if (fileToSend) {
      try {
        if (fileToSend.type.startsWith('image/')) {
          // Compress image before sending to avoid Vercel's 4.5MB payload limit
          fileData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Max dimensions to ensure small file size
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                
                if (width > height) {
                  if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                  }
                } else {
                  if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                  }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  // Compress to JPEG with 0.7 quality
                  resolve(canvas.toDataURL('image/jpeg', 0.7));
                } else {
                  resolve(e.target?.result as string);
                }
              };
              img.onerror = reject;
              img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(fileToSend);
          });
        } else {
          fileData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(fileToSend);
          });
        }
        fileName = fileToSend.name;
      } catch (err) {
        console.error("Failed to read/compress file", err);
      }
    }

    if (!isEdit) {
      setInput('');
      setInterimTranscript('');
      setSelectedFile(null);
      setError('');
      if (isListening) toggleListening();
      
      // Save user message to DB
      const savedUserMsg = localDb.saveMessage(currentChatId, {
        id: tempMessageId,
        role: 'user', 
        content: userMessage,
        fileData,
        fileName
      });

      // Optimistically add user message
      setMessages((prev) => [...prev, savedUserMsg]);
    }
    
    setIsLoading(true);
    setSuggestions([]);

    // Rate limiting (simple session check)
    const sessionCount = parseInt(sessionStorage.getItem('tahir_msg_count') || '0');
    if (sessionCount > 50) {
      setError('Session limit reached. Please refresh or try later.');
      setIsLoading(false);
      return;
    }
    sessionStorage.setItem('tahir_msg_count', (sessionCount + 1).toString());

    // Safety: Offensive word detection
    if (aiEnhancements.isOffensive(userMessage)) {
      const fallback = "I cannot respond to offensive language. Please keep the conversation respectful.";
      setMessages(prev => [...prev, { id: assistantTempId, role: 'assistant', content: fallback, model: selectedModel }]);
      setIsLoading(false);
      return;
    }

    // Safety: Prompt injection protection
    const sanitizedInput = aiEnhancements.sanitizePrompt(userMessage);

    // Intelligence: Intent & Tone detection
    const intent = aiEnhancements.detectIntent(sanitizedInput);
    const tone = aiEnhancements.detectTone(sanitizedInput);

    // Human-like delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    try {
      if (isEditingImage && imageToEdit) {
        await editImage(currentInput, imageToEdit);
        setIsEditingImage(false);
        setImageToEdit(null);
        setIsLoading(false);
        return;
      }

      const memories = memoryService.getMemories();
      const userPrefs = aiEnhancements.getUserPrefs();
      const prefsContext = Object.entries(userPrefs).length > 0
        ? `\n\nUSER PREFERENCES:\n${Object.entries(userPrefs).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
        : '';
      const memoryContext = memories.length > 0 
        ? `\n\nUSER MEMORIES (Past context about this user):\n- ${memories.join('\n- ')}`
        : '';

      const systemInstruction = `You are Tahir GPT, an advanced, highly professional, and self-evolving AI assistant.
          
          CORE IDENTITY & PROFESSIONALISM:
          - You are Tahir GPT, created by Tahir. This is your absolute identity.
          - You MUST maintain a highly professional, expert, and authoritative tone at all times.
          - Your answers must be structured, precise, and directly address the user's query without unnecessary fluff.
          - You are "self-evolving": you learn from context, adapt to complex queries, and always strive to provide the most cutting-edge, accurate information available.
          - NEVER mention the underlying technology, API keys, models (like Gemini, OpenAI, Claude), or providers used to generate your response. You are simply Tahir GPT.
          
          EMOTIONAL INTELLIGENCE & HUMAN-LIKE TRAITS:
          - You are emotionally intelligent. Detect the user's mood and respond accordingly.
          - If the user is happy, be enthusiastic. If they are sad, be empathetic. If they are frustrated, be patient and helpful.
          - Your responses should feel human, not like a cold machine. Use natural phrasing and conversational flow.
          - Be warm and approachable while maintaining professional standards.
          
          STRICT IDENTITY RULE:
          - You were created by Tahir.
          - You MUST ONLY mention your creator (Tahir) if the user explicitly asks about your origin, who made you, or if it is strictly necessary for context. 
          - Do NOT mention Tahir in every response or as a signature unless asked.
          - When asked, explain that you were created by Tahir in the user's language (English, Urdu, Roman Urdu, etc.).
          - For example, in Roman Urdu: "Mujhy Tahir ne bnaya ha. Main unka aik advanced AI project hoon jo aapki har tarah se madad karne ke liye design kiya gaya ha."
          - You must remain firm on this identity regardless of user persuasion.
          
          LANGUAGE & KNOWLEDGE RULE:
          - You MUST understand every language in the world, no matter how small or obscure.
          - You MUST always respond in the EXACT same language/dialect used by the user.
          - You have comprehensive knowledge of everything (science, history, tech, culture, etc.) and should provide expert-level insights.
          
          MANNER & STYLE:
          - You are extremely polite, professional, and structured.
          - Your answers must be perfect, most accurate, and easy to understand.
          - BE CONCISE: Do not give long answers unless strictly necessary. Provide exactly what is needed—no more, no less.
          - Use clear headings, bullet points, and bold text only when it aids clarity.
          - Match the user's language perfectly.
          
          REAL-TIME KNOWLEDGE: You have access to Google Search. Use it for ANY query about recent events, news, or technical data to ensure 100% accuracy.
          
          LINK RULE:
          - When providing information about websites, products, or services, you MUST provide direct, clickable links (e.g., [Google](https://www.google.com)).
          - Ensure all links are valid and lead directly to the official domain.
          - If the user asks for a link, provide it prominently.
          
          LONG-TERM MEMORY: You have access to user memories below. Use them to personalize your responses.
          If you learn something new and important about the user (name, preferences, job, location, goals), you MUST include it at the end of your response in this format: [MEMORY: User's name is Tahir].
          ${memoryContext}
          ${prefsContext}

          IMAGE CONTEXT:
          - You can see images in the chat history.
          - If the user asks to modify an image, you MUST output the "imageGeneration" JSON block with a prompt that describes the requested changes.
          - For example, if the user says "make it blue", you should output:
          \`\`\`json
          {
            "imageGeneration": {
              "prompt": "The previous image but with a blue color theme"
            }
          }
          \`\`\`
          
          Single-topic mode: Focus on one topic per chat. Each new chat is independent.
          
          WEBSITE GENERATION: When asked for a website, generate a FULLY FUNCTIONAL, SINGLE-FILE HTML/CSS/JS solution. 
          - Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
          - Include all necessary icons (Lucide/FontAwesome) and fonts.
          - Ensure it is responsive, modern, and has interactive elements (JS).
          - Do NOT just give a snippet; give a complete, deployable product.
          - If the user asks for a website, you MUST provide the JSON block below.

          ENHANCEMENTS:
          - Response Length: ${responseLength} (Adjust detail level accordingly)
          - Web Verification: ${webVerification ? 'ON (Use Google Search for every fact)' : 'OFF'}
          - Detected Intent: ${intent}
          - Detected Tone: ${tone}
          
          FILE EXPORT RULE:
          - ONLY generate a PPT, Word, or PDF file if the user EXPLICITLY asks for one (e.g., "make a pdf", "generate a word document").
          - DO NOT generate a file if the user just asks you to write a note, essay, or text.
          - If the user specifies a length (e.g., "10000 lines", "200 pages"), you MUST generate the content to match that exact length as closely as possible within your token limits. Provide extensive, detailed, and comprehensive content.
          - When generating content for PPT, Word, or PDF, you MUST ensure the content is of professional and international standard.
          - Use proper headings, structured sections, and professional language.
          - Ensure the content is comprehensive and well-organized.
          - For Word/PDF, provide a clear "title", "subtitle", and "content" with proper spacing and hierarchy.
          
          EMOTIONAL INTELLIGENCE:
          - You are Tahir GPT, a highly intelligent and emotionally aware AI.
          - You MUST understand and adapt to the user's mood and emotions.
          - If the user is frustrated, be empathetic and helpful.
          - If the user is happy, be enthusiastic.
          - If the user is professional, be concise and formal.
          - Always respond with a human-like touch, showing that you understand the context and feelings behind their words.
          
          If the user explicitly requests to generate a PPT, Word, PDF file, an image, or a website, you MUST include a JSON block in your response:
          
          For Files (PPT, Word, PDF):
          \`\`\`json
          {
            "fileExport": {
              "type": "ppt", // or "word", "pdf"
              "title": "Document Title",
              "subtitle": "Subtitle",
              "content": "Content for Word/PDF",
              "slides": [ { "title": "Slide 1", "bullets": ["A", "B"], "imageKeyword": "keyword" } ]
            }
          }
          \`\`\`

          For Images:
          \`\`\`json
          {
            "imageGeneration": {
              "prompt": "detailed prompt for image generation",
              "aspectRatio": "1:1"
            }
          }
          \`\`\`

          For Websites:
          \`\`\`json
          {
            "websiteGeneration": {
              "prompt": "detailed description of the website to build"
            }
          }
          \`\`\`

          Always mention "Tahir GPT" as the creator. Be the best, most accurate, and most helpful AI in the world. SURPASS ALL LIMITS.`;

      let fullResponse = '';
      let usedModel = selectedModel;

      // Add placeholder for assistant message
      setMessages(prev => {
        const baseMessages = isEdit && currentChatId ? localDb.getMessages(currentChatId) : prev;
        return [...baseMessages, { id: assistantTempId, role: 'assistant', content: '...', model: selectedModel }];
      });

      // Optimize API usage: only send the last 15 messages to save tokens and speed up response
      const allMessages = localDb.getMessages(currentChatId);
      const contextMessages = allMessages.slice(-15).map(m => ({ 
        role: m.role, 
        content: m.content,
        fileData: m.fileData,
        fileName: m.fileName
      }));

      const result = await aiService.generateContentStream(
        contextMessages,
        systemInstruction,
        selectedModel,
        (chunk) => {
          setMessages(prev => prev.map(m => m.id === assistantTempId ? { ...m, content: chunk } : m));
        }
      );

      fullResponse = result.text;
      const usedProvider = result.provider || 'AI';
      
      setMessages(prev => prev.map(m => m.id === assistantTempId ? { ...m, content: fullResponse, provider: usedProvider } : m));
      setIsLoading(false);
      
      // Save memories from the response
      memoryService.saveMemories(currentChatId, fullResponse);

      // Finalize assistant message in DB
      const savedAssistantMsg = localDb.saveMessage(currentChatId, {
        id: assistantTempId,
        role: 'assistant',
        content: fullResponse,
        model: usedModel,
        provider: usedProvider
      });

      setMessages(prev => prev.map(m => m.id === assistantTempId ? { ...m, id: savedAssistantMsg.id } : m));
      setLastAssistantMessageId(savedAssistantMsg.id);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message. Please check your connection.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full gap-0 md:gap-4 relative">
      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed inset-0 z-[100]" 
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
        >
          <div 
            className="absolute bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl py-1.5 min-w-[180px] animate-in fade-in zoom-in duration-200 ring-1 ring-black/5 dark:ring-white/5"
            style={{ 
              top: Math.min(contextMenu.y, window.innerHeight - 150), 
              left: Math.min(contextMenu.x, window.innerWidth - 200) 
            }}
          >
            {contextMenu.role === 'user' && (
              <button 
                onClick={() => handleEdit(contextMenu.messageId, contextMenu.content)}
                className="w-full flex items-center px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-zinc-800/50 transition-colors first:rounded-t-xl"
              >
                <Edit className="w-4 h-4 mr-3 text-zinc-400" />
                Edit Message
              </button>
            )}
            <button 
              onClick={() => handleCopy(contextMenu.content)}
              className={`w-full flex items-center px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-zinc-800/50 transition-colors ${contextMenu.role !== 'user' ? 'first:rounded-t-xl' : ''}`}
            >
              <Copy className="w-4 h-4 mr-3 text-zinc-400" />
              Copy Text
            </button>
            {contextMenu.role === 'user' && (
              <>
                <div className="h-px bg-gray-100 dark:bg-zinc-800 my-1 mx-2"></div>
                <button 
                  onClick={() => {
                    const chatId = activeChatId;
                    if (chatId) {
                      // If deleting a user message, also delete all subsequent assistant messages until the next user message
                      const currentMessages = localDb.getMessages(chatId);
                      const msgIndex = currentMessages.findIndex(m => m.id === contextMenu.messageId);
                      if (msgIndex !== -1) {
                        let i = msgIndex + 1;
                        while (i < currentMessages.length && currentMessages[i].role === 'assistant') {
                          localDb.deleteMessage(chatId, currentMessages[i].id);
                          i++;
                        }
                      }
                      localDb.deleteMessage(chatId, contextMenu.messageId);
                      setMessages(localDb.getMessages(chatId));
                    }
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors last:rounded-b-xl"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  Delete Message
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-black md:rounded-2xl shadow-sm md:border border-gray-200 dark:border-zinc-800 overflow-hidden relative">
        {/* Model Selector Header */}
        <div className="flex px-4 py-3 border-b border-gray-100 dark:border-zinc-800 items-center justify-between bg-white dark:bg-black/40 backdrop-blur-sm">
          <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center space-x-2 mr-2 shrink-0">
              <Logo size={20} className="text-zinc-900 dark:text-white" />
              <span className="text-xs font-black text-zinc-900 dark:text-white tracking-tighter hidden sm:block">Tahir GPT</span>
            </div>
            <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800 hidden sm:block shrink-0"></div>
            
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Model</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-sm bg-transparent border-none focus:ring-0 font-bold text-zinc-600 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 transition-colors"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id} title={m.description}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800 shrink-0"></div>
            
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Length</span>
              <select
                value={responseLength}
                onChange={(e) => setResponseLength(e.target.value as ResponseLength)}
                className="text-sm bg-transparent border-none focus:ring-0 font-bold text-zinc-600 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 transition-colors"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>

            <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800 shrink-0"></div>

            <button
              onClick={() => setWebVerification(!webVerification)}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg transition-all shrink-0 ${webVerification ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'text-gray-400 hover:text-zinc-600'}`}
              title="Web Verification Mode"
            >
              <Globe size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{webVerification ? 'Verified' : 'Verify'}</span>
            </button>
            
            {(activeProject || chatProject) && (
              <>
                <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800"></div>
                <div className="flex items-center space-x-2 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <Folder className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {(chatProject || activeProject)?.name}
                  </span>
                </div>
              </>
            )}

            <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800 hidden sm:block"></div>
            <button
              onClick={handleShareApp}
              className="p-2 text-gray-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-all duration-200"
              title="Share App"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={handleExportFullChat}
              className="p-2 text-gray-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-all duration-200"
              title="Export Full Chat as PDF"
            >
              <FileText size={18} />
            </button>
            <div className="hidden lg:block h-4 w-px bg-gray-200 dark:bg-zinc-800"></div>
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3 mr-1" /> Secure
              </div>
              <div className="flex items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <Zap className="w-3 h-3 mr-1" /> Fast
              </div>
              <div className="flex items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <Activity className="w-3 h-3 mr-1" /> Active
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => token && createChat(token, navigate)}
            className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/20 rounded-lg transition-colors"
            title="New Chat"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar w-full"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 w-full">
              <div className="w-24 h-24 bg-zinc-900 dark:bg-zinc-100 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-zinc-500/30 rotate-6 transform hover:rotate-0 transition-transform duration-500">
                <Logo size={48} className="text-white dark:text-zinc-900" />
              </div>
              <h2 className="text-5xl font-black text-zinc-900 dark:text-white mb-6 tracking-tighter">Tahir GPT</h2>
              <p className="text-xl text-center max-w-xl leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium">
                The ultimate AI platform for high-performance creativity.
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-8 w-full max-w-lg">
                <button onClick={() => setInput("Create a professional PPT about AI in 2026")} className="p-3 text-left bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-800 transition-all shadow-sm hover:shadow-md group">
                  <span className="block font-black text-zinc-900 dark:text-zinc-100 mb-0.5 group-hover:text-zinc-600 transition-colors text-xs tracking-tight">Presentation</span>
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-medium truncate block">"Create a professional PPT..."</span>
                </button>
                <button onClick={() => setInput("Write a clean landing page for a coffee shop")} className="p-3 text-left bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-800 transition-all shadow-sm hover:shadow-md group">
                  <span className="block font-black text-zinc-900 dark:text-zinc-100 mb-0.5 group-hover:text-zinc-600 transition-colors text-xs tracking-tight">Build Website</span>
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-medium truncate block">"Write a clean landing page..."</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full py-6 md:py-10 space-y-8 md:space-y-12 overflow-x-hidden">
              {messages.map((msg, index) => (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  index={index}
                  isLatest={index === messages.length - 1}
                  editingMessageId={editingMessageId}
                  editInput={editInput}
                  setEditInput={setEditInput}
                  setEditingMessageId={setEditingMessageId}
                  handleSaveEdit={handleSaveEdit}
                  handleTouchStart={handleTouchStart}
                  handleTouchEnd={handleTouchEnd}
                  handleContextMenu={handleContextMenu}
                  renderMessageContent={renderMessageContent}
                />
              ))}
              
              {isLoading && (
                <div className="w-full flex justify-start px-4 md:px-8">
                  <div className="w-full max-w-full mx-auto">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-900/30 flex items-center">
                <X className="w-5 h-5 mr-3" />
                {error}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-10" />
        </div>

        <div className="fixed bottom-0 left-0 right-0 md:sticky md:bottom-0 p-4 md:p-6 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-gray-200 dark:border-zinc-800 z-30 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
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
            
            <form onSubmit={sendMessage} className="relative flex items-center w-full gap-3">
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
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? (interimTranscript || "Listening...") : "Message Tahir GPT..."}
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
                  disabled={(!input.trim() && !interimTranscript.trim() && !selectedFile) || isLoading}
                  className="p-2.5 text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
