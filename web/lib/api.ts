import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  getChallenge: (walletAddress: string) =>
    api.get('/auth/challenge', { params: { wallet_address: walletAddress } }),
  
  connectWallet: (data: {
    wallet_address: string;
    signature: string;
    message: string;
    role?: 'freelancer' | 'client' | 'both';
    email?: string;
    phone_number?: string;
  }) => api.post('/auth/connect-wallet', data),
  
  getMe: () => api.get('/auth/me'),
  
  logout: () => api.post('/auth/logout'),
};

// Users API
export const usersApi = {
  getProfile: (walletAddress: string) => api.get(`/users/${walletAddress}`),
  
  updateProfile: (data: {
    email?: string;
    phone_number?: string;
    role?: 'freelancer' | 'client' | 'both';
    profile_data?: {
      name?: string;
      bio?: string;
      skills?: string[];
      location?: string;
      avatar_url?: string;
    };
  }) => api.put('/users/profile', data),
  
  listUsers: (params?: {
    limit?: number;
    offset?: number;
    role?: 'freelancer' | 'client' | 'both';
    is_verified?: boolean;
  }) => api.get('/users', { params }),
  
  deleteAccount: () => api.delete('/users/account'),
};

// Gigs API
export const gigsApi = {
  createGig: (data: {
    title: string;
    description: string;
    category: string;
    skills?: string[];
    price_usd: number;
    estimated_delivery_days: number;
    milestones?: {
      title: string;
      description?: string;
      percentage: number;
    }[];
  }) => api.post('/gigs', data),
  
  listGigs: (params?: {
    limit?: number;
    offset?: number;
    freelancer_id?: string;
    category?: string;
    status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
    min_price?: number;
    max_price?: number;
  }) => api.get('/gigs', { params }),
  
  getGig: (id: string) => api.get(`/gigs/${id}`),
  
  updateGig: (id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    skills?: string[];
    price_usd?: number;
    estimated_delivery_days?: number;
    milestones?: {
      title: string;
      description?: string;
      percentage: number;
    }[];
    status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
  }) => api.put(`/gigs/${id}`, data),
  
  deleteGig: (id: string) => api.delete(`/gigs/${id}`),
};
