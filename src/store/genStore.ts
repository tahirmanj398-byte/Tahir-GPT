import { create } from 'zustand';
import { aiService } from '../services/aiService';
import { localDb, safeSetItem } from '../utils/localDb';

interface GenState {
  // Website
  websitePrompt: string;
  websiteCode: string;
  websiteUrl: string;
  isWebsiteGenerating: boolean;
  isWebsiteDeploying: boolean;
  websiteError: string;
  setWebsiteState: (state: Partial<GenState>) => void;
  generateWebsite: (prompt: string, existingCode: string, fileContext?: { data: string, mimeType: string }) => Promise<void>;
  deployWebsite: (htmlCode: string, websiteId?: number) => Promise<void>;

  // Image
  imagePrompt: string;
  imageUrl: string;
  isImageGenerating: boolean;
  imageError: string;
  setImageState: (state: Partial<GenState>) => void;
  generateImage: (prompt: string, fileContext?: { data: string, mimeType: string }) => Promise<void>;
  editImage: (prompt: string, existingImageUrl: string) => Promise<void>;
}

export const useGenStore = create<GenState>((set, get) => ({
  websitePrompt: '',
  websiteCode: '',
  websiteUrl: '',
  isWebsiteGenerating: false,
  isWebsiteDeploying: false,
  websiteError: '',
  setWebsiteState: (state) => set((prev) => ({ ...prev, ...state })),

  deployWebsite: async (htmlCode: string, websiteId?: number) => {
    set({ isWebsiteDeploying: true });
    try {
      // Since we are "serverless", we'll use a data URL for the "deployment"
      // This allows the user to view their website without a backend
      const blob = new Blob([htmlCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      set({ websiteUrl: url });
      
      if (websiteId) {
        localDb.updateWebsite(websiteId, { url });
      }
    } catch (err: any) {
      console.error('Deployment error:', err);
      set({ websiteError: `Preview failed: ${err.message}` });
    } finally {
      set({ isWebsiteDeploying: false });
    }
  },

  generateWebsite: async (prompt: string, existingCode: string, fileContext?: { data: string, mimeType: string }) => {
    if (!prompt.trim() && !fileContext && get().isWebsiteGenerating) return;

    set({ isWebsiteGenerating: true, websiteError: '', websiteCode: '', websiteUrl: '' });

    try {
      const aiPrompt = existingCode 
        ? `Modify the following HTML code based on this new request: '${prompt}'.\n\nExisting Code:\n\`\`\`html\n${existingCode}\n\`\`\`\n\nReturn ONLY the updated raw HTML code. No markdown, no talk.`
        : `Generate a high-level, professional, fully functional single-file HTML website with Tailwind CSS and JS based on: ${prompt}. Return ONLY the raw HTML code. No markdown, no talk. Ensure it is responsive and modern.`;

      const systemInstruction = `You are Tahir GPT's expert web developer. You generate enterprise-grade, fully functional, single-file HTML/CSS/JS solutions. 
          - Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
          - Include all necessary icons (Lucide/FontAwesome) and fonts.
          - Ensure it is responsive, modern, and has interactive elements (JS).
          - Do NOT just give a snippet; give a complete, deployable product.
          - Always mention "Tahir GPT" as the creator in the footer.`;

      const result = await aiService.generateContent([{ role: 'user', content: aiPrompt }], systemInstruction);
      let aiResponse = result.text || '';

      // Clean up markdown if AI still includes it
      const htmlMatch = aiResponse.match(/```html([\s\S]*?)```/) || aiResponse.match(/```([\s\S]*?)```/);
      if (htmlMatch) {
        aiResponse = htmlMatch[1].trim();
      } else {
        aiResponse = aiResponse.replace(/```html/gi, '').replace(/```/g, '').trim();
      }

      set({ websiteCode: aiResponse });
      
      // Save to history
      const savedWebsite = localDb.saveWebsite({ prompt, code: aiResponse });
      
      // Automatically trigger deployment (preview)
      await get().deployWebsite(aiResponse, savedWebsite.id);
    } catch (err: any) {
      set({ websiteError: err.message });
    } finally {
      set({ isWebsiteGenerating: false });
    }
  },

  imagePrompt: '',
  imageUrl: '',
  isImageGenerating: false,
  imageError: '',
  setImageState: (state) => set((prev) => ({ ...prev, ...state })),

  generateImage: async (prompt: string, fileContext?: { data: string, mimeType: string }) => {
    if (!prompt.trim() && !fileContext && get().isImageGenerating) return;

    set({ isImageGenerating: true, imageError: '', imageUrl: '' });

    try {
      const result = await aiService.generateImage(prompt);
      const imageUrl = result.imageUrl;
      console.log("Generated Image URL:", imageUrl);

      localDb.saveImage({ prompt, image_url: imageUrl });
      set({ imagePrompt: '', imageUrl });
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error';
      set({ imageError: `Failed to generate image: ${errorMsg}. Please try again.` });
    } finally {
      set({ isImageGenerating: false });
    }
  },

  editImage: async (prompt: string, existingImageUrl: string) => {
    if (!prompt.trim() || !existingImageUrl || get().isImageGenerating) return;

    set({ isImageGenerating: true, imageError: '', imageUrl: '' });

    try {
      const result = await aiService.generateImage(`Modify this image: ${prompt}`);
      const imageUrl = result.imageUrl;

      localDb.saveImage({ prompt: `Edit: ${prompt}`, image_url: imageUrl });
      set({ imagePrompt: '', imageUrl });
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error';
      set({ imageError: `Failed to edit image: ${errorMsg}. Please try again.` });
    } finally {
      set({ isImageGenerating: false });
    }
  }
}));
