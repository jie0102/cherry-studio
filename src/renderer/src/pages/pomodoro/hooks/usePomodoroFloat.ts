import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { setShowFloatWindow } from '@renderer/store/pomodoro'

export const usePomodoroFloat = () => {
  const dispatch = useAppDispatch()
  const { isRunning, settings, showFloatWindow } = useAppSelector(state => state.pomodoro)
  
  const enableFloatWindow = settings?.showFloatWindow || false
  
  // Auto show/hide float window based on timer state and settings
  useEffect(() => {
    if (enableFloatWindow && isRunning) {
      // Only show float window when app is minimized or not focused
      const handleVisibilityChange = () => {
        if (document.hidden || !document.hasFocus()) {
          dispatch(setShowFloatWindow(true))
        }
      }
      
      const handleFocus = () => {
        dispatch(setShowFloatWindow(false))
      }
      
      const handleBlur = () => {
        if (enableFloatWindow && isRunning) {
          dispatch(setShowFloatWindow(true))
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('focus', handleFocus)
      window.addEventListener('blur', handleBlur)
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
        window.removeEventListener('blur', handleBlur)
      }
    } else {
      dispatch(setShowFloatWindow(false))
      return () => {} // Return a cleanup function
    }
  }, [enableFloatWindow, isRunning, dispatch])
  
  const toggleFloatWindow = useCallback(() => {
    dispatch(setShowFloatWindow(!showFloatWindow))
  }, [showFloatWindow, dispatch])
  
  const hideFloatWindow = useCallback(() => {
    dispatch(setShowFloatWindow(false))
  }, [dispatch])
  
  const showFloatWindowManually = useCallback(() => {
    if (enableFloatWindow) {
      dispatch(setShowFloatWindow(true))
    }
  }, [enableFloatWindow, dispatch])
  
  return {
    showFloatWindow,
    enableFloatWindow,
    toggleFloatWindow,
    hideFloatWindow,
    showFloatWindowManually
  }
}