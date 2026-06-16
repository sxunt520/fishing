import { ValueTransformer } from 'typeorm';

export const jsonArrayTransformer: ValueTransformer = {
  to(value?: unknown[]) {
    return JSON.stringify(Array.isArray(value) ? value : []);
  },
  from(value?: string | unknown[]) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
};
