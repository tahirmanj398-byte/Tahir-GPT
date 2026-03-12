export const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      try {
        // 1. Clear old messages first
        const chats = localDb.getChats();
        if (chats.length > 0) {
          // Keep only the 5 most recent chats
          const toKeep = chats.slice(0, 5);
          const toDelete = chats.slice(5);
          toDelete.forEach((chat: any) => {
            localStorage.removeItem(`tahir_messages_${chat.id}`);
          });
          localStorage.setItem('tahir_chats', JSON.stringify(toKeep));

          // Strip imageUrls from remaining chats to free up massive amounts of space
          toKeep.forEach((chat: any) => {
            try {
              const msgs = JSON.parse(localStorage.getItem(`tahir_messages_${chat.id}`) || '[]');
              let modified = false;
              const strippedMsgs = msgs.map((m: any) => {
                if (m.imageUrl || m.fileData) {
                  modified = true;
                  const { imageUrl, fileData, ...rest } = m;
                  return rest;
                }
                return m;
              });
              if (modified) {
                localStorage.setItem(`tahir_messages_${chat.id}`, JSON.stringify(strippedMsgs));
              }
            } catch (e) {}
          });
        }

        // 2. Clear old images if still exceeding quota
        const images = localDb.getImages();
        if (images.length > 0) {
          // If we hit quota, clear all images from history to make room
          localStorage.setItem('tahir_images', JSON.stringify([]));
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      // Try again
      try {
        localStorage.setItem(key, value);
        return;
      } catch (retryError) {
        // If it still fails, the item is simply too large for localStorage (e.g. a massive base64 image).
        // We fail silently to avoid crashing the app or showing scary console errors.
        // The data will still exist in memory for the current session.
        return;
      }
    } else {
      throw e;
    }
  }
};

export const localDb = {
  // Auth
  login: (email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem('tahir_users') || '[]');
    const user = users.find((u: any) => u.email === email && u.password === password);
    if (user) {
      const token = btoa(email + Date.now());
      return { token, user: { id: user.id, email: user.email } };
    }
    throw new Error('Invalid credentials');
  },
  signup: (email: string, password: string, securityQuestion: string, securityAnswer: string) => {
    const users = JSON.parse(localStorage.getItem('tahir_users') || '[]');
    if (users.find((u: any) => u.email === email)) throw new Error('Email already exists');
    const newUser = { id: Date.now(), email, password, securityQuestion, securityAnswer };
    safeSetItem('tahir_users', JSON.stringify([...users, newUser]));
    return { id: newUser.id, email: newUser.email };
  },
  resetPassword: (email: string, securityAnswer: string, newPassword: string) => {
    const users = JSON.parse(localStorage.getItem('tahir_users') || '[]');
    const userIndex = users.findIndex((u: any) => u.email === email && u.securityAnswer.toLowerCase() === securityAnswer.toLowerCase());
    if (userIndex === -1) throw new Error('Invalid email or security answer');
    
    users[userIndex].password = newPassword;
    safeSetItem('tahir_users', JSON.stringify(users));
    return true;
  },
  getSecurityQuestion: (email: string) => {
    const users = JSON.parse(localStorage.getItem('tahir_users') || '[]');
    const user = users.find((u: any) => u.email === email);
    if (!user) throw new Error('User not found');
    return user.securityQuestion;
  },

  getUsersCount: () => {
    try { return JSON.parse(localStorage.getItem('tahir_users') || '[]').length; } catch { return 0; }
  },
  // Workspaces
  getWorkspaces: () => {
    try { return JSON.parse(localStorage.getItem('tahir_workspaces') || '[]'); } catch { return []; }
  },
  saveWorkspace: (workspace: any) => {
    const workspaces = localDb.getWorkspaces();
    const newWorkspace = { ...workspace, id: workspace.id || Date.now(), created_at: new Date().toISOString() };
    safeSetItem('tahir_workspaces', JSON.stringify([newWorkspace, ...workspaces]));
    return newWorkspace;
  },
  updateWorkspace: (id: number, name: string) => {
    const workspaces = localDb.getWorkspaces();
    const updated = workspaces.map((w: any) => w.id === id ? { ...w, name } : w);
    safeSetItem('tahir_workspaces', JSON.stringify(updated));
  },
  deleteWorkspace: (id: number) => {
    const workspaces = localDb.getWorkspaces().filter((w: any) => w.id !== id);
    safeSetItem('tahir_workspaces', JSON.stringify(workspaces));
    // Delete projects in this workspace
    const projects = localDb.getProjects().filter((p: any) => p.workspaceId === id);
    projects.forEach((p: any) => localDb.deleteProject(p.id));
  },
  // Projects
  getProjects: () => {
    try { return JSON.parse(localStorage.getItem('tahir_projects') || '[]'); } catch { return []; }
  },
  saveProject: (project: any) => {
    const projects = localDb.getProjects();
    const newProject = { ...project, id: project.id || Date.now(), created_at: new Date().toISOString() };
    safeSetItem('tahir_projects', JSON.stringify([newProject, ...projects]));
    return newProject;
  },
  updateProject: (id: number, name: string) => {
    const projects = localDb.getProjects();
    const updated = projects.map((p: any) => p.id === id ? { ...p, name } : p);
    safeSetItem('tahir_projects', JSON.stringify(updated));
  },
  deleteProject: (id: number) => {
    const projects = localDb.getProjects().filter((p: any) => p.id !== id);
    safeSetItem('tahir_projects', JSON.stringify(projects));
    // Also delete chats in this project
    const chats = localDb.getChats().filter((c: any) => c.projectId === id);
    chats.forEach((c: any) => localDb.deleteChat(c.id));
  },
  // Chats
  getChats: () => {
    try { return JSON.parse(localStorage.getItem('tahir_chats') || '[]'); } catch { return []; }
  },
  saveChat: (chat: any) => {
    const chats = localDb.getChats();
    safeSetItem('tahir_chats', JSON.stringify([chat, ...chats]));
    return chat;
  },
  updateChat: (id: number, title: string) => {
    const chats = localDb.getChats();
    const updatedChats = chats.map((c: any) => c.id === id ? { ...c, title } : c);
    safeSetItem('tahir_chats', JSON.stringify(updatedChats));
  },
  deleteChat: (id: string) => {
    const chats = localDb.getChats().filter((c: any) => c.id.toString() !== id.toString());
    safeSetItem('tahir_chats', JSON.stringify(chats));
    localStorage.removeItem(`tahir_messages_${id}`);
  },
  clearAllChats: () => {
    const chats = localDb.getChats();
    chats.forEach((c: any) => localStorage.removeItem(`tahir_messages_${c.id}`));
    safeSetItem('tahir_chats', JSON.stringify([]));
  },

  // Messages
  getMessages: (chatId: string) => {
    try { return JSON.parse(localStorage.getItem(`tahir_messages_${chatId}`) || '[]'); } catch { return []; }
  },
  saveMessage: (chatId: string, msg: any) => {
    const msgs = localDb.getMessages(chatId);
    const newMsg = { ...msg, id: msg.id || Date.now() };
    // Keep only the last 20 messages per chat for performance
    const updatedMsgs = [...msgs, newMsg].slice(-20);
    safeSetItem(`tahir_messages_${chatId}`, JSON.stringify(updatedMsgs));
    return newMsg;
  },
  updateMessage: (chatId: string, messageId: number, updates: any) => {
    const msgs = localDb.getMessages(chatId);
    const updatedMsgs = msgs.map((m: any) => m.id === messageId ? { ...m, ...updates } : m);
    safeSetItem(`tahir_messages_${chatId}`, JSON.stringify(updatedMsgs));
  },
  deleteMessage: (chatId: string, messageId: number) => {
    const msgs = localDb.getMessages(chatId);
    const updatedMsgs = msgs.filter((m: any) => m.id !== messageId);
    safeSetItem(`tahir_messages_${chatId}`, JSON.stringify(updatedMsgs));
  },

  // Images
  getImages: () => {
    try { return JSON.parse(localStorage.getItem('tahir_images') || '[]'); } catch { return []; }
  },
  saveImage: (img: any) => {
    const imgs = localDb.getImages();
    const newImg = { ...img, id: img.id || Date.now(), created_at: new Date().toISOString() };
    // Keep the last 20 images to ensure performance and stability and avoid quota issues
    const updatedImgs = [newImg, ...imgs].slice(0, 20);
    safeSetItem('tahir_images', JSON.stringify(updatedImgs));
    return newImg;
  },
  deleteImage: (id: number) => {
    const imgs = localDb.getImages().filter((i: any) => i.id !== id);
    safeSetItem('tahir_images', JSON.stringify(imgs));
  },
  clearAllImages: () => {
    safeSetItem('tahir_images', JSON.stringify([]));
  },

  // Websites
  getWebsites: () => {
    try { return JSON.parse(localStorage.getItem('tahir_websites') || '[]'); } catch { return []; }
  },
  saveWebsite: (website: any) => {
    const websites = localDb.getWebsites();
    const newWebsite = { ...website, id: website.id || Date.now(), created_at: new Date().toISOString() };
    const updatedWebsites = [newWebsite, ...websites].slice(0, 20);
    safeSetItem('tahir_websites', JSON.stringify(updatedWebsites));
    return newWebsite;
  },
  updateWebsite: (id: number, updates: any) => {
    const websites = localDb.getWebsites();
    const updatedWebsites = websites.map((w: any) => w.id === id ? { ...w, ...updates } : w);
    safeSetItem('tahir_websites', JSON.stringify(updatedWebsites));
  },
  deleteWebsite: (id: number) => {
    const websites = localDb.getWebsites().filter((w: any) => w.id !== id);
    safeSetItem('tahir_websites', JSON.stringify(websites));
  },
  // Maintenance
  optimizeStorage: () => {
    try {
      // Keep only the last 10 chats
      const chats = localDb.getChats();
      if (chats.length > 10) {
        const toKeep = chats.slice(0, 10);
        const toDelete = chats.slice(10);
        toDelete.forEach(c => localStorage.removeItem(`tahir_messages_${c.id}`));
        safeSetItem('tahir_chats', JSON.stringify(toKeep));
      }
    } catch (e) {
      console.error('Storage optimization failed', e);
    }
  }
};
