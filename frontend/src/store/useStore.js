import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hasSeenPricing: false,
      selectedPlan: null,
      
      setAuth: (user, accessToken, refreshToken) => set({
        user,
        accessToken,
        refreshToken
      }),
      
      clearAuth: () => set({
        user: null,
        accessToken: null,
        refreshToken: null
      }),
      
      updateUser: (updates) => set((state) => ({
        user: { ...state.user, ...updates }
      })),
      
      setHasSeenPricing: (hasSeenPricing) => set({ hasSeenPricing }),
      setSelectedPlan: (plan) => set({ selectedPlan: plan, hasSeenPricing: true }),
      
      uploadedFiles: [],
      addUploadedFile: (file) => set((state) => ({
        uploadedFiles: [...state.uploadedFiles, file]
      })),
      
      clearUploadedFiles: () => set({ uploadedFiles: [] })
    }),
    {
      name: 'fileshare-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        hasSeenPricing: state.hasSeenPricing,
        selectedPlan: state.selectedPlan
      })
    }
  )
)

export default useStore