import axios from 'axios';

// O access token vive num cookie httpOnly (setado pelo backend em
// /auth/login, /auth/refresh, /auth/invite/:token/accept) — por isso
// withCredentials, e não precisamos guardar/anexar token manualmente.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

let refreshPromise = null;

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = apiClient.post('/auth/refresh').finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Em caso de 401 (access token expirado), tenta renovar via refresh token
// (cookie httpOnly) uma única vez e repete a chamada original. Se o refresh
// também falhar, avisa o resto do app (AuthContext escuta esse evento) em
// vez de deixar cada componente lidar com sessão expirada por conta própria.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthRoute = config?.url?.startsWith('/auth/');

    if (response?.status === 401 && config && !config._retry && !isAuthRoute) {
      config._retry = true;
      try {
        await refreshSession();
        return apiClient(config);
      } catch (_refreshError) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
