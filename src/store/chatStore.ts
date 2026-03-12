import { create } from 'zustand';
import { localDb, safeSetItem } from '../utils/localDb';

interface Chat {
  id: number;
  title: string;
  projectId?: number | null;
}

interface Project {
  id: number;
  name: string;
  workspaceId: number;
  created_at: string;
}

interface Workspace {
  id: number;
  name: string;
  created_at: string;
}

interface Message {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant';
  content: string;
  file_url?: string;
  created_at: string;
}

interface ChatState {
  chats: Chat[];
  projects: Project[];
  workspaces: Workspace[];
  activeChatId: string | null;
  activeProjectId: number | null;
  activeWorkspaceId: number | null;
  setActiveChatId: (id: string | null) => void;
  setActiveProjectId: (id: number | null) => void;
  setActiveWorkspaceId: (id: number | null) => void;
  setChats: (chats: Chat[]) => void;
  setProjects: (projects: Project[]) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addChat: (chat: Chat) => void;
  removeChat: (id: number) => void;
  createChat: (token: string, navigate: (path: string) => void, projectId?: number | null) => Promise<void>;
  createProject: (name: string, workspaceId: number) => void;
  updateProject: (id: number, name: string) => void;
  deleteProject: (id: number) => void;
  createWorkspace: (name: string) => void;
  updateWorkspace: (id: number, name: string) => void;
  deleteWorkspace: (id: number) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  projects: [],
  workspaces: [],
  activeChatId: null,
  activeProjectId: JSON.parse(localStorage.getItem('activeProjectId') || 'null'),
  activeWorkspaceId: JSON.parse(localStorage.getItem('activeWorkspaceId') || 'null'),
  setActiveChatId: (id) => set({ activeChatId: id }),
  setActiveProjectId: (id) => {
    safeSetItem('activeProjectId', JSON.stringify(id));
    set({ activeProjectId: id });
  },
  setActiveWorkspaceId: (id) => {
    safeSetItem('activeWorkspaceId', JSON.stringify(id));
    set({ activeWorkspaceId: id });
  },
  setChats: (chats) => set({ chats }),
  setProjects: (projects) => set({ projects }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),
  removeChat: (id) => set((state) => ({ chats: state.chats.filter(c => c.id !== id) })),
  createChat: async (token, navigate, projectId?: number | null) => {
    const pId = projectId !== undefined ? projectId : get().activeProjectId;
    const newChat = localDb.saveChat({ id: Date.now(), title: 'New Chat', projectId: pId });
    get().addChat(newChat);
    navigate("/chat/" + newChat.id);
  },
  createProject: (name, workspaceId) => {
    const newProject = localDb.saveProject({ name, workspaceId });
    set((state) => ({ projects: [newProject, ...state.projects] }));
  },
  updateProject: (id, name) => {
    localDb.updateProject(id, name);
    set((state) => ({ projects: state.projects.map(p => p.id === id ? { ...p, name } : p) }));
  },
  deleteProject: (id) => {
    localDb.deleteProject(id);
    set((state) => ({ 
      projects: state.projects.filter(p => p.id !== id),
      chats: state.chats.filter(c => c.projectId !== id)
    }));
  },
  createWorkspace: (name) => {
    const newWorkspace = localDb.saveWorkspace({ name });
    set((state) => ({ workspaces: [newWorkspace, ...state.workspaces] }));
  },
  updateWorkspace: (id, name) => {
    localDb.updateWorkspace(id, name);
    set((state) => ({ workspaces: state.workspaces.map(w => w.id === id ? { ...w, name } : w) }));
  },
  deleteWorkspace: (id) => {
    localDb.deleteWorkspace(id);
    set((state) => ({ 
      workspaces: state.workspaces.filter(w => w.id !== id),
      projects: state.projects.filter(p => p.workspaceId !== id),
      chats: state.chats.filter(c => {
        const project = state.projects.find(p => p.id === c.projectId);
        return project?.workspaceId !== id;
      })
    }));
  }
}));
