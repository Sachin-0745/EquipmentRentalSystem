import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true
});

// --- Request interceptor: attach token ---
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = token;
  }
  return req;
});

// --- Response interceptor: handle 401 globally with token rotation ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = token;
          return API(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await API.post("/auth/refresh-token");
        const { token } = data;
        localStorage.setItem("token", token);
        API.defaults.headers.common["Authorization"] = token;
        originalRequest.headers.Authorization = token;
        processQueue(null, token);
        return API(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// --- Logout helper: call backend to blacklist token ---
export const logout = async () => {
  try {
    await API.post("/auth/logout");
  } catch (_) {
    // Even if API call fails, still clear local state
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  }
};

export default API;