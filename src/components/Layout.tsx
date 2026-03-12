import { Outlet, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { localDb } from '../utils/localDb';
import { useChatStore } from '../store/chatStore';
import { MessageSquare, Grid, Code, User, LogOut, Menu, X, Plus, Search, Trash2, MoreHorizontal, Edit, FolderPlus, ChevronRight, Folder, Sun, Moon, Share2, History } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import Footer from './Footer';
import AdBanner from './AdBanner';
import Logo from './Logo';

export default function Layout() {
  const { logout, user, token } = useAuthStore();
  const { 
    chats, setChats, addChat, removeChat, createChat, activeChatId, 
    projects, setProjects, createProject, updateProject, deleteProject, activeProjectId, setActiveProjectId,
    workspaces, setWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, activeWorkspaceId, setActiveWorkspaceId
  } = useChatStore();
  const { theme, toggleTheme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [confirmDeleteChatId, setConfirmDeleteChatId] = useState<number | null>(null);
  const [confirmDeleteWorkspaceId, setConfirmDeleteWorkspaceId] = useState<number | null>(null);
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<number | null>(null);
  const [openWorkspaceIds, setOpenWorkspaceIds] = useState<number[]>([]);
  const [openProjectIds, setOpenProjectIds] = useState<number[]>([]);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<number | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState<number | null>(null);
  const [newProjectName, setNewProjectName] = useState('');

  const isStudioPage = location.pathname === '/' || 
                       location.pathname.startsWith('/chat/') || 
                       location.pathname === '/gpts' || 
                       location.pathname === '/website';

  useEffect(() => {
    // Initialize theme on mount
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, [setTheme]);

  useEffect(() => {
    if (token) {
      setChats(localDb.getChats());
      setProjects(localDb.getProjects());
      setWorkspaces(localDb.getWorkspaces());
    }
  }, [token, setChats, setProjects, setWorkspaces]);

  useEffect(() => {
    if (activeWorkspaceId && !openWorkspaceIds.includes(activeWorkspaceId)) {
      setOpenWorkspaceIds(prev => [...prev, activeWorkspaceId]);
    }
  }, [activeWorkspaceId, openWorkspaceIds]);

  useEffect(() => {
    if (activeProjectId && !openProjectIds.includes(activeProjectId)) {
      setOpenProjectIds(prev => [...prev, activeProjectId]);
    }
  }, [activeProjectId, openProjectIds]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateChat = (projectId?: number | null) => {
    if (token) {
      createChat(token, navigate, projectId !== undefined ? projectId : activeProjectId);
      setIsSidebarOpen(false);
    }
  };

  const submitCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkspaceName.trim()) {
      createWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setIsCreatingWorkspace(false);
    }
  };

  const submitCreateProject = (e: React.FormEvent, workspaceId: number) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createProject(newProjectName.trim(), workspaceId);
      setNewProjectName('');
      setIsCreatingProject(null);
    }
  };

  const toggleWorkspace = (id: number) => {
    setOpenWorkspaceIds(prev => 
      prev.includes(id) ? prev.filter(wid => wid !== id) : [...prev, id]
    );
  };

  const toggleProject = (projectId: number) => {
    setOpenProjectIds(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId) 
        : [...prev, projectId]
    );
  };

  const handleDeleteWorkspace = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteWorkspaceId !== id) {
      setConfirmDeleteWorkspaceId(id);
      setTimeout(() => setConfirmDeleteWorkspaceId(null), 3000);
      return;
    }
    deleteWorkspace(id);
    if (activeWorkspaceId === id) setActiveWorkspaceId(null);
    setConfirmDeleteWorkspaceId(null);
  };

  const handleDeleteProject = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteProjectId !== projectId) {
      setConfirmDeleteProjectId(projectId);
      setTimeout(() => setConfirmDeleteProjectId(null), 3000);
      return;
    }
    deleteProject(projectId);
    if (activeProjectId === projectId) setActiveProjectId(null);
    setConfirmDeleteProjectId(null);
  };

  const handleUpdateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWorkspaceId && editName.trim()) {
      updateWorkspace(editingWorkspaceId, editName.trim());
      setEditingWorkspaceId(null);
      setEditName('');
    }
  };

  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProjectId && editName.trim()) {
      updateProject(editingProjectId, editName.trim());
      setEditingProjectId(null);
      setEditName('');
    }
  };

  const deleteChat = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (confirmDeleteChatId !== chatId) {
      setConfirmDeleteChatId(chatId);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setConfirmDeleteChatId(null), 3000);
      return;
    }

    localDb.deleteChat(chatId.toString());
    removeChat(chatId);
    if (activeChatId === chatId.toString()) {
      navigate('/');
    }
    setActiveMenuId(null);
    setConfirmDeleteChatId(null);
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

  const navItems = [
    { name: 'Chat History', path: '/', icon: MessageSquare },
    { name: 'GPTs', path: '/gpts', icon: Grid },
    { name: 'Website Generator', path: '/website', icon: Code },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="flex h-[100dvh] bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 overflow-hidden w-full fixed inset-0">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-black/80 backdrop-blur-md border-bottom border-gray-200 dark:border-zinc-800 z-30 flex items-center px-4 justify-between">
          <div className="flex items-center">
            <button
              className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-all duration-200"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <Link to="/" className="flex items-center" onClick={() => setIsSidebarOpen(false)}>
              <Logo size={24} className="ml-2" />
              <span className="ml-2 font-black tracking-tighter text-zinc-900 dark:text-zinc-100">TAHIR GPT</span>
            </Link>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsHistorySidebarOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Chat History"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={() => handleCreateChat()}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={"fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-black shadow-2xl transform transition-transform duration-300 ease-out md:relative md:translate-x-0 md:shadow-none border-r border-gray-200 dark:border-zinc-800 " + (isSidebarOpen ? "translate-x-0" : "-translate-x-full")}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-zinc-800/50">
          <Link to="/" className="flex items-center" onClick={() => setIsSidebarOpen(false)}>
            <Logo size={32} className="mr-2 text-zinc-900 dark:text-zinc-100" />
            <span className="font-black tracking-tighter text-gray-900 dark:text-gray-100">TAHIR GPT</span>
          </Link>
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-all duration-200"
                title="Toggle Theme"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button className="md:hidden p-2 text-gray-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-all duration-200" onClick={() => setIsSidebarOpen(false)}>
                <X size={20} />
              </button>
            </div>
          </div>

          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => (
              item.name === 'Chat History' ? (
                <button
                  key={item.name}
                  onClick={() => {
                    setIsHistorySidebarOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2.5 text-sm font-bold rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-900 dark:text-gray-100 transition-all duration-200 group"
                >
                  <item.icon className="w-5 h-5 mr-3 text-gray-700 dark:text-gray-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                  {item.name}
                </button>
              ) : (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center px-3 py-2.5 text-sm font-bold rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-900 dark:text-gray-100 transition-all duration-200 group"
                >
                  <item.icon className="w-5 h-5 mr-3 text-gray-700 dark:text-gray-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                  {item.name}
                </Link>
              )
            ))}

            <button
              onClick={handleShareApp}
              className="w-full flex items-center px-3 py-2.5 text-sm font-bold rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-900 dark:text-gray-100 transition-all duration-200 group"
            >
              <Share2 className="w-5 h-5 mr-3 text-gray-700 dark:text-gray-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
              Share App
            </button>
            
            {isCreatingWorkspace ? (
              <form onSubmit={submitCreateWorkspace} className="mt-4 px-3">
                <input
                  type="text"
                  autoFocus
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name..."
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onBlur={() => setIsCreatingWorkspace(false)}
                />
              </form>
            ) : (
              <button
                onClick={() => setIsCreatingWorkspace(true)}
                className="w-full flex items-center px-3 py-2.5 text-sm font-bold rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-900 dark:text-gray-100 transition-all duration-200 mt-4"
              >
                <FolderPlus className="w-5 h-5 mr-3 text-gray-700 dark:text-gray-300" />
                New Workspace
              </button>
            )}
          </nav>

          <div className="flex-1 overflow-y-auto mt-4 px-3 custom-scrollbar space-y-2">
            {/* Workspaces */}
            {workspaces.map((workspace) => (
              <div key={workspace.id} className="space-y-1">
                <div className="flex items-center group">
                  {editingWorkspaceId === workspace.id ? (
                    <form onSubmit={handleUpdateWorkspace} className="flex-1">
                      <input
                        type="text"
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-indigo-500 rounded-lg focus:outline-none"
                        onBlur={() => setEditingWorkspaceId(null)}
                      />
                    </form>
                  ) : (
                    <div
                      className={`flex-1 flex items-center justify-between px-3 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${activeWorkspaceId === workspace.id ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                      onClick={() => {
                        setActiveWorkspaceId(workspace.id);
                        toggleWorkspace(workspace.id);
                      }}
                    >
                      <div className="flex items-center flex-1">
                        <Folder className={`w-4 h-4 mr-3 ${activeWorkspaceId === workspace.id ? 'text-indigo-600' : 'text-indigo-500'}`} />
                        {workspace.name}
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${openWorkspaceIds.includes(workspace.id) ? 'rotate-90' : ''}`} />
                    </div>
                  )}
                  <div className="flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity pr-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCreatingProject(workspace.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                      title="New Project"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingWorkspaceId(workspace.id);
                        setEditName(workspace.name);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                      className={`p-1.5 rounded-md transition-all ${
                        confirmDeleteWorkspaceId === workspace.id 
                          ? "bg-red-500 text-white" 
                          : "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      }`}
                      title={confirmDeleteWorkspaceId === workspace.id ? "Click again to confirm" : "Delete Workspace"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {openWorkspaceIds.includes(workspace.id) && (
                  <div className="ml-4 pl-2 border-l border-gray-100 dark:border-zinc-800 space-y-1">
                    {isCreatingProject === workspace.id && (
                      <form onSubmit={(e) => submitCreateProject(e, workspace.id)} className="px-2">
                        <input
                          type="text"
                          autoFocus
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="Project name..."
                          className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                          onBlur={() => setIsCreatingProject(null)}
                        />
                      </form>
                    )}
                    
                    {projects.filter(p => p.workspaceId === workspace.id).map((project) => (
                      <div key={project.id} className="space-y-0.5">
                        <div className="flex items-center group">
                          {editingProjectId === project.id ? (
                            <form onSubmit={handleUpdateProject} className="flex-1">
                              <input
                                type="text"
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-zinc-800 border border-indigo-500 rounded-lg focus:outline-none"
                                onBlur={() => setEditingProjectId(null)}
                              />
                            </form>
                          ) : (
                            <div
                              className={`flex-1 flex items-center justify-between px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeProjectId === project.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                              onClick={() => {
                                setActiveProjectId(project.id);
                                toggleProject(project.id);
                              }}
                            >
                              <div className="flex items-center flex-1">
                                <Folder className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                                {project.name}
                              </div>
                              <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openProjectIds.includes(project.id) ? 'rotate-90' : ''}`} />
                            </div>
                          )}
                          <div className="flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity pr-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateChat(project.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                              title="New Chat"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProjectId(project.id);
                                setEditName(project.name);
                              }}
                              className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteProject(project.id, e)}
                              className={`p-1.5 rounded-md transition-all ${
                                confirmDeleteProjectId === project.id 
                                  ? "bg-red-500 text-white" 
                                  : "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              }`}
                              title={confirmDeleteProjectId === project.id ? "Click again to confirm" : "Delete Project"}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {openProjectIds.includes(project.id) && (
                          <div className="ml-4 pl-2 border-l border-gray-50 dark:border-zinc-800/50 space-y-0.5">
                            {chats.filter(c => c.projectId === project.id).map((chat) => (
                              <div key={chat.id} className="relative group">
                                <Link
                                  to={"/chat/" + chat.id}
                                  onClick={() => setIsSidebarOpen(false)}
                                  className={"flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] transition-all " + (activeChatId === chat.id.toString() ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800")}
                                >
                                  <span className="truncate pr-6">{chat.title}</span>
                                </Link>
                                <button
                                  onClick={(e) => deleteChat(chat.id, e)}
                                  className={`absolute right-1 top-1/2 transform -translate-y-1/2 p-1 rounded-md transition-all ${
                                    confirmDeleteChatId === chat.id 
                                      ? "bg-red-500 text-white" 
                                      : "text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                  }`}
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-zinc-800/50 mt-auto bg-white dark:bg-black sticky bottom-0">
            <AdBanner dataAdSlot="sidebar-ad" className="mb-4 min-h-[100px]" />
            <div className="flex items-center px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-bold shadow-sm mr-3">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate text-gray-900 dark:text-gray-100">{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="ml-auto p-2 text-gray-400 hover:text-red-500 transition-all duration-300 active:scale-95"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History Sidebar Overlay */}
      {isHistorySidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsHistorySidebarOpen(false)}
        />
      )}

      {/* History Sidebar */}
      <div
        className={"fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-black shadow-2xl transform transition-transform duration-300 ease-out border-r border-gray-200 dark:border-zinc-800 " + (isHistorySidebarOpen ? "translate-x-0" : "-translate-x-full")}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-zinc-800/50">
            <div className="flex items-center">
              <History className="w-5 h-5 mr-2 text-indigo-500" />
              <span className="font-black tracking-tighter text-gray-900 dark:text-gray-100">Chat History</span>
            </div>
            <button className="p-2 text-gray-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-all duration-200" onClick={() => setIsHistorySidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 px-3 custom-scrollbar space-y-2">
            <div className="flex items-center justify-between px-3 py-2 mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Previous Chats</span>
              <button 
                onClick={() => {
                  handleCreateChat(null);
                  setIsHistorySidebarOpen(false);
                }}
                className="p-1 text-gray-400 hover:text-indigo-500 transition-colors"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-0.5">
              {chats.filter(c => !c.projectId).length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center bg-gray-50 dark:bg-zinc-800/50 rounded-lg mx-2 border border-dashed border-gray-200 dark:border-zinc-700 mt-2">
                  No chats yet.
                </div>
              ) : (
                chats.filter(c => !c.projectId).map((chat) => (
                  <div
                    key={chat.id}
                    className="relative group"
                  >
                    <Link
                      to={"/chat/" + chat.id}
                      onClick={() => setIsHistorySidebarOpen(false)}
                      className={"flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all " + (activeChatId === chat.id.toString() ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800")}
                    >
                      <span className="truncate pr-6">{chat.title}</span>
                    </Link>
                    
                    {/* Delete button (always visible on mobile, hover on desktop) */}
                    <button
                      onClick={(e) => deleteChat(chat.id, e)}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md transition-all ${
                        confirmDeleteChatId === chat.id 
                          ? "bg-red-500 text-white hover:bg-red-600 opacity-100" 
                          : "text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-zinc-700 opacity-100 md:opacity-0 md:group-hover:opacity-100 " + (activeChatId === chat.id.toString() ? "md:opacity-100" : "")
                      }`}
                      title={confirmDeleteChatId === chat.id ? "Click again to confirm" : "Delete Chat"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        <main className={`flex-1 overflow-y-auto overflow-x-hidden p-0 md:p-0 pt-14 md:pt-0 ${isStudioPage ? 'pb-0' : 'pb-20'} md:pb-0 flex flex-col custom-scrollbar w-full`}>
          <div className="flex-1">
            <Outlet />
          </div>
          {!isStudioPage && <Footer />}
        </main>
      </div>
    </div>
  );
}
