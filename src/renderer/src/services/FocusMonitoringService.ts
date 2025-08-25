import { loggerService } from '@logger'
import store from '@renderer/store'
import {
  addLog,
  incrementDistractedChecks,
  incrementFocusedChecks,
  incrementTotalChecks,
  selectFocusMonitor,
  setIsActive,
  setLastCheckTime
} from '@renderer/store/focusMonitor'
import { AppNameNormalizer } from '@renderer/utils/AppNameNormalizer'

import systemAppService from './SystemAppService'

// Set up logging
loggerService.initWindowSource('main')
const logger = loggerService.withContext('FocusMonitoringService')

export interface MonitoringResult {
  isFocused: boolean
  reason: string
  activeApp?: string
  timestamp: number
  screenshot?: string
  ocrText?: string
}

class FocusMonitoringService {
  private static instance: FocusMonitoringService
  private monitoringInterval: NodeJS.Timeout | null = null
  private isRunning = false

  private constructor() {}

  static getInstance(): FocusMonitoringService {
    if (!FocusMonitoringService.instance) {
      FocusMonitoringService.instance = new FocusMonitoringService()
    }
    return FocusMonitoringService.instance
  }

  /**
   * Start focus monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Focus monitoring already running')
      return
    }

    const state = selectFocusMonitor(store.getState())

    if (!state.taskDescription.trim()) {
      throw new Error('Task description is required')
    }

    // Check if system app detection is supported
    const systemSupport = await systemAppService.isSupported()
    if (!systemSupport.isSupported) {
      throw new Error('System app detection not supported on this platform')
    }

    logger.info('Starting focus monitoring', {
      frequency: state.monitoringFrequency,
      taskDescription: state.taskDescription,
      allowedApps: state.allowedApps,
      blockedApps: state.blockedApps
    })

    this.isRunning = true
    store.dispatch(setIsActive(true))

    // Start monitoring loop
    this.scheduleNextCheck()
  }

  /**
   * Stop focus monitoring
   */
  stopMonitoring(): void {
    if (!this.isRunning) {
      logger.warn('Focus monitoring not running')
      return
    }

    logger.info('Stopping focus monitoring')

    if (this.monitoringInterval) {
      clearTimeout(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.isRunning = false
    store.dispatch(setIsActive(false))
  }

  /**
   * Schedule next monitoring check
   */
  private scheduleNextCheck(): void {
    if (!this.isRunning) return

    const state = selectFocusMonitor(store.getState())
    const frequency = state.monitoringFrequency * 1000 // Convert to milliseconds

    this.monitoringInterval = setTimeout(() => {
      this.performCheck()
    }, frequency)
  }

  /**
   * Perform a single monitoring check
   */
  private async performCheck(): Promise<void> {
    if (!this.isRunning) return

    try {
      logger.debug('Performing focus monitoring check')

      const result = await this.analyzeCurrentFocus()

      // Update Redux state
      store.dispatch(setLastCheckTime(result.timestamp))
      store.dispatch(addLog(result))
      store.dispatch(incrementTotalChecks())

      if (result.isFocused) {
        store.dispatch(incrementFocusedChecks())
      } else {
        store.dispatch(incrementDistractedChecks())
      }

      logger.info('Focus check completed', {
        isFocused: result.isFocused,
        activeApp: result.activeApp,
        reason: result.reason
      })

      // Show intervention alert if distracted
      if (!result.isFocused) {
        this.showInterventionAlert(result)
      }
    } catch (error) {
      logger.error('Focus monitoring check failed', error as Error)

      // Add error log
      store.dispatch(
        addLog({
          isFocused: false,
          reason: `监控检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        })
      )
    }

    // Schedule next check
    this.scheduleNextCheck()
  }

  /**
   * Analyze current focus state
   */
  private async analyzeCurrentFocus(): Promise<MonitoringResult> {
    const timestamp = Date.now()
    const state = selectFocusMonitor(store.getState())

    // Get current active application
    const activeApp = await systemAppService.getActiveApp()

    if (!activeApp) {
      return {
        isFocused: true, // Assume focused if no app detected
        reason: '未检测到活动应用',
        timestamp
      }
    }

    // Check against blocked apps first
    if (state.blockedApps.length > 0) {
      const blockedCheck = this.checkBlockedApps(activeApp.originalName, state.blockedApps)
      if (!blockedCheck.isFocused) {
        return {
          isFocused: false,
          reason: blockedCheck.reason,
          activeApp: activeApp.originalName,
          timestamp
        }
      }
    }

    // Check against allowed apps
    if (state.allowedApps.length > 0) {
      const allowedCheck = this.checkAllowedApps(activeApp.originalName, state.allowedApps)
      if (!allowedCheck.isFocused) {
        return {
          isFocused: false,
          reason: allowedCheck.reason,
          activeApp: activeApp.originalName,
          timestamp
        }
      }
    }

    // If we get here, the app is considered focused
    return {
      isFocused: true,
      reason: '使用允许的应用',
      activeApp: activeApp.originalName,
      timestamp
    }
  }

  /**
   * Check if current app is in blocked list
   */
  private checkBlockedApps(
    currentApp: string,
    blockedApps: string[]
  ): {
    isFocused: boolean
    reason: string
  } {
    const matchResult = AppNameNormalizer.findBestMatch(currentApp, blockedApps)

    if (matchResult.score > 0.6) {
      return {
        isFocused: false,
        reason: `使用了被屏蔽的应用: ${matchResult.match} (匹配度: ${(matchResult.score * 100).toFixed(0)}%)`
      }
    }

    return {
      isFocused: true,
      reason: '应用不在屏蔽列表中'
    }
  }

  /**
   * Check if current app is in allowed list
   */
  private checkAllowedApps(
    currentApp: string,
    allowedApps: string[]
  ): {
    isFocused: boolean
    reason: string
  } {
    const matchResult = AppNameNormalizer.findBestMatch(currentApp, allowedApps)

    if (matchResult.score > 0.6) {
      return {
        isFocused: true,
        reason: `使用允许的应用: ${matchResult.match} (匹配度: ${(matchResult.score * 100).toFixed(0)}%)`
      }
    }

    return {
      isFocused: false,
      reason: `应用不在允许列表中: ${currentApp}`
    }
  }

  /**
   * Show intervention alert for distractions
   */
  private showInterventionAlert(result: MonitoringResult): void {
    if (!window.Notification) {
      logger.warn('Notifications not supported')
      return
    }

    // Request notification permission if not granted
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification('专注提醒', {
        body: `检测到分心行为: ${result.reason}`,
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDlWMTNNMTIgMTdIMTIuMDFNMjEgMTJBOSA5IDAgMTEzIDEyQTkgOSAwIDAxMjEgMTJaIiBzdHJva2U9IiNGRjRENEYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=',
        tag: 'focus-distraction',
        requireInteraction: false,
        silent: false
      })

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)
    }
  }

  /**
   * Get current monitoring status
   */
  getStatus(): {
    isRunning: boolean
    lastCheckTime?: number
  } {
    const state = selectFocusMonitor(store.getState())
    return {
      isRunning: this.isRunning,
      lastCheckTime: state.lastCheckTime || undefined
    }
  }

  /**
   * Force a manual check (for testing)
   */
  async performManualCheck(): Promise<MonitoringResult> {
    if (!this.isRunning) {
      throw new Error('Monitoring is not active')
    }

    return await this.analyzeCurrentFocus()
  }
}

export default FocusMonitoringService.getInstance()
