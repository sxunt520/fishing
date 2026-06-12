// export const API_BASE_URL = __DEV__ 
//   ? 'http://localhost:3000/api/v1' 
//   : 'https://your-domain.com/api/v1';

export const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_DEV_API_URL || 'http://localhost:3000/api/v1')
  : 'https://your-domain.com/api/v1';

const env = process.env as Record<string, string | undefined>;

export const AMAP_WEB_KEY = env.EXPO_PUBLIC_AMAP_WEB_KEY || 'your-amap-web-key';

export const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

