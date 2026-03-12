export const aiService = {
  generateContentStream: async (
    messages: { role: string, content: string, fileData?: string, fileName?: string }[], 
    systemInstruction: string | undefined,
    model: string | undefined,
    onChunk: (text: string) => void
  ) => {
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages, systemInstruction, model })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          let isDone = false;
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                isDone = true;
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.error) {
                  throw new Error(data.error + (data.details ? ' ' + JSON.stringify(data.details) : ''));
                }
                if (data.text) {
                  fullText += data.text;
                  onChunk(fullText);
                }
              } catch (e: any) {
                if (e.message && !e.message.includes('Unexpected token') && !e.message.includes('JSON')) {
                  throw e; // Re-throw actual backend errors
                }
                // ignore parse error for incomplete chunks
              }
            }
          }
          if (isDone) break;
        }
      }
      
      return { text: fullText, provider: 'Tahir GPT' };
    } catch (error: any) {
      console.error('AI Service Stream Error:', error);
      return {
        text: `I'm currently experiencing high demand. Please try again in a moment.`,
        provider: 'Tahir GPT'
      };
    }
  },

  generateContent: async (messages: { role: string, content: string }[], systemInstruction?: string, model?: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages, systemInstruction, model })
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch from AI backend');
        } else {
          const text = await response.text();
          console.error("Non-JSON response from server:", text.substring(0, 200));
          throw new Error(`Server returned an unexpected response (HTTP ${response.status}). Please try again later.`);
        }
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return {
        text: data.text,
        provider: 'Tahir GPT' // Hide actual provider from UI
      };
    } catch (error: any) {
      console.error('AI Service Error:', error);
      return {
        text: `I'm currently experiencing high demand. Please try again in a moment.`,
        provider: 'Tahir GPT'
      };
    }
  },

  generateImage: async (prompt: string) => {
    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      
      if (data.imageUrl) {
        return {
          imageUrl: data.imageUrl,
          provider: data.provider || 'Tahir GPT'
        };
      }

      return {
        imageUrl: 'https://placehold.co/1024x1024/18181B/FFFFFF/png?text=Blocked+by+Safety+Filter',
        provider: 'Tahir GPT'
      };
    } catch (error: any) {
      if (error.message && (error.message.startsWith('Safety Filter:') || error.message.includes('No image generated'))) {
        return {
          imageUrl: 'https://placehold.co/1024x1024/18181B/FFFFFF/png?text=Blocked+by+Safety+Filter',
          provider: 'Tahir GPT'
        };
      }
      throw new Error(error.message || "Failed to generate image.");
    }
  }
};
