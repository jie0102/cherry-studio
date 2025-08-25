import { loggerService } from '@logger'

// Set up logging
loggerService.initWindowSource('main')
const logger = loggerService.withContext('OCRService')

import * as Tesseract from 'tesseract.js'

export interface OCRResult {
  success: boolean
  text?: string
  confidence?: number
  error?: string
  timestamp: number
}

class OCRService {
  private static instance: OCRService
  private worker: Tesseract.Worker | null = null
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null

  private constructor() {}

  static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService()
    }
    return OCRService.instance
  }

  /**
   * Initialize Tesseract.js
   */
  private async initializeTesseract(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.doInitialization()
    return this.initializationPromise
  }

  private async doInitialization(): Promise<void> {
    try {
      logger.info('Initializing Tesseract.js OCR service')

      // Create worker
      this.worker = await Tesseract.createWorker('eng+chi_sim', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`)
          }
        }
      })

      this.isInitialized = true
      logger.info('Tesseract.js OCR service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Tesseract.js:', error as Error)
      this.isInitialized = false
      this.worker = null
      throw error
    }
  }

  /**
   * Check if OCR is supported and available
   */
  async isSupported(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initializeTesseract()
      }
      return this.isInitialized && this.worker !== null
    } catch (error) {
      logger.error('OCR support check failed:', error as Error)
      return false
    }
  }

  /**
   * Extract text from image using OCR
   */
  async extractText(imageData: string): Promise<OCRResult> {
    const timestamp = Date.now()

    try {
      if (!(await this.isSupported())) {
        return {
          success: false,
          error: 'OCR not supported or not initialized',
          timestamp
        }
      }

      if (!this.worker) {
        throw new Error('OCR worker not initialized')
      }

      logger.debug('Starting OCR text extraction')

      // Use the image data directly
      const result = await this.worker.recognize(imageData)

      const extractedText = result.data.text.trim()
      const confidence = result.data.confidence

      logger.debug('OCR extraction completed', {
        textLength: extractedText.length,
        confidence: confidence.toFixed(2)
      })

      return {
        success: true,
        text: extractedText,
        confidence,
        timestamp
      }
    } catch (error) {
      logger.error('OCR text extraction failed:', error as Error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown OCR error',
        timestamp
      }
    }
  }

  /**
   * Extract text with preprocessing for better accuracy
   */
  async extractTextWithPreprocessing(imageData: string): Promise<OCRResult> {
    try {
      // Create canvas for image preprocessing
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Cannot create canvas context')
      }

      // Load image
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = imageData
      })

      // Set canvas size
      canvas.width = img.width
      canvas.height = img.height

      // Draw original image
      ctx.drawImage(img, 0, 0)

      // Apply preprocessing for better OCR accuracy
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageDataObj.data

      // Convert to grayscale and enhance contrast
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])

        // Enhance contrast (simple threshold)
        const enhanced = gray > 128 ? 255 : 0

        data[i] = enhanced // Red
        data[i + 1] = enhanced // Green
        data[i + 2] = enhanced // Blue
        // Alpha stays the same
      }

      // Put processed image back
      ctx.putImageData(imageDataObj, 0, 0)

      // Convert processed canvas to base64
      const processedImageData = canvas.toDataURL('image/png')

      // Clean up
      canvas.remove()

      // Perform OCR on processed image
      return await this.extractText(processedImageData)
    } catch (error) {
      logger.error('OCR preprocessing failed, falling back to direct extraction:', error as Error)
      // Fallback to direct extraction
      return await this.extractText(imageData)
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate()
        logger.info('OCR worker terminated')
      } catch (error) {
        logger.error('Error terminating OCR worker:', error as Error)
      }
      this.worker = null
    }

    this.isInitialized = false
    this.initializationPromise = null
  }

  /**
   * Get OCR service status
   */
  getStatus(): {
    isInitialized: boolean
    isSupported: boolean
  } {
    return {
      isInitialized: this.isInitialized,
      isSupported: this.worker !== null
    }
  }
}

export default OCRService.getInstance()
