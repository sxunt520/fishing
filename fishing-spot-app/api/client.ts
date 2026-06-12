import axios from 'axios';
import { API_BASE_URL, ASSET_BASE_URL } from '@/constants/config';
import { deleteAuthItem, getAuthItem } from '@/utils/authStorage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getAuthItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
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
