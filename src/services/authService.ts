import { safeSetItem } from '../utils/localDb';

const USERS_KEY = 'tahir_gpt_users';

export interface User {
  id: string;
  email: string;
  password?: string;
  securityQuestion: string;
  securityAnswer: string;
}

export const authService = {
  getUsers: (): User[] => {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch {
      return [];
    }
  },

  saveUsers: (users: User[]) => {
    safeSetItem(USERS_KEY, JSON.stringify(users));
  },

  signup: async (userData: Omit<User, 'id'>) => {
    const users = authService.getUsers();
    if (users.find(u => u.email === userData.email)) {
      throw new Error('User already exists');
    }

    const newUser: User = {
      ...userData,
      id: Math.random().toString(36).substring(2, 15)
    };

    users.push(newUser);
    authService.saveUsers(users);
    return { success: true };
  },

  login: async (email: string, password: string) => {
    const users = authService.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Generate a fake token for consistency with the store
    const token = btoa(JSON.stringify({ id: user.id, email: user.email, exp: Date.now() + 86400000 }));
    
    return {
      user: { id: user.id, email: user.email },
      token
    };
  },

  resetPassword: async (email: string, securityAnswer: string, newPassword: string) => {
    const users = authService.getUsers();
    const userIndex = users.findIndex(u => u.email === email && u.securityAnswer.toLowerCase() === securityAnswer.toLowerCase());

    if (userIndex === -1) {
      throw new Error('Invalid email or security answer');
    }

    users[userIndex].password = newPassword;
    authService.saveUsers(users);
    return { success: true };
  }
};
