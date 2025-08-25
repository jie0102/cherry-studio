import { loggerService } from '@logger'

// Set up logging
loggerService.initWindowSource('main')
const logger = loggerService.withContext('ScreenCaptureService')

export interface CaptureResult {
  success: boolean
  imageData?: string // Base64 encoded image
  error?: string
  timestamp: number
}

class ScreenCaptureService {
  private static instance: ScreenCaptureService

  private constructor() {}

  static getInstance(): ScreenCaptureService {
    if (!ScreenCaptureService.instance) {
      ScreenCaptureService.instance = new ScreenCaptureService()
    }
    return ScreenCaptureService.instance
  }

  /**
   * Check if screen capture is supported
   */
  async isSupported(): Promise<boolean> {
    try {
      // Check if navigator.mediaDevices.getDisplayMedia is available
      return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
    } catch (error) {
      logger.error('Error checking screen capture support:', error as Error)
      return false
    }
  }

  /**
   * Capture the current screen
   */
  async captureScreen(): Promise<CaptureResult> {
    const timestamp = Date.now()

    try {
      if (!(await this.isSupported())) {
        return {
          success: false,
          error: 'Screen capture not supported',
          timestamp
        }
      }

      logger.debug('Starting screen capture')

      // Get screen stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { max: 1920 },
          height: { max: 1080 }
        } as any,
        audio: false
      })

      // Create video element to capture frame
      const video = document.createElement('video')
      video.srcObject = stream
      video.autoplay = true
      video.muted = true

      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play()
          resolve()
        }
        video.onerror = () => reject(new Error('Video load failed'))

        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Video load timeout')), 10000)
      })

      // Wait a bit for the video to start playing
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Create canvas to capture frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Cannot get canvas context')
      }

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to base64
      const imageData = canvas.toDataURL('image/png')

      // Stop stream
      stream.getTracks().forEach((track) => track.stop())

      // Clean up
      video.remove()
      canvas.remove()

      logger.debug('Screen capture completed successfully')

      return {
        success: true,
        imageData,
        timestamp
      }
    } catch (error) {
      logger.error('Screen capture failed:', error as Error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      }
    }
  }

  /**
   * Capture screen with retry mechanism
   */
  async captureScreenWithRetry(maxRetries: number = 3): Promise<CaptureResult> {
    let lastError: string = 'Unknown error'

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.debug(`Screen capture attempt ${attempt}/${maxRetries}`)

      const result = await this.captureScreen()

      if (result.success) {
        return result
      }

      lastError = result.error || 'Unknown error'

      if (attempt < maxRetries) {
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts: ${lastError}`,
      timestamp: Date.now()
    }
  }

  /**
   * Request screen capture permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { max: 1 },
          height: { max: 1 }
        } as any,
        audio: false
      })

      // Stop immediately
      stream.getTracks().forEach((track) => track.stop())

      return true
    } catch (error) {
      logger.error('Failed to request screen capture permission:', error as Error)
      return false
    }
  }
}

export default ScreenCaptureService.getInstance()
