import type { PlasmoCSConfig } from "plasmo"
import { FormExtractor } from "@/utils/formExtractor"
import { apiClient } from "@/utils/api"

export const config: PlasmoCSConfig = {
  matches: ["https://docs.google.com/forms/*"],
  run_at: "document_idle"
}

class GoogleFormsHandler {
  private extractor: FormExtractor
  private initialized = false

  constructor() {
    this.extractor = new FormExtractor()
    this.init()
  }

  async init(): Promise<void> {
    if (this.initialized) return

    try {
      console.log('🏥 HIS Data Extractor: Initializing on Google Forms')
      
      // Wait for form to be fully loaded
      await this.waitForFormLoad()
      
      // Detect form country and load appropriate format
      await this.setupFormFormat()
      
      // Start watching for form changes
      this.startWatching()
      
      // Inject extraction UI
      this.extractor.injectExtractionUI()
      
      // Set up submission detection
      this.setupSubmissionDetection()
      
      this.initialized = true
      console.log('✅ Patient Data Extraction: Initialization complete')
      
    } catch (error) {
      console.error('❌ Patient Data Extraction: Initialization failed:', error)
    }
  }

  private async waitForFormLoad(): Promise<void> {
    return new Promise((resolve) => {
      const checkForm = () => {
        const formElements = document.querySelectorAll('input, textarea, select')
        if (formElements.length > 0) {
          resolve()
        } else {
          setTimeout(checkForm, 500)
        }
      }
      checkForm()
    })
  }

  private async setupFormFormat(): Promise<void> {
    try {
      // Detect country from form
      const detectedCountry = this.extractor.detectFormCountry()
      console.log('🌍 Detected country:', detectedCountry)

      if (!detectedCountry) {
        console.warn('⚠️ Could not detect form country, showing country selection UI')
        this.showCountrySelectionDialog()
        return
      }

      // Get form formats for detected country
      const response = await apiClient.getFormFormatsByCountry(detectedCountry)
      
      if (response.success && response.data && response.data.length > 0) {
        // Use the first active format for this country
        const activeFormat = response.data.find(format => format.isActive)
        if (activeFormat) {
          this.extractor.setFormFormat(activeFormat)
          console.log('📋 Using form format:', activeFormat.formName)
          this.updateExtractionStatus(`Ready to extract data using ${activeFormat.formName}`, 'success')
        } else {
          console.warn('⚠️ No active form format found for country:', detectedCountry)
          this.updateExtractionStatus(`No active form format for ${detectedCountry}`, 'warning')
        }
      } else {
        console.warn('⚠️ No form formats found for country:', detectedCountry)
        this.updateExtractionStatus(`No form formats found for ${detectedCountry}`, 'error')
      }
    } catch (error) {
      console.error('❌ Error setting up form format:', error)
      this.updateExtractionStatus(`Error setting up form format: ${error.message}`, 'error')
    }
  }

  private startWatching(): void {
    this.extractor.watchFormChanges((extractedData) => {
      console.log('📊 Form data updated:', extractedData)
      
      // Send to background script for real-time duplicate checking
      chrome.runtime.sendMessage({
        action: 'formDataChanged',
        data: extractedData
      })
    })
  }

  private async setupSubmissionDetection(): Promise<void> {
    try {
      const isSubmitting = await this.extractor.detectSubmission()
      
      if (isSubmitting) {
        console.log('📤 Form submission detected')
        await this.handleFormSubmission()
      }
    } catch (error) {
      console.error('❌ Error detecting submission:', error)
    }
  }

  private async handleFormSubmission(): Promise<void> {
    try {
      // Extract final data
      const extractionResult = this.extractor.extractFormData()
      
      if (!extractionResult.success || !extractionResult.data) {
        console.error('❌ Failed to extract form data:', extractionResult.error)
        this.showExtractionError(extractionResult.error || 'Data extraction failed')
        return
      }

      console.log('📊 Final extracted data:', extractionResult.data)

      // Analyze for duplicates
      const analysisResponse = await apiClient.analyzeExtraction({
        googleFormUrl: window.location.href,
        extractedData: extractionResult.data,
        country: extractionResult.data.country
      })

      if (analysisResponse.success && analysisResponse.data) {
        await this.handleDuplicateAnalysis(analysisResponse.data, extractionResult.data)
      } else {
        console.error('❌ Duplicate analysis failed:', analysisResponse.error)
        await this.saveDataDirectly(extractionResult.data)
      }

    } catch (error) {
      console.error('❌ Error handling form submission:', error)
      this.showExtractionError('Failed to process form submission')
    }
  }

  private async handleDuplicateAnalysis(analysis: any, extractedData: any): Promise<void> {
    if (analysis.isDuplicate && analysis.duplicatePatients.length > 0) {
      // Show duplicate confirmation dialog
      await this.showDuplicateDialog(analysis, extractedData)
    } else if (analysis.validationErrors.length > 0) {
      // Show validation errors
      this.showValidationErrors(analysis.validationErrors)
    } else {
      // No duplicates, save directly
      await this.saveDataDirectly(extractedData)
    }
  }

  private async showDuplicateDialog(analysis: any, extractedData: any): Promise<void> {
    const dialogHTML = `
      <div id="his-duplicate-dialog" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <div style="
          background: white;
          padding: 24px;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        ">
          <h3 style="margin: 0 0 16px 0; color: #dc3545;">⚠️ Potential Duplicate Found</h3>
          <p>We found ${analysis.duplicatePatients.length} similar patient record(s) in the database:</p>
          
          <div style="margin: 16px 0; padding: 12px; background: #f8f9fa; border-radius: 4px;">
            ${analysis.duplicatePatients.map((patient: any) => `
              <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px;">
                <strong>${patient.name}</strong> (Age: ${patient.age}, Country: ${patient.country})
                <br><small>Added: ${new Date(patient.extractedAt).toLocaleDateString()}</small>
              </div>
            `).join('')}
          </div>
          
          <p>What would you like to do?</p>
          
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button id="save-anyway" style="
              flex: 1;
              padding: 10px;
              background: #28a745;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            ">Save Anyway</button>
            <button id="cancel-save" style="
              flex: 1;
              padding: 10px;
              background: #6c757d;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            ">Cancel</button>
          </div>
        </div>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', dialogHTML)

    return new Promise((resolve) => {
      document.getElementById('save-anyway')?.addEventListener('click', async () => {
        document.getElementById('his-duplicate-dialog')?.remove()
        await this.saveDataDirectly(extractedData)
        resolve()
      })

      document.getElementById('cancel-save')?.addEventListener('click', () => {
        document.getElementById('his-duplicate-dialog')?.remove()
        resolve()
      })
    })
  }

  private showValidationErrors(errors: string[]): void {
    const errorHTML = `
      <div id="his-validation-dialog" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 16px;
        border-radius: 4px;
        border: 1px solid #f5c6cb;
        max-width: 300px;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <h4 style="margin: 0 0 8px 0;">❌ Validation Errors</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
        <button onclick="this.parentElement.remove()" style="
          margin-top: 8px;
          padding: 4px 8px;
          background: #721c24;
          color: white;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          float: right;
        ">Close</button>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', errorHTML)

    // Auto-remove after 10 seconds
    setTimeout(() => {
      document.getElementById('his-validation-dialog')?.remove()
    }, 10000)
  }

  private showExtractionError(error: string): void {
    const errorHTML = `
      <div id="his-error-dialog" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 16px;
        border-radius: 4px;
        border: 1px solid #f5c6cb;
        max-width: 300px;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <h4 style="margin: 0 0 8px 0;">❌ Extraction Error</h4>
        <p style="margin: 0;">${error}</p>
        <button onclick="this.parentElement.remove()" style="
          margin-top: 8px;
          padding: 4px 8px;
          background: #721c24;
          color: white;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          float: right;
        ">Close</button>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', errorHTML)
  }

  private showCountrySelectionDialog(): void {
    const dialogHTML = `
      <div id="his-country-dialog" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <div style="
          background: white;
          padding: 24px;
          border-radius: 8px;
          max-width: 400px;
          width: 90%;
        ">
          <h3 style="margin: 0 0 16px 0; color: #1976d2;">🌍 Select Form Country</h3>
          <p>We couldn't automatically detect the country for this form. Please select:</p>
          
          <div style="margin: 16px 0; display: flex; flex-direction: column; gap: 8px;">
            <button onclick="window.selectCountry('India')" style="padding: 12px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; text-align: left;">
              🇮🇳 India (Aadhaar, Hospital UID)
            </button>
            <button onclick="window.selectCountry('UK')" style="padding: 12px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; text-align: left;">
              🇬🇧 United Kingdom (NHS)
            </button>
            <button onclick="window.selectCountry('US')" style="padding: 12px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; text-align: left;">
              🇺🇸 United States (SSN, Insurance)
            </button>
            <button onclick="window.selectCountry('Japan')" style="padding: 12px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; text-align: left;">
              🇯🇵 Japan (Prefecture, Health Insurance)
            </button>
          </div>
          
          <button onclick="document.getElementById('his-country-dialog').remove()" style="
            padding: 8px 16px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            float: right;
          ">Cancel</button>
        </div>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', dialogHTML)

    // Add global country selection handler
    ;(window as any).selectCountry = async (country: string) => {
      document.getElementById('his-country-dialog')?.remove()
      await this.loadFormFormatForCountry(country)
    }
  }

  private async loadFormFormatForCountry(country: string): Promise<void> {
    try {
      this.updateExtractionStatus(`Loading ${country} form format...`, 'info')
      
      const response = await apiClient.getFormFormatsByCountry(country)
      
      if (response.success && response.data && response.data.length > 0) {
        const activeFormat = response.data.find(format => format.isActive)
        if (activeFormat) {
          this.extractor.setFormFormat(activeFormat)
          console.log('📋 Manually selected form format:', activeFormat.formName)
          this.updateExtractionStatus(`Using ${activeFormat.formName}`, 'success')
        } else {
          this.updateExtractionStatus(`No active form format for ${country}`, 'warning')
        }
      } else {
        this.updateExtractionStatus(`No form formats found for ${country}`, 'error')
      }
    } catch (error) {
      console.error('❌ Error loading form format:', error)
      this.updateExtractionStatus(`Error loading ${country} format`, 'error')
    }
  }

  private updateExtractionStatus(message: string, type: 'success' | 'warning' | 'error' | 'info'): void {
    const statusEl = document.getElementById('extraction-status')
    if (!statusEl) return

    statusEl.textContent = message

    const colors = {
      success: { bg: '#d4edda', color: '#155724' },
      warning: { bg: '#fff3cd', color: '#856404' },
      error: { bg: '#f8d7da', color: '#721c24' },
      info: { bg: '#e3f2fd', color: '#1565c0' }
    }

    const { bg, color } = colors[type]
    statusEl.style.background = bg
    statusEl.style.color = color
  }

  private async saveDataDirectly(extractedData: any): Promise<void> {
    try {
      const response = await apiClient.saveExtractedData({
        extractedData,
        googleFormUrl: window.location.href
      })

      if (response.success) {
        this.showSuccessMessage('Data saved successfully!')
        console.log('✅ Data saved successfully:', response.data)
      } else {
        throw new Error(response.error || 'Failed to save data')
      }
    } catch (error) {
      console.error('❌ Error saving data:', error)
      this.showExtractionError('Failed to save data to database')
    }
  }

  private showSuccessMessage(message: string): void {
    const successHTML = `
      <div id="his-success-dialog" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d4edda;
        color: #155724;
        padding: 16px;
        border-radius: 4px;
        border: 1px solid #c3e6cb;
        max-width: 300px;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <h4 style="margin: 0 0 8px 0;">✅ Success</h4>
        <p style="margin: 0;">${message}</p>
        <button onclick="this.parentElement.remove()" style="
          margin-top: 8px;
          padding: 4px 8px;
          background: #155724;
          color: white;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          float: right;
        ">Close</button>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', successHTML)

    // Auto-remove after 5 seconds
    setTimeout(() => {
      document.getElementById('his-success-dialog')?.remove()
    }, 5000)
  }

  // Handle analysis complete message from background script
  async handleAnalysisComplete(analysis: any, extractedData: any): Promise<void> {
    console.log('🔍 Handling analysis complete:', analysis)
    try {
      await this.handleDuplicateAnalysis(analysis, extractedData)
    } catch (error) {
      console.error('❌ Error handling analysis complete:', error)
      this.showExtractionError('Failed to process analysis results')
    }
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received message:', message)
  
  if (message.action === 'analysisComplete') {
    // Get the handler instance and process the analysis
    const handler = (window as any).__googleFormsHandler
    if (handler) {
      handler.handleAnalysisComplete(message.analysis, message.extractedData)
    } else {
      console.error('❌ GoogleFormsHandler instance not found')
    }
  }
  
  return false
})

// Initialize when DOM is ready
let handlerInstance: GoogleFormsHandler | null = null

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    handlerInstance = new GoogleFormsHandler()
    ;(window as any).__googleFormsHandler = handlerInstance
  })
} else {
  handlerInstance = new GoogleFormsHandler()
  ;(window as any).__googleFormsHandler = handlerInstance
}