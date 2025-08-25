import { AppNameNormalizer } from '@renderer/utils/AppNameNormalizer'

export interface AppInfo {
  name: string // Normalized app name
  originalName: string // Original app name from system
  title?: string // Window title (if available)
  pid: number // Process ID
  isActive: boolean // Whether this is the active/foreground app
  memoryUsage?: number // Memory usage in MB
  executablePath?: string // Path to executable
}

export interface ProcessInfo {
  name: string
  originalName: string
  pid: number
  memoryUsage: number
  cpuUsage?: number
}

export interface ActiveWindowInfo {
  title: string
  appName: string
  pid: number
  bounds?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface AppStatusResult {
  activeApp: AppInfo | null
  runningApps: AppInfo[]
  totalProcesses: number
  timestamp: number
}

class SystemAppService {
  private static instance: SystemAppService
  private cachedApps: AppInfo[] = []
  private lastFetchTime: number = 0
  private readonly CACHE_DURATION = 2000 // 2 seconds cache

  private constructor() {}

  static getInstance(): SystemAppService {
    if (!SystemAppService.instance) {
      SystemAppService.instance = new SystemAppService()
    }
    return SystemAppService.instance
  }

  /**
   * Get current active/foreground application
   */
  async getActiveApp(): Promise<AppInfo | null> {
    try {
      // Call main process via IPC to get active window info
      const activeWindow = await window.api?.system?.getActiveWindow?.()

      if (!activeWindow) {
        return null
      }

      const normalizedName = AppNameNormalizer.normalizeBasic(activeWindow.owner?.name || activeWindow.title)
      const extractedFromTitle = AppNameNormalizer.extractAppNameFromTitle(activeWindow.title || '')

      return {
        name: normalizedName || extractedFromTitle,
        originalName: activeWindow.owner?.name || activeWindow.title || 'Unknown',
        title: activeWindow.title,
        pid: activeWindow.owner?.pid || 0,
        isActive: true,
        executablePath: activeWindow.owner?.path
      }
    } catch (error) {
      console.error('Failed to get active app:', error)
      return null
    }
  }

  /**
   * Get list of all running processes
   */
  async getRunningProcesses(): Promise<ProcessInfo[]> {
    try {
      // Call main process via IPC to get process list
      const processes = await window.api?.system?.getRunningProcesses?.()

      if (!Array.isArray(processes)) {
        return []
      }

      return processes
        .filter((proc) => proc.name && proc.name.trim().length > 0)
        .map((proc) => ({
          name: AppNameNormalizer.normalizeBasic(proc.name),
          originalName: proc.name,
          pid: proc.pid || 0,
          memoryUsage: proc.memory ? Math.round(proc.memory / 1024 / 1024) : 0, // Convert to MB
          cpuUsage: proc.cpu || 0
        }))
        .sort((a, b) => b.memoryUsage - a.memoryUsage) // Sort by memory usage desc
    } catch (error) {
      console.error('Failed to get running processes:', error)
      return []
    }
  }

  /**
   * Get comprehensive app status (active + running apps)
   */
  async getAppStatus(useCache: boolean = true): Promise<AppStatusResult> {
    const now = Date.now()

    // Return cached result if still valid
    if (useCache && this.cachedApps.length > 0 && now - this.lastFetchTime < this.CACHE_DURATION) {
      const activeApp = this.cachedApps.find((app) => app.isActive) || null
      return {
        activeApp,
        runningApps: this.cachedApps,
        totalProcesses: this.cachedApps.length,
        timestamp: this.lastFetchTime
      }
    }

    try {
      // Fetch both active app and process list concurrently
      const [activeApp, processes] = await Promise.all([this.getActiveApp(), this.getRunningProcesses()])

      // Create app info list, avoiding duplicates
      const appMap = new Map<number, AppInfo>()

      // Add active app first
      if (activeApp && activeApp.pid > 0) {
        appMap.set(activeApp.pid, activeApp)
      }

      // Add other running apps
      for (const proc of processes) {
        if (proc.pid > 0 && !appMap.has(proc.pid)) {
          appMap.set(proc.pid, {
            name: proc.name,
            originalName: proc.originalName,
            pid: proc.pid,
            isActive: false,
            memoryUsage: proc.memoryUsage
          })
        }
      }

      // Convert to array and mark active app
      const runningApps = Array.from(appMap.values())
      if (activeApp && activeApp.pid > 0) {
        const activeAppInList = runningApps.find((app) => app.pid === activeApp.pid)
        if (activeAppInList) {
          activeAppInList.isActive = true
          activeAppInList.title = activeApp.title
        }
      }

      // Update cache
      this.cachedApps = runningApps
      this.lastFetchTime = now

      return {
        activeApp,
        runningApps,
        totalProcesses: runningApps.length,
        timestamp: now
      }
    } catch (error) {
      console.error('Failed to get app status:', error)
      return {
        activeApp: null,
        runningApps: [],
        totalProcesses: 0,
        timestamp: now
      }
    }
  }

  /**
   * Find matching apps from running apps list
   */
  findMatchingApps(
    targetName: string,
    runningApps: AppInfo[]
  ): Array<{
    app: AppInfo
    score: number
  }> {
    if (!targetName || runningApps.length === 0) {
      return []
    }

    const appNames = runningApps.map((app) => app.originalName)
    const matches = AppNameNormalizer.findAllMatches(targetName, appNames, 0.6)

    return matches
      .map((match) => {
        const app = runningApps.find((a) => a.originalName === match.app)
        return app ? { app, score: match.score } : null
      })
      .filter(Boolean) as Array<{ app: AppInfo; score: number }>
  }

  /**
   * Check if any blocked apps are currently running
   */
  async checkBlockedApps(blockedApps: string[]): Promise<{
    hasBlockedApp: boolean
    detectedApps: Array<{
      app: AppInfo
      blockedAppName: string
      matchScore: number
    }>
  }> {
    if (blockedApps.length === 0) {
      return { hasBlockedApp: false, detectedApps: [] }
    }

    const { runningApps } = await this.getAppStatus()
    const detectedApps: Array<{
      app: AppInfo
      blockedAppName: string
      matchScore: number
    }> = []

    for (const blockedApp of blockedApps) {
      const matches = this.findMatchingApps(blockedApp, runningApps)

      for (const match of matches) {
        detectedApps.push({
          app: match.app,
          blockedAppName: blockedApp,
          matchScore: match.score
        })
      }
    }

    return {
      hasBlockedApp: detectedApps.length > 0,
      detectedApps
    }
  }

  /**
   * Check if current active app is in allowed apps list
   */
  async checkAllowedApps(allowedApps: string[]): Promise<{
    isAllowed: boolean
    activeApp: AppInfo | null
    matchInfo: {
      matchedAllowedApp: string | null
      matchScore: number
    } | null
  }> {
    if (allowedApps.length === 0) {
      // If no allowed apps specified, everything is allowed
      const activeApp = await this.getActiveApp()
      return {
        isAllowed: true,
        activeApp,
        matchInfo: null
      }
    }

    const activeApp = await this.getActiveApp()

    if (!activeApp) {
      return {
        isAllowed: true, // No active app detected
        activeApp: null,
        matchInfo: null
      }
    }

    const matchResult = AppNameNormalizer.findBestMatch(activeApp.originalName, allowedApps)

    return {
      isAllowed: matchResult.score > 0.6,
      activeApp,
      matchInfo: {
        matchedAllowedApp: matchResult.match,
        matchScore: matchResult.score
      }
    }
  }

  /**
   * Get app suggestions based on partial name input
   */
  async getAppSuggestions(
    partialName: string,
    maxSuggestions: number = 10
  ): Promise<
    Array<{
      name: string
      originalName: string
      isRunning: boolean
      pid?: number
      score: number
    }>
  > {
    if (!partialName || partialName.length < 2) {
      return []
    }

    const { runningApps } = await this.getAppStatus()
    const runningAppNames = runningApps.map((app) => app.originalName)

    const suggestions = AppNameNormalizer.suggestAppNames(partialName, runningAppNames, maxSuggestions)

    return suggestions.map((suggestion) => {
      const runningApp = runningApps.find((app) => app.originalName === suggestion.app)
      return {
        name: AppNameNormalizer.normalizeBasic(suggestion.app),
        originalName: suggestion.app,
        isRunning: !!runningApp,
        pid: runningApp?.pid,
        score: suggestion.score
      }
    })
  }

  /**
   * Get system app statistics
   */
  async getAppStatistics(): Promise<{
    totalApps: number
    totalMemoryUsage: number // MB
    topMemoryApps: Array<{
      name: string
      memoryUsage: number
    }>
    uniqueAppNames: number
  }> {
    const { runningApps } = await this.getAppStatus()

    const totalMemoryUsage = runningApps.reduce((sum, app) => sum + (app.memoryUsage || 0), 0)
    const topMemoryApps = runningApps
      .filter((app) => app.memoryUsage && app.memoryUsage > 0)
      .sort((a, b) => (b.memoryUsage || 0) - (a.memoryUsage || 0))
      .slice(0, 10)
      .map((app) => ({
        name: app.originalName,
        memoryUsage: app.memoryUsage || 0
      }))

    const uniqueNames = new Set(runningApps.map((app) => app.name.toLowerCase()))

    return {
      totalApps: runningApps.length,
      totalMemoryUsage,
      topMemoryApps,
      uniqueAppNames: uniqueNames.size
    }
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cachedApps = []
    this.lastFetchTime = 0
  }

  /**
   * Check if app detection is supported on current platform
   */
  async isSupported(): Promise<{
    isSupported: boolean
    features: {
      activeWindow: boolean
      processList: boolean
    }
    error?: string
  }> {
    try {
      const hasActiveWindowAPI = typeof window.api?.system?.getActiveWindow === 'function'
      const hasProcessListAPI = typeof window.api?.system?.getRunningProcesses === 'function'

      return {
        isSupported: hasActiveWindowAPI && hasProcessListAPI,
        features: {
          activeWindow: hasActiveWindowAPI,
          processList: hasProcessListAPI
        }
      }
    } catch (error) {
      return {
        isSupported: false,
        features: {
          activeWindow: false,
          processList: false
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export default SystemAppService.getInstance()
