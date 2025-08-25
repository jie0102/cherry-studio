import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface FocusLog {
  isFocused: boolean
  reason: string
  activeApp?: string
  timestamp: number
  screenshot?: string // base64 encoded screenshot
  ocrText?: string
}

export interface FocusStatistics {
  totalChecks: number
  focusedChecks: number
  distractedChecks: number
}

export interface FocusMonitorState {
  taskDescription: string
  allowedApps: string[]
  blockedApps: string[]
  monitoringFrequency: number // seconds
  isActive: boolean
  lastCheckTime: number | null
  logs: FocusLog[]
  statistics: FocusStatistics
}

const initialState: FocusMonitorState = {
  taskDescription: '',
  allowedApps: [],
  blockedApps: [],
  monitoringFrequency: 60, // 60 seconds default
  isActive: false,
  lastCheckTime: null,
  logs: [],
  statistics: {
    totalChecks: 0,
    focusedChecks: 0,
    distractedChecks: 0
  }
}

const focusMonitorSlice = createSlice({
  name: 'focusMonitor',
  initialState,
  reducers: {
    // Configuration actions
    setTaskDescription: (state, action: PayloadAction<string>) => {
      state.taskDescription = action.payload
    },
    setMonitoringFrequency: (state, action: PayloadAction<number>) => {
      state.monitoringFrequency = action.payload
    },
    addAllowedApp: (state, action: PayloadAction<string>) => {
      if (!state.allowedApps.includes(action.payload)) {
        state.allowedApps.push(action.payload)
      }
    },
    removeAllowedApp: (state, action: PayloadAction<string>) => {
      state.allowedApps = state.allowedApps.filter((app) => app !== action.payload)
    },
    addBlockedApp: (state, action: PayloadAction<string>) => {
      if (!state.blockedApps.includes(action.payload)) {
        state.blockedApps.push(action.payload)
      }
    },
    removeBlockedApp: (state, action: PayloadAction<string>) => {
      state.blockedApps = state.blockedApps.filter((app) => app !== action.payload)
    },

    // Status actions
    setIsActive: (state, action: PayloadAction<boolean>) => {
      state.isActive = action.payload
    },
    setLastCheckTime: (state, action: PayloadAction<number>) => {
      state.lastCheckTime = action.payload
    },

    // Log actions
    addLog: (state, action: PayloadAction<FocusLog>) => {
      state.logs.push(action.payload)
      // Keep only last 100 logs
      if (state.logs.length > 100) {
        state.logs = state.logs.slice(-100)
      }
    },
    clearLogs: (state) => {
      state.logs = []
    },

    // Statistics actions
    incrementTotalChecks: (state) => {
      state.statistics.totalChecks += 1
    },
    incrementFocusedChecks: (state) => {
      state.statistics.focusedChecks += 1
    },
    incrementDistractedChecks: (state) => {
      state.statistics.distractedChecks += 1
    },
    resetStatistics: (state) => {
      state.statistics = {
        totalChecks: 0,
        focusedChecks: 0,
        distractedChecks: 0
      }
    }
  }
})

export const {
  setTaskDescription,
  setMonitoringFrequency,
  addAllowedApp,
  removeAllowedApp,
  addBlockedApp,
  removeBlockedApp,
  setIsActive,
  setLastCheckTime,
  addLog,
  clearLogs,
  incrementTotalChecks,
  incrementFocusedChecks,
  incrementDistractedChecks,
  resetStatistics
} = focusMonitorSlice.actions

// Selectors
export const selectFocusMonitor = (state: { focusMonitor: FocusMonitorState }) => state.focusMonitor

export default focusMonitorSlice.reducer
