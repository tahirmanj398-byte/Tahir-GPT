import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { localDb } from '../utils/localDb';
import { User, Trash2, AlertTriangle, Smartphone, Share, PlusSquare, MoreVertical, CheckCircle2 } from 'lucide-react';

export default function Profile() {
  const { user, token, logout } = useAuthStore();
  const [stats, setStats] = useState({ chats: 0, images: 0, users: 0, workspaces: 0, projects: 0 });
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const chats = localDb.getChats();
      const images = localDb.getImages();
      const workspaces = localDb.getWorkspaces();
      const projects = localDb.getProjects();
      const usersCount = localDb.getUsersCount();
      setStats({ 
        chats: chats.length, 
        images: images.length, 
        users: usersCount,
        workspaces: workspaces.length,
        projects: projects.length
      });
    } catch (err) {
      setError('Failed to fetch stats');
    }
  };

  const handleClearChats = async () => {
    if (!window.confirm('Are you sure you want to delete all your chat history? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    setError('');
    setSuccess('');

    try {
      localDb.clearAllChats();
      setSuccess('All chats have been successfully deleted.');
      fetchStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearImages = async () => {
    if (!window.confirm('Are you sure you want to delete all your generated images? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    setError('');
    setSuccess('');

    try {
      localDb.clearAllImages();
      setSuccess('All generated images have been successfully deleted.');
      fetchStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col items-center justify-center text-center space-y-4 mb-4">
        <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-4xl font-bold">
          {user?.email?.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Hello, {user?.email}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your Tahir GPT account and data.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            {stats.workspaces}
          </div>
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Workspaces
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            {stats.projects}
          </div>
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Projects
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            {stats.chats}
          </div>
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Chats
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            {stats.images}
          </div>
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Images
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            {stats.users}
          </div>
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Users
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Share className="w-5 h-5 mr-2 text-indigo-500" />
          Contact & Social Media
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Support Email</p>
            <a href="mailto:tahirgpt1@gmail.com" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">tahirgpt1@gmail.com</a>
          </div>
          
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Social Media</p>
            <div className="flex flex-wrap gap-3">
              <a href="https://www.facebook.com/share/1AEidMEvtn/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">Facebook</a>
              <a href="https://www.instagram.com/tahirgpt?igsh=YWUyOXc5NWl4aGp2&utm_source=qr&wa_status_inline=true" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-pink-600 transition-colors">Instagram</a>
              <a href="https://www.youtube.com/@TahirGPT" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors">YouTube</a>
              <a href="https://www.tiktok.com/@tahirgpt" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">TikTok</a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Smartphone className="w-5 h-5 mr-2 text-indigo-500" />
          Install Tahir GPT as App
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <h3 className="font-bold text-sm flex items-center text-zinc-900 dark:text-zinc-100">
              <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-[10px] mr-2">1</span>
              On Android (Chrome)
            </h3>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-3">
              <li className="flex items-start">
                <MoreVertical className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Tap the <b>three dots</b> in the top right corner.</span>
              </li>
              <li className="flex items-start">
                <PlusSquare className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Select <b>"Add to Home screen"</b> or <b>"Install app"</b>.</span>
              </li>
              <li className="flex items-start">
                <Smartphone className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Confirm and Tahir GPT will appear on your home screen!</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <h3 className="font-bold text-sm flex items-center text-zinc-900 dark:text-zinc-100">
              <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-[10px] mr-2">2</span>
              On iPhone (Safari)
            </h3>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-3">
              <li className="flex items-start">
                <Share className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Tap the <b>Share button</b> (square with arrow) at the bottom.</span>
              </li>
              <li className="flex items-start">
                <PlusSquare className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Scroll down and tap <b>"Add to Home Screen"</b>.</span>
              </li>
              <li className="flex items-start">
                <Smartphone className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Tap <b>"Add"</b> in the top right to finish.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
          Danger Zone
        </h2>
        
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg">
            {success}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 rounded-xl">
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-400">Clear Chat History</h3>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
              Permanently delete all your chat conversations and messages.
            </p>
          </div>
          <button
            onClick={handleClearChats}
            disabled={isClearing || stats.chats === 0}
            className="mt-4 sm:mt-0 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isClearing ? 'Clearing...' : 'Clear All Chats'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 rounded-xl">
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-400">Clear Image History</h3>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
              Permanently delete all your generated images.
            </p>
          </div>
          <button
            onClick={handleClearImages}
            disabled={isClearing || stats.images === 0}
            className="mt-4 sm:mt-0 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isClearing ? 'Clearing...' : 'Clear All Images'}
          </button>
        </div>
      </div>
    </div>
  );
}
