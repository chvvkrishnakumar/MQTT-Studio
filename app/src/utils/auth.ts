import {
  getApiAuthGetSession,
  postApiAuthSignInEmail,
  postApiAuthSignOut,
  postApiAuthSignUpEmail,
} from '@/services/authentication';
import type { PostApiAuthSignInEmailBody, PostApiAuthSignUpEmailBody } from '@/services/hooks.schemas';
import axiosInstance from '@/services/axiosClient';
import router from '@/router';
import {
  type AuthUser,
  clearStoredAuth,
  getStoredUser,
  setAuthToken,
  setStoredUser,
} from '@/lib/auth-storage';

const persistUserSession = async (user: AuthUser, token?: string) => {
  if (!user?.id) {
    throw new Error('Session user not found');
  }

  setStoredUser(user);

  if (token) {
    await setAuthToken(token);
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
};

/**
 * Caches the in-flight/last server session check so repeated route guards
 * within one app load don't each fire a request. Reset on login/logout.
 */
let sessionCheck: Promise<AuthUser | null> | null = null;

const fetchSession = async (): Promise<AuthUser | null> => {
  try {
    const session = await getApiAuthGetSession();
    const u = session?.user;
    if (!u?.id || !u.email) {
      // Definitively no session → drop any stale local state.
      await clearStoredAuth();
      return null;
    }
    const user: AuthUser = {
      id: u.id,
      email: u.email,
      name: u.name,
      emailVerified: u.emailVerified,
    };
    setStoredUser(user);
    return user;
  } catch {
    // Network/transient error: don't lock the user out — fall back to whatever
    // is cached. A real 401 is handled by the axios interceptor.
    return getStoredUser();
  }
};

const hydrateSession = async () => {
  const user = await fetchSession();
  if (!user) {
    throw new Error('No active session');
  }
  return { user };
};

export const auth = {
  async login(credentials: PostApiAuthSignInEmailBody) {
    try {
      const response = (await postApiAuthSignInEmail(credentials)) as unknown as {
        token?: string;
        user?: AuthUser;
      };

      let session: { user?: AuthUser } | null = null;

      if (response?.user?.id) {
        await persistUserSession(response.user, response.token);
        session = { user: response.user };
      } else {
        session = await hydrateSession();
      }

      sessionCheck = null; // force a fresh check next guard
      await router.navigate({ to: '/' });
      return session;
    } catch (error) {
      console.error('Login failed:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      throw new Error(message);
    }
  },

  async register(userData: PostApiAuthSignUpEmailBody) {
    try {
      const response = (await postApiAuthSignUpEmail(userData)) as unknown as {
        token?: string;
        user?: AuthUser;
      };

      if (response?.user?.id) {
        await persistUserSession(response.user, response.token);
      } else {
        await hydrateSession();
      }

      sessionCheck = null;
      await router.navigate({ to: '/' });

      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      const message = error instanceof Error ? error.message : 'Registration failed';
      throw new Error(message);
    }
  },

  async logout() {
    try {
      await postApiAuthSignOut();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      await clearStoredAuth();
      delete axiosInstance.defaults.headers.common.Authorization;
      sessionCheck = null;
      await router.navigate({ to: '/home' });
    }
  },

  /**
   * Validates the session against the server, returning the user or null.
   * Cached for the app's lifetime so route guards are cheap; pass `force` to
   * bypass the cache. This is what guards should call instead of trusting
   * localStorage alone.
   */
  async ensureAuthenticated(force = false): Promise<AuthUser | null> {
    if (force) sessionCheck = null;
    sessionCheck ??= fetchSession();
    return sessionCheck;
  },

  getUser(): AuthUser | null {
    return getStoredUser();
  },

  isAuthenticated() {
    return !!getStoredUser();
  },
};
