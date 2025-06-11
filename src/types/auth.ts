export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'service_integrator' | 'solution_designer' | 'end_user';
  }
  
  export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  }