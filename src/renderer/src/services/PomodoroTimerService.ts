import store from '@renderer/store'
import { 
  setTimeLeft,
  setCurrentPhase,
  setIsRunning,
  setWorkCount,
  incrementPomodoroCount
} from '@renderer/store/pomodoro'
import type { PomodoroPhase } from '@renderer/pages/pomodoro/hooks/usePomodoro'

class PomodoroTimerService {
  private static instance: PomodoroTimerService | null = null
  private intervalId: NodeJS.Timeout | null = null

  private constructor() {}

  static getInstance(): PomodoroTimerService {
    if (!PomodoroTimerService.instance) {
      PomodoroTimerService.instance = new PomodoroTimerService()
    }
    return PomodoroTimerService.instance
  }

  start(): void {
    if (this.intervalId) {
      return // Already running
    }

    store.dispatch(setIsRunning(true))
    
    this.intervalId = setInterval(() => {
      this.tick()
    }, 1000)

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  pause(): void {
    store.dispatch(setIsRunning(false))
    this.clearInterval()
  }

  stop(): void {
    store.dispatch(setIsRunning(false))
    store.dispatch(setCurrentPhase('work'))
    const workDuration = (store.getState().pomodoro.settings?.workDuration || 25) * 60
    store.dispatch(setTimeLeft(workDuration))
    this.clearInterval()
  }

  reset(): void {
    store.dispatch(setIsRunning(false))
    store.dispatch(setWorkCount(0))
    store.dispatch(setCurrentPhase('work'))
    const workDuration = (store.getState().pomodoro.settings?.workDuration || 25) * 60
    store.dispatch(setTimeLeft(workDuration))
    this.clearInterval()
  }

  skipPhase(): void {
    const state = store.getState().pomodoro
    
    if (state.currentPhase === 'work') {
      store.dispatch(incrementPomodoroCount())
      const newWorkCount = state.workCount + 1
      store.dispatch(setWorkCount(newWorkCount))
      
      const nextPhase: PomodoroPhase = newWorkCount % (state.settings?.longBreakInterval || 4) === 0 
        ? 'longBreak' 
        : 'shortBreak'
      
      const nextDuration = nextPhase === 'longBreak' 
        ? (state.settings?.longBreakDuration || 15) * 60
        : (state.settings?.shortBreakDuration || 5) * 60
      
      store.dispatch(setCurrentPhase(nextPhase))
      store.dispatch(setTimeLeft(nextDuration))
    } else {
      const workDuration = (state.settings?.workDuration || 25) * 60
      store.dispatch(setCurrentPhase('work'))
      store.dispatch(setTimeLeft(workDuration))
    }
  }

  private tick(): void {
    const state = store.getState().pomodoro
    
    if (!state.isRunning || state.timeLeft <= 0) {
      return
    }
    
    const newTimeLeft = Math.max(0, state.timeLeft - 1)
    store.dispatch(setTimeLeft(newTimeLeft))
    
    if (newTimeLeft === 0) {
      this.handlePhaseCompleted(state.currentPhase === 'work')
    }
  }

  private handlePhaseCompleted(wasWorkPhase: boolean): void {
    const state = store.getState().pomodoro
    
    if (wasWorkPhase) {
      store.dispatch(incrementPomodoroCount())
      const newWorkCount = state.workCount + 1
      store.dispatch(setWorkCount(newWorkCount))
      
      // Determine next break type
      const nextPhase: PomodoroPhase = newWorkCount % (state.settings?.longBreakInterval || 4) === 0 
        ? 'longBreak' 
        : 'shortBreak'
      
      const nextDuration = nextPhase === 'longBreak' 
        ? (state.settings?.longBreakDuration || 15) * 60
        : (state.settings?.shortBreakDuration || 5) * 60
      
      store.dispatch(setCurrentPhase(nextPhase))
      store.dispatch(setTimeLeft(nextDuration))
    } else {
      // Break completed, start work
      const workDuration = (state.settings?.workDuration || 25) * 60
      store.dispatch(setCurrentPhase('work'))
      store.dispatch(setTimeLeft(workDuration))
    }
    
    // Show notification
    this.showPhaseCompletedNotification(wasWorkPhase)
  }

  private showPhaseCompletedNotification(wasWorkPhase: boolean): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = wasWorkPhase ? 'Work Session Completed!' : 'Break Time Over!'
      const body = wasWorkPhase 
        ? 'Time for a break! 🎉'
        : 'Ready to get back to work? 💪'
      
      new Notification(title, { body, icon: '/favicon.ico' })
    }
    
    // Play sound if available
    try {
      const audio = new Audio('/notification.mp3')
      audio.play().catch(() => {}) // Ignore errors
    } catch (error) {
      // Ignore audio errors
    }
  }

  private clearInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // Cleanup method for when the app shuts down
  destroy(): void {
    this.clearInterval()
    PomodoroTimerService.instance = null
  }
}

export default PomodoroTimerService