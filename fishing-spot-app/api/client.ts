import axios from 'axios';
import { API_BASE_URL, ASSET_BASE_URL } from '@/constants/config';
import { deleteAuthItem, getAuthItem } from '@/utils/authStorage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {//在每个请求发送之前，使用请求拦截器添加认证信息和日志记录功能。
  const token = await getAuthItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  (config as any).metadata = { startedAt: Date.now() };
  console.log(
    '[API Request]',
    config.method?.toUpperCase(),
    `${config.baseURL || ''}${config.url || ''}`,
    summarizePayload(config.params || config.data),
  );
  return config;
});

api.interceptors.response.use(//在每个响应返回之后，使用响应拦截器添加日志记录功能，并处理认证错误。
  (res) => {
    const startedAt = (res.config as any).metadata?.startedAt;
    const duration = startedAt ? `${Date.now() - startedAt}ms` : '-';
    console.log(
      '[API Response]',
      res.config.method?.toUpperCase(),
      res.config.url,
      res.status,
      duration,
      summarizePayload(res.data),
    );
    return res.data;
  },
  async (err) => {
    const startedAt = (err.config as any)?.metadata?.startedAt;
    const duration = startedAt ? `${Date.now() - startedAt}ms` : '-';
    console.log(
      '[API Error]',
      err.config?.method?.toUpperCase(),
      err.config?.url,
      err.response?.status || 'NETWORK',
      duration,
      summarizePayload(err.response?.data || err.message),
    );
    if (err.response?.status === 401) {
      await deleteAuthItem('access_token');
    }
    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  login: (phone: string, password: string) => api.post('/auth/login', { phone, password }),
  register: (phone: string, password: string, nickname?: string) => api.post('/auth/register', { phone, password, nickname }),
  me: () => api.get('/auth/me'),
};

export const spotApi = {
  getInBounds: (bounds: { north: number; south: number; east: number; west: number }) => api.get('/spots', { params: bounds }),
  getNearby: (lat: number, lng: number, radius?: number) => api.get('/spots/nearby', { params: { lat, lng, radius } }),
  getDetail: (id: string, lat?: number, lng?: number) => api.get(`/spots/${id}`, { params: { lat, lng } }),
};

export const postApi = {
  getBySpot: (spotId: string, page?: number) => api.get(`/spots/${spotId}/posts`, { params: { page } }),
  create: (data: any) => api.post('/posts', data),
  like: (postId: string) => api.post(`/posts/${postId}/like`),
  unlike: (postId: string) => api.delete(`/posts/${postId}/like`),
};

export const commentApi = {
  getComments: (postId: string, page?: number) => api.get(`/posts/${postId}/comments`, { params: { page } }),
  create: (postId: string, content: string) => api.post(`/posts/${postId}/comments`, { content }),
};

export const aiApi = {
  generateCaption: (imageUrl: string) => api.post('/ai/generate-caption', { imageUrl }),
};

export const uploadApi = {
  uploadImages: (formData: FormData) => api.post('/upload/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res: any) => ({
    ...res,
    urls: (res.urls || []).map(resolveAssetUrl),
  })),
};

export const draftApi = {
  get: () => api.get('/drafts'),
  save: (data: any) => api.post('/drafts', data),
  clear: () => api.delete('/drafts'),
};

export const tagApi = {
  getFish: () => api.get('/tags/fish-categories'),
  getEvaluations: () => api.get('/tags/spot-evaluations'),
};

export function resolveAssetUrl(url?: string | null) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${ASSET_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function summarizePayload(payload: any) {
  if (!payload) return '';
  if (typeof FormData !== 'undefined' && payload instanceof FormData) return '[FormData]';
  if (typeof payload === 'string') return payload.length > 600 ? `${payload.slice(0, 600)}...` : payload;

  try {
    const seen = new WeakSet();
    const json = JSON.stringify(payload, (key, value) => {
      if (/password|token|authorization/i.test(key)) return '[REDACTED]';
      if (value && typeof value === 'object') {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      if (typeof value === 'string' && value.length > 260) return `${value.slice(0, 260)}...`;
      return value;
    });
    return json.length > 1000 ? `${json.slice(0, 1000)}...` : json;
  } catch {
    return '[Unserializable Payload]';
  }
}
