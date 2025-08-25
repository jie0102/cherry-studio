import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { PomodoroPhase, PomodoroSettings } from '@renderer/pages/pomodoro/hooks/usePomodoro'
import type { PomodoroTask } from '@renderer/pages/pomodoro/hooks/usePomodoroTasks'

export interface PomodoroSession {
  id: string
  type: PomodoroPhase
  startedAt: number
  completedAt?: number
  duration: number // in seconds
  taskId?: string
}

export interface PomodoroState {
  // Timer state
  timeLeft: number // seconds remaining
  currentPhase: PomodoroPhase
  isRunning: boolean
  workCount: number // completed work sessions today
  
  // Settings
  settings?: PomodoroSettings & {
    dailyGoal?: number
    showFloatWindow?: boolean
    enableNotifications?: boolean
  }
  
  // Tasks
  tasks: PomodoroTask[]
  currentTaskId: string | null
  
  // Sessions history
  sessions: PomodoroSession[]
  
  // UI state
  showFloatWindow: boolean
}

const initialState: PomodoroState = {
  timeLeft: 25 * 60, // 25 minutes
  currentPhase: 'work',
  isRunning: false,
  workCount: 0,
  
  settings: {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    dailyGoal: 8,
    showFloatWindow: true,
    enableNotifications: true
  },
  
  tasks: [],
  currentTaskId: null,
  sessions: [],
  showFloatWindow: false
}

const pomodoroSlice = createSlice({
  name: 'pomodoro',
  initialState,
  reducers: {
    // Timer actions
    setTimeLeft: (state, action: PayloadAction<number>) => {
      state.timeLeft = action.payload
    },
    
    setCurrentPhase: (state, action: PayloadAction<PomodoroPhase>) => {
      state.currentPhase = action.payload
    },
    
    setIsRunning: (state, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload
    },
    
    setWorkCount: (state, action: PayloadAction<number>) => {
      state.workCount = action.payload
    },
    
    // Settings actions
    setPomodoroState: (state, action: PayloadAction<Partial<PomodoroState>>) => {
      Object.assign(state, action.payload)
    },
    
    updateSettings: (state, action: PayloadAction<Partial<PomodoroState['settings']>>) => {
      if (state.settings) {
        state.settings = { ...state.settings, ...action.payload }
      } else {
        state.settings = action.payload as Required<PomodoroState['settings']>
      }
    },
    
    // Task actions
    addTask: (state, action: PayloadAction<PomodoroTask>) => {
      state.tasks.push(action.payload)
    },
    
    toggleTask: (state, action: PayloadAction<{ id: string; completed: boolean; completedAt?: number }>) => {
      const task = state.tasks.find(t => t.id === action.payload.id)
      if (task) {
        task.completed = action.payload.completed
        if (action.payload.completedAt !== undefined) {
          task.completedAt = action.payload.completedAt
        }
      }
    },
    
    deleteTask: (state, action: PayloadAction<string>) => {
      const index = state.tasks.findIndex(t => t.id === action.payload)
      if (index !== -1) {
        state.tasks.splice(index, 1)
      }
      
      // Clear current task if it was deleted
      if (state.currentTaskId === action.payload) {
        state.currentTaskId = null
      }
    },
    
    setCurrentTask: (state, action: PayloadAction<string | null>) => {
      state.currentTaskId = action.payload
    },
    
    incrementTaskPomodoros: (state, action: PayloadAction<string>) => {
      const task = state.tasks.find(t => t.id === action.payload)
      if (task) {
        task.pomodoroCount += 1
      }
    },
    
    // Session actions
    addSession: (state, action: PayloadAction<PomodoroSession>) => {
      state.sessions.push(action.payload)
    },
    
    completeSession: (state, action: PayloadAction<{ id: string; completedAt: number }>) => {
      const session = state.sessions.find(s => s.id === action.payload.id)
      if (session) {
        session.completedAt = action.payload.completedAt
      }
    },
    
    // Increment completed pomodoro count
    incrementPomodoroCount: (state) => {
      // Create a session record
      const session: PomodoroSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'work',
        startedAt: Date.now() - (state.settings?.workDuration || 25) * 60 * 1000,
        completedAt: Date.now(),
        duration: (state.settings?.workDuration || 25) * 60,
        taskId: state.currentTaskId || undefined
      }
      
      state.sessions.push(session)
      
      // Increment current task pomodoros
      if (state.currentTaskId) {
        const task = state.tasks.find(t => t.id === state.currentTaskId)
        if (task) {
          task.pomodoroCount += 1
        }
      }
    },
    
    // Reset timer
    resetTimer: (state) => {
      state.timeLeft = (state.settings?.workDuration || 25) * 60
      state.currentPhase = 'work'
      state.isRunning = false
      state.workCount = 0
    },
    
    // Float window actions
    setShowFloatWindow: (state, action: PayloadAction<boolean>) => {
      state.showFloatWindow = action.payload
    },
    
    // Cleanup old sessions (keep last 30 days)
    cleanupOldSessions: (state) => {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      state.sessions = state.sessions.filter(session => 
        session.startedAt > thirtyDaysAgo
      )
    },
    
    // Clear all statistics
    clearStatistics: (state) => {
      state.sessions = []
      state.workCount = 0
    },
    
    // Set daily goal
    setDailyGoal: (state, action: PayloadAction<number>) => {
      if (!state.settings) {
        state.settings = {
          workDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          longBreakInterval: 4,
          dailyGoal: action.payload,
          showFloatWindow: false,
          enableNotifications: true
        }
      } else {
        state.settings.dailyGoal = action.payload
      }
    }
  }
})

export const {
  setTimeLeft,
  setCurrentPhase,
  setIsRunning,
  setWorkCount,
  setPomodoroState,
  updateSettings,
  addTask,
  toggleTask,
  deleteTask,
  setCurrentTask,
  incrementTaskPomodoros,
  addSession,
  completeSession,
  incrementPomodoroCount,
  resetTimer,
  setShowFloatWindow,
  cleanupOldSessions,
  clearStatistics,
  setDailyGoal
} = pomodoroSlice.actions

export default pomodoroSlice.reducer