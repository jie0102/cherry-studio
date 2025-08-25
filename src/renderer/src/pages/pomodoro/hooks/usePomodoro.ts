import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { setPomodoroState } from '@renderer/store/pomodoro'
import PomodoroTimerService from '@renderer/services/PomodoroTimerService'

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

export interface PomodoroSettings {
  workDuration: number // minutes
  shortBreakDuration: number // minutes 
  longBreakDuration: number // minutes
  longBreakInterval: number // after how many work sessions
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4
}

export const usePomodoroTimer = () => {
  const timerService = PomodoroTimerService.getInstance()
  
  const { 
    timeLeft, 
    currentPhase, 
    isRunning, 
    workCount,
    settings = DEFAULT_SETTINGS 
  } = useAppSelector(state => state.pomodoro)

  // Calculate progress percentage
  const getPhaseDuration = (phase: PomodoroPhase) => {
    switch (phase) {
      case 'work':
        return settings.workDuration * 60
      case 'shortBreak':
        return settings.shortBreakDuration * 60
      case 'longBreak':
        return settings.longBreakDuration * 60
      default:
        return settings.workDuration * 60
    }
  }

  const totalTime = getPhaseDuration(currentPhase)
  const progress = ((totalTime - timeLeft) / totalTime) * 100

  // Timer controls - now delegate to the global service
  const startTimer = useCallback(() => {
    timerService.start()
  }, [timerService])

  const pauseTimer = useCallback(() => {
    timerService.pause()
  }, [timerService])

  const stopTimer = useCallback(() => {
    timerService.stop()
  }, [timerService])

  const resetTimer = useCallback(() => {
    timerService.reset()
  }, [timerService])

  const skipPhase = useCallback(() => {
    timerService.skipPhase()
  }, [timerService])

  return {
    timeLeft,
    currentPhase,
    isRunning,
    workCount,
    settings,
    progress,
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer,
    skipPhase,
    getPhaseDuration
  }
}

export const usePomodoroSettings = () => {
  const dispatch = useAppDispatch()
  const settings = useAppSelector(state => state.pomodoro.settings) || DEFAULT_SETTINGS

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    dispatch(setPomodoroState({ settings: updatedSettings }))
  }, [settings, dispatch])

  return {
    settings,
    updateSettings
  }
}