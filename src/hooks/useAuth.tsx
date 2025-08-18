
import { useState, useEffect, createContext, useContext } from "react";
import { 
  setToken, 
  setRefreshToken,
  clearToken, 
  clearRefreshToken,
  getToken, 
  getRefreshToken,
  login,
  logout as authLogout,
  register
} from "@/utils/auth";

interface User {
  id: string;
  email: string;
  roles: string[];
  vendorId?: string;
  profile?: any;
}

interface AuthContextType {
  user: User | null;
  session: any;
  loading: boolean;
  signUp: (email: string, password: string, companyName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const accessToken = getToken();
    
    if (accessToken) {
      // For now, we'll create a basic user object
      // In a real app, you'd validate the token and get user data
      setUserState({
        id: '1',
        email: 'user@example.com',
        roles: ['vendor_user']
      });
    }
    
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, companyName?: string) => {
    try {
      const data = await register({
        email,
        password,
        fullName: email.split('@')[0],
        companyName
      });

      setToken(data.token);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }
      
      setUserState({
        id: data.user?.id || '1',
        email: data.user?.email || email,
        roles: data.user?.roles || ['vendor_user']
      });

      return { error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { error: { message: error.message || 'Registration failed' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await login(email, password);

      setUserState({
        id: data.user?.id || '1',
        email: data.user?.email || email,
        roles: data.user?.roles || ['vendor_user']
      });

      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { error: { message: error.message || 'Login failed' } };
    }
  };

  const signOut = async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, session: user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
