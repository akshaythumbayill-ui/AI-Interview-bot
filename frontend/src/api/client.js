/**
 * Axios client pre-configured to talk to the FastAPI backend.
 * All API calls go through this module.
 */
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = localStorage.getItem("access_token");
    const isAuthRequest = /\/auth\/(login|register)$/.test(error.config?.url || "");
    if (error.response?.status === 401 && token && !isAuthRequest) {
      localStorage.removeItem("access_token");
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export const register = (payload) => api.post("/auth/register", payload);
export const login = (payload) => api.post("/auth/login", payload);
export const getCurrentUser = () => api.get("/auth/me");

// ── Interview ─────────────────────────────────────────────────────────────────

/**
 * Start a new interview session.
 * @param {FormData} formData  - resume (file), role, interview_type, difficulty, num_questions, job_description
 */
export const startInterview = (formData) =>
  api.post("/interview/start", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/**
 * Submit an answer and get evaluation + next question.
 * @param {{ session_id, answer_text, input_mode, duration_seconds }} payload
 */
export const submitAnswer = (payload) =>
  api.post("/interview/answer", payload);

/**
 * Fetch the final report JSON.
 */
export const getReport = (sessionId) =>
  api.get(`/interview/${sessionId}/report`);

export const getReportPdf = (sessionId) =>
  api.get(`/interview/${sessionId}/report/pdf`, { responseType: "blob" });

/**
 * List all past sessions.
 */
export const getHistory = () => api.get("/history");

export default api;
