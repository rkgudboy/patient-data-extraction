import type { FormFormat, ExtractedData, ExtractionResult } from '@/types'

export class FormExtractor {
  private formFormat: FormFormat | null = null
  private currentUrl: string = ''

  constructor() {
    this.currentUrl = window.location.href
  }

  setFormFormat(format: FormFormat): void {
    this.formFormat = format
  }

  detectFormCountry(): string | null {
    console.log('🌍 Starting country detection...')
    
    // Check for data attribute first
    const formContainer = document.querySelector('[data-form-country]') as HTMLElement
    if (formContainer) {
      const country = formContainer.dataset.formCountry
      console.log('🌍 Country from data attribute:', country)
      return country || null
    }

    // Get form title and description for analysis
    const formTitle = this.getFormTitle()
    const formDescription = this.getFormDescription()
    const combinedText = `${formTitle} ${formDescription}`.toLowerCase()
    
    console.log('🌍 Form title:', formTitle)
    console.log('🌍 Form description:', formDescription)
    console.log('🌍 Combined text for analysis:', combinedText)

    // Enhanced country detection patterns
    const countryPatterns = {
      'India': [
        'india', 'indian', 'aadhaar', 'aadhar', 'uid', 
        'hospital uid', 'भारत', 'भारतीय', '[india]'
      ],
      'UK': [
        'nhs', 'uk', 'british', 'britain', 'england', 
        'scotland', 'wales', 'northern ireland', '[uk]', '[nhs]'
      ],
      'US': [
        'usa', 'us', 'american', 'america', 'ssn', 
        'social security', 'medicare', 'medicaid', '[us]', '[usa]'
      ],
      'Japan': [
        'japan', 'japanese', 'prefecture', '日本', 
        'nihon', 'nippon', '[japan]', '患者'
      ]
    }

    // Check title and content for country patterns
    for (const [country, patterns] of Object.entries(countryPatterns)) {
      for (const pattern of patterns) {
        if (combinedText.includes(pattern)) {
          console.log(`🌍 Detected country: ${country} (matched pattern: "${pattern}")`)
          return country
        }
      }
    }

    // Check form fields for country-specific patterns
    const fieldTexts = this.getFormFieldTexts()
    console.log('🌍 Form field texts:', fieldTexts)
    
    const fieldText = fieldTexts.join(' ').toLowerCase()
    for (const [country, patterns] of Object.entries(countryPatterns)) {
      for (const pattern of patterns) {
        if (fieldText.includes(pattern)) {
          console.log(`🌍 Detected country from fields: ${country} (matched pattern: "${pattern}")`)
          return country
        }
      }
    }

    console.warn('⚠️ Could not detect form country from title, description, or fields')
    return null
  }

  getFormTitle(): string {
    // Try multiple selectors for Google Forms title
    const selectors = [
      '[data-params*="form"] h1',
      '.freebirdFormviewerViewHeaderTitle',
      '.freebirdFormviewerViewHeaderTitleRow div[role="heading"]',
      'h1[data-item-id]',
      '.doc-title',
      '.freebirdFormviewerViewHeaderTitleRow',
      '.freebirdFormviewerViewHeaderTitle div',
      'div[role="heading"][data-value]'
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement
      if (element && element.textContent?.trim()) {
        return element.textContent.trim()
      }
    }

    return ''
  }

  getFormDescription(): string {
    // Try multiple selectors for Google Forms description
    const selectors = [
      '.freebirdFormviewerViewHeaderDescription',
      '.freebirdFormviewerViewHeaderDescriptionText',
      '[data-params*="form"] .description',
      '.form-description',
      '.freebirdFormviewerViewHeaderRequiredLegend'
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement
      if (element && element.textContent?.trim()) {
        return element.textContent.trim()
      }
    }

    return ''
  }

  getFormFieldTexts(): string[] {
    const fieldTexts: string[] = []
    
    // Get all question labels and field labels
    const labelSelectors = [
      '.freebirdFormviewerComponentsQuestionBaseTitle',
      '.freebirdFormviewerComponentsQuestionBaseDescription',
      'label',
      '.question-title',
      '.field-label',
      '[role="heading"]',
      '.export-pass-through'
    ]

    labelSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        const text = element.textContent?.trim()
        if (text && text.length > 0) {
          fieldTexts.push(text)
        }
      })
    })

    // Also get placeholder texts
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(element => {
      const placeholder = (element as HTMLInputElement).placeholder?.trim()
      if (placeholder && placeholder.length > 0) {
        fieldTexts.push(placeholder)
      }
    })

    return [...new Set(fieldTexts)] // Remove duplicates
  }

  extractFormData(): ExtractionResult {
    try {
      if (!this.formFormat) {
        return {
          success: false,
          error: 'No form format configured'
        }
      }

      const extractedData: ExtractedData = {}
      const errors: string[] = []

      // Extract data using field mappings
      for (const mapping of this.formFormat.fieldMappings) {
        const value = this.extractFieldValue(mapping)
        
        console.log(`🔍 Field '${mapping.fieldName}': value="${value}", required=${mapping.isRequired}`)
        
        if (value !== null && value !== undefined && value !== '') {
          extractedData[mapping.fieldName] = value
        } else {
          // Check if field element exists but is empty
          const element = mapping.googleFormSelector ? 
            document.querySelector(mapping.googleFormSelector) : null
          
          if (element) {
            console.log(`⚠️ Field '${mapping.fieldName}' found but empty (element exists)`)
            if (mapping.isRequired) {
              errors.push(`Required field '${mapping.fieldName}' is empty`)
            }
          } else {
            console.log(`❌ Field '${mapping.fieldName}' not found (element missing)`)
            if (mapping.isRequired) {
              errors.push(`Required field '${mapping.fieldName}' not found on form`)
            }
          }
        }
      }

      // Add country data
      extractedData.country = this.formFormat.country

      return {
        success: errors.length === 0,
        data: extractedData,
        formFormat: this.formFormat,
        error: errors.length > 0 ? errors.join('; ') : undefined
      }
    } catch (error) {
      console.error('Form extraction error:', error)
      return {
        success: false,
        error: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private extractFieldValue(mapping: any): any {
    try {
      console.log(`🔍 Extracting field: ${mapping.fieldName}`)
      
      // Try Google Forms selector first (most reliable)
      if (mapping.googleFormSelector) {
        console.log(`  Trying selector: ${mapping.googleFormSelector}`)
        const element = document.querySelector(mapping.googleFormSelector) as HTMLInputElement
        if (element) {
          const value = this.getElementValue(element, mapping.inputType)
          console.log(`  ✅ Found value via selector:`, value)
          return value
        } else {
          console.log(`  ❌ No element found with selector: ${mapping.googleFormSelector}`)
        }
      }

      // Try aria-label if available
      if (mapping.ariaLabel) {
        const ariaSelector = `input[aria-label="${mapping.ariaLabel}"], textarea[aria-label="${mapping.ariaLabel}"], select[aria-label="${mapping.ariaLabel}"]`
        console.log(`  Trying aria-label selector: ${ariaSelector}`)
        const element = document.querySelector(ariaSelector) as HTMLInputElement
        if (element) {
          const value = this.getElementValue(element, mapping.inputType)
          console.log(`  ✅ Found value via aria-label:`, value)
          return value
        }
      }

      // Try data attribute selector (legacy)
      if (mapping.dataAttribute) {
        const element = document.querySelector(`[${mapping.dataAttribute}]`) as HTMLInputElement
        if (element) {
          const value = this.getElementValue(element, mapping.inputType)
          console.log(`  ✅ Found value via data-attribute:`, value)
          return value
        }
      }

      // Fallback: try to find by field name patterns
      console.log(`  🔄 Trying fallback patterns for: ${mapping.fieldName}`)
      const value = this.findFieldByName(mapping.fieldName, mapping.inputType)
      if (value !== null) {
        console.log(`  ✅ Found value via pattern matching:`, value)
        return value
      }

      console.log(`  ❌ No value found for field: ${mapping.fieldName}`)
      return null
    } catch (error) {
      console.error(`❌ Error extracting field ${mapping.fieldName}:`, error)
      return null
    }
  }

  private getElementValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, inputType: string): any {
    if (!element) return null

    switch (inputType) {
      case 'number':
        const numValue = parseFloat(element.value)
        return isNaN(numValue) ? null : numValue
      
      case 'select':
        return element.value || null
      
      case 'checkbox':
        return (element as HTMLInputElement).checked
      
      case 'radio':
        const checked = document.querySelector(`input[name="${element.getAttribute('name')}"]:checked`) as HTMLInputElement
        return checked ? checked.value : null
      
      default:
        return element.value?.trim() || null
    }
  }

  private findFieldByName(fieldName: string, inputType: string): any {
    const patterns = this.getFieldPatterns(fieldName)
    
    for (const pattern of patterns) {
      // Try different selectors including aria-label
      const selectors = [
        `input[aria-label*="${pattern}" i]`,
        `textarea[aria-label*="${pattern}" i]`,
        `select[aria-label*="${pattern}" i]`,
        `input[name*="${pattern}" i]`,
        `textarea[name*="${pattern}" i]`,
        `select[name*="${pattern}" i]`,
        `input[id*="${pattern}" i]`,
        `textarea[id*="${pattern}" i]`,
        `select[id*="${pattern}" i]`,
        `input[placeholder*="${pattern}" i]`,
        `textarea[placeholder*="${pattern}" i]`
      ]

      for (const selector of selectors) {
        console.log(`    Trying pattern selector: ${selector}`)
        const element = document.querySelector(selector) as HTMLInputElement
        if (element) {
          console.log(`    ✅ Found element with pattern: ${pattern}`)
          return this.getElementValue(element, inputType)
        }
      }
    }

    console.log(`    ❌ No element found with any pattern for: ${fieldName}`)
    return null
  }

  private getFieldPatterns(fieldName: string): string[] {
    const patterns: Record<string, string[]> = {
      name: ['Full Name', 'name', 'patient name', 'full', 'first', 'last'],
      age: ['Patient Age', 'age', 'years', 'old'],
      aadhaar: ['Hospital UID', 'Aadhaar Number', 'aadhaar', 'uid', 'hospital uid'],
      insuranceMemberID: ['Insurance Member ID', 'member id', 'insurance id'],
      insuranceCompany: ['Insurance Company Name', 'insurance company', 'company name'],
      nhsNumber: ['NHS Number', 'nhs', 'number', 'patient'],
      address: ['address', 'street', 'residence'],
      gpName: ['GP Name', 'gp', 'doctor', 'physician', 'practitioner'],
      mrn: ['Medical Record Number', 'mrn', 'medical', 'record', 'number'],
      ssn: ['Social Security Number', 'ssn', 'social', 'security'],
      insuranceProvider: ['Insurance Provider', 'insurance', 'provider', 'company'],
      patientID: ['Patient ID', 'Hospital Patient ID', 'hospital', 'patient', 'id'],
      healthInsuranceCard: ['Health Insurance Card', 'insurance', 'card', 'health'],
      prefectureCode: ['Prefecture', 'prefecture', 'code', '都道府県']
    }

    return patterns[fieldName] || [fieldName]
  }

  watchFormChanges(callback: (data: ExtractedData) => void): void {
    const debounce = (func: Function, wait: number) => {
      let timeout: NodeJS.Timeout
      return function executedFunction(...args: any[]) {
        const later = () => {
          clearTimeout(timeout)
          func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
      }
    }

    const debouncedCallback = debounce(() => {
      const result = this.extractFormData()
      if (result.success && result.data) {
        callback(result.data)
      }
    }, 500)

    // Watch for input changes
    document.addEventListener('input', debouncedCallback)
    document.addEventListener('change', debouncedCallback)
    
    // Watch for dynamic content changes
    const observer = new MutationObserver(debouncedCallback)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value']
    })

    // Store observer for cleanup
    ;(window as any).__formWatcher = observer
  }

  stopWatching(): void {
    const observer = (window as any).__formWatcher
    if (observer) {
      observer.disconnect()
      delete (window as any).__formWatcher
    }
  }

  async detectSubmission(): Promise<boolean> {
    return new Promise((resolve) => {
      // Watch for submit button clicks
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        '[data-submit-button="true"]',
        '.freebirdFormviewerViewNavigationSubmitButton',
        '[role="button"][aria-label*="Submit" i]',
        '[role="button"][aria-label*="Send" i]'
      ]

      const handleSubmit = (event: Event) => {
        event.preventDefault()
        resolve(true)
      }

      submitSelectors.forEach(selector => {
        const buttons = document.querySelectorAll(selector)
        buttons.forEach(button => {
          button.addEventListener('click', handleSubmit, { once: true })
        })
      })

      // Also watch for form submission events
      const forms = document.querySelectorAll('form')
      forms.forEach(form => {
        form.addEventListener('submit', handleSubmit, { once: true })
      })
    })
  }

  injectExtractionUI(): void {
    // Remove existing UI if present
    const existingUI = document.getElementById('his-extractor-ui')
    if (existingUI) {
      existingUI.remove()
    }

    // Create floating UI element
    const uiContainer = document.createElement('div')
    uiContainer.id = 'his-extractor-ui'
    uiContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
    `

    const header = document.createElement('div')
    header.style.cssText = `
      padding: 12px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      border-radius: 8px 8px 0 0;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `
    header.innerHTML = `
      <span>🏥 Patient Data Extraction</span>
      <button id="close-extractor" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
    `

    const content = document.createElement('div')
    content.style.cssText = 'padding: 16px;'
    content.innerHTML = `
      <div id="extraction-status" style="margin-bottom: 12px; padding: 8px; border-radius: 4px; background: #e3f2fd; color: #1565c0; transition: all 0.3s ease;">
        🏥 Ready to extract data...
      </div>
      <div id="extraction-actions" style="display: flex; gap: 8px; flex-direction: column;">
        <button id="extract-now" style="padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Extract Data Now
        </button>
        <button id="view-dashboard" style="padding: 8px 16px; background: #424242; color: white; border: none; border-radius: 4px; cursor: pointer;">
          View Dashboard
        </button>
      </div>
    `

    uiContainer.appendChild(header)
    uiContainer.appendChild(content)
    document.body.appendChild(uiContainer)

    // Add event listeners
    document.getElementById('close-extractor')?.addEventListener('click', () => {
      uiContainer.remove()
    })

    document.getElementById('extract-now')?.addEventListener('click', () => {
      this.handleExtractNow()
    })

    document.getElementById('view-dashboard')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openDashboard' })
    })
  }

  private async handleExtractNow(): Promise<void> {
    const statusEl = document.getElementById('extraction-status')
    if (!statusEl) return

    try {
      this.showNotification('Extracting data...', 'loading')

      const result = this.extractFormData()
      
      if (result.success && result.data) {
        // Send to background script for processing
        chrome.runtime.sendMessage({
          action: 'extractedData',
          data: result.data,
          formFormat: result.formFormat
        })

        this.showNotification('Data extracted successfully!', 'success')
        
        // Listen for save confirmation from background script
        this.waitForSaveConfirmation()
      } else {
        throw new Error(result.error || 'Extraction failed')
      }
    } catch (error) {
      this.showNotification(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'loading' | 'info'): void {
    const statusEl = document.getElementById('extraction-status')
    if (!statusEl) return

    // Set message and styling based on type
    statusEl.textContent = message
    
    const styles = {
      success: { background: '#d4edda', color: '#155724', icon: '✅' },
      error: { background: '#f8d7da', color: '#721c24', icon: '❌' },
      loading: { background: '#fff3cd', color: '#856404', icon: '⏳' },
      info: { background: '#e3f2fd', color: '#1565c0', icon: 'ℹ️' }
    }

    const style = styles[type]
    statusEl.style.background = style.background
    statusEl.style.color = style.color
    statusEl.style.transition = 'all 0.3s ease'
    
    // Add icon to message
    statusEl.innerHTML = `${style.icon} ${message}`

    // Auto-hide success and error messages after 3 seconds
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        this.resetToReadyState()
      }, 3000)
    }
  }

  private resetToReadyState(): void {
    const statusEl = document.getElementById('extraction-status')
    if (!statusEl) return

    statusEl.innerHTML = '🏥 Ready to extract data...'
    statusEl.style.background = '#e3f2fd'
    statusEl.style.color = '#1565c0'
    statusEl.style.transition = 'all 0.3s ease'
  }

  private waitForSaveConfirmation(): void {
    // Listen for messages from background script about save status
    const messageListener = (message: any, sender: any, sendResponse: any) => {
      if (message.action === 'extractionSaved') {
        this.showNotification('Data saved successfully!', 'success')
        chrome.runtime.onMessage.removeListener(messageListener)
      } else if (message.action === 'extractionSaveFailed') {
        this.showNotification(`Save failed: ${message.error}`, 'error')
        chrome.runtime.onMessage.removeListener(messageListener)
      } else if (message.action === 'duplicatesFound') {
        this.showDuplicateConfirmation(message.analysis, message.extractedData, message.formFormat)
        chrome.runtime.onMessage.removeListener(messageListener)
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    // Fallback timeout in case we don't get a response
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }, 10000) // 10-second timeout
  }

  private showDuplicateConfirmation(analysis: any, extractedData: any, formFormat: any): void {
    this.showNotification('⚠️ Duplicate data detected', 'info')

    // Create duplicate confirmation dialog
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
          <p>We found ${analysis.duplicatePatients?.length || 0} similar patient record(s) in the database:</p>
          
          <div style="margin: 16px 0; padding: 12px; background: #f8f9fa; border-radius: 4px;">
            ${(analysis.duplicatePatients || []).map((patient: any) => `
              <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px;">
                <strong>${patient.name || 'Unknown'}</strong> (Age: ${patient.age || 'N/A'}, Country: ${patient.country || 'N/A'})
                <br><small>Added: ${patient.extractedAt ? new Date(patient.extractedAt).toLocaleDateString() : 'Unknown'}</small>
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

    // Handle user choice
    document.getElementById('save-anyway')?.addEventListener('click', () => {
      document.getElementById('his-duplicate-dialog')?.remove()
      
      // Send confirmation to background script
      chrome.runtime.sendMessage({
        action: 'confirmSaveDuplicate',
        extractedData: extractedData,
        formFormat: formFormat
      })
      
      this.showNotification('Saving data...', 'loading')
      this.waitForSaveConfirmation()
    })

    document.getElementById('cancel-save')?.addEventListener('click', () => {
      document.getElementById('his-duplicate-dialog')?.remove()
      this.showNotification('Save cancelled', 'info')
      
      // Reset to ready state after 2 seconds
      setTimeout(() => {
        this.resetToReadyState()
      }, 2000)
    })
  }
}