import axios from 'axios';
import { supabase } from '@/lib/supabase';

// Production FastAPI base URL from Railway
const API_BASE_URL = 'https://voice-agent-platform-production-86a4.up.railway.app/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to inject the Supabase JWT token into every request
api.interceptors.request.use(
  async (config) => {
    // Get the current active session from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    // If a session and token exist, append it to the Auth header
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
