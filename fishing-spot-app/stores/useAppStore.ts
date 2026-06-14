import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {//定义了应用的全局状态接口 `AppState`，包含用户信息、草稿内容、当前位置信息以及相关的更新方法。
  user: any | null;
  setUser: (user: any) => void;
  logout: () => void;
  draft: any;
  setDraft: (draft: any) => void;
  currentLocation: { latitude: number; longitude: number } | null;
  setCurrentLocation: (loc: any) => void;
}

export const useAppStore = create<AppState>()(//使用 `create` 函数创建一个 Zustand 状态管理的 store，定义了应用的全局状态和相关的更新方法。
  persist(
    (set) => ({//定义了应用的全局状态和相关的更新方法，包括用户信息、草稿内容和当前位置信息等。
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, draft: null }),
      draft: null,//定义了一个 `draft` 状态，用于存储用户编辑内容的草稿，以便在用户离开编辑界面后能够恢复之前的编辑内容。
      setDraft: (draft) => set({ draft }),//定义了一个 `setDraft` 方法，用于更新草稿内容的状态。
      currentLocation: null,//定义了一个 `currentLocation` 状态，用于存储用户的当前位置信息，以便在地图相关功能中使用。
      setCurrentLocation: (currentLocation) => set({ currentLocation }),//定义了一个 `setCurrentLocation` 方法，用于更新当前位置信息的状态。
    }),
    {//使用 `persist` 中间件将应用的全局状态持久化存储在设备的本地存储中，以便在应用重启后能够恢复之前的状态。
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
