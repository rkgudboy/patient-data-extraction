import { apiClient } from "@/utils/api"

// Background script for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('🏥 Patient Data Extraction extension installed')
})

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    console.log('📨 Background received message:', message)

    switch (message.action) {
      case 'formDataChanged':
        handleFormDataChanged(message.data)
        break

      case 'extractedData':
        handleExtractedData(message.data, message.formFormat)
        break

      case 'openDashboard':
        handleOpenDashboard()
        break

      case 'confirmSaveDuplicate':
        handleConfirmSaveDuplicate(message.extractedData, message.formFormat)
        break

      case 'getStoredData':
        handleGetStoredData(sendResponse)
        return true // Keep message channel open for async response

      case 'healthCheck':
        handleHealthCheck(sendResponse)
        return true

      default:
        console.warn('⚠️ Unknown message action:', message.action)
    }

    return false
  }
)

// Handle tab updates - content script is automatically injected by Plasmo via manifest
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('docs.google.com/forms')) {
    console.log('📋 Google Forms tab detected:', tab.url)
    // Content script will be automatically injected by Plasmo based on manifest configuration
  }
})

// Handle form data changes from content script
async function handleFormDataChanged(data: any): Promise<void> {
  try {
    console.log('📊 Form data changed:', data)
    
    // Store in local storage for popup access
    await chrome.storage.local.set({
      lastExtractedData: {
        data,
        timestamp: Date.now(),
        url: await getCurrentTabUrl()
      }
    })

    // Optionally perform real-time duplicate checking
    if (data.name && data.age && data.country) {
      try {
        const response = await apiClient.findMatches(data)
        if (response.success && response.data) {
          const hasMatches = response.data.exactMatches.length > 0 || 
                            response.data.partialMatches.length > 0

          if (hasMatches) {
            // Send notification to content script about potential duplicates
            const tabs = await chrome.tabs.query({
              active: true,
              currentWindow: true,
              url: '*://docs.google.com/forms/*'
            })

            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'potentialDuplicates',
                matches: response.data
              })
            }
          }
        }
      } catch (error) {
        console.error('❌ Error checking for duplicates:', error)
      }
    }
  } catch (error) {
    console.error('❌ Error handling form data change:', error)
  }
}

// Handle extracted data from content script
async function handleExtractedData(data: any, formFormat: any): Promise<void> {
  try {
    console.log('📊 Data extracted:', data)
    
    // Store extraction result
    await chrome.storage.local.set({
      latestExtraction: {
        data,
        formFormat,
        timestamp: Date.now(),
        url: await getCurrentTabUrl()
      }
    })

    // Analyze for duplicates
    const analysisResponse = await apiClient.analyzeExtraction({
      googleFormUrl: await getCurrentTabUrl(),
      extractedData: data,
      country: data.country
    })

    if (analysisResponse.success) {
      console.log('🔍 Duplicate analysis:', analysisResponse.data)
      
      // Store analysis result
      await chrome.storage.local.set({
        latestAnalysis: {
          analysis: analysisResponse.data,
          timestamp: Date.now()
        }
      })

      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
        url: '*://docs.google.com/forms/*'
      })

      // Check if duplicates were found
      if (analysisResponse.data?.isDuplicate && analysisResponse.data?.duplicatePatients?.length > 0) {
        console.log('⚠️ Duplicates found, waiting for user confirmation')
        
        // Send analysis result to content script for user confirmation
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'duplicatesFound',
            analysis: analysisResponse.data,
            extractedData: data,
            formFormat: formFormat
          })
        }
        
        // Don't save automatically - wait for user confirmation
        return
      }

      // No duplicates found, proceed with saving
      await this.saveExtractedDataToBackend(data, formFormat, tabs[0]?.id)
    } else {
      // Analysis failed, still try to save the data
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
        url: '*://docs.google.com/forms/*'
      })
      
      await this.saveExtractedDataToBackend(data, formFormat, tabs[0]?.id)
    }
  } catch (error) {
    console.error('❌ Error handling extracted data:', error)
  }
}

// Handle opening dashboard tab
function handleOpenDashboard(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL('tabs/dashboard.html') })
}

// Handle getting stored data for popup
async function handleGetStoredData(sendResponse: (response: any) => void): Promise<void> {
  try {
    const result = await chrome.storage.local.get([
      'lastExtractedData',
      'latestExtraction',
      'latestAnalysis'
    ])

    sendResponse({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('❌ Error getting stored data:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Handle health check
async function handleHealthCheck(sendResponse: (response: any) => void): Promise<void> {
  try {
    const response = await apiClient.healthCheck()
    sendResponse(response)
  } catch (error) {
    console.error('❌ Health check failed:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'API unavailable'
    })
  }
}

// Utility function to get current tab URL
async function getCurrentTabUrl(): Promise<string> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    return tabs[0]?.url || ''
  } catch (error) {
    console.error('❌ Error getting current tab URL:', error)
    return ''
  }
}

// Periodic cleanup of stored data
setInterval(async () => {
  try {
    const result = await chrome.storage.local.get()
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago

    const keysToRemove: string[] = []

    Object.entries(result).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && 'timestamp' in value) {
        if ((value as any).timestamp < cutoffTime) {
          keysToRemove.push(key)
        }
      }
    })

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove)
      console.log('🧹 Cleaned up old stored data:', keysToRemove)
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}, 60 * 60 * 1000) // Run every hour

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Patient Data Extraction extension started')
})

// Helper function to save extracted data to backend
async function saveExtractedDataToBackend(data: any, formFormat: any, tabId?: number): Promise<void> {
  try {
    const saveResponse = await apiClient.saveExtractedData({
      extractedData: data,
      formFormatId: formFormat?.id,
      googleFormUrl: await getCurrentTabUrl()
    })

    if (tabId) {
      if (saveResponse.success) {
        // Send success message to content script
        chrome.tabs.sendMessage(tabId, {
          action: 'extractionSaved',
          patient: saveResponse.data
        })
      } else {
        // Send error message to content script
        chrome.tabs.sendMessage(tabId, {
          action: 'extractionSaveFailed',
          error: saveResponse.error || 'Failed to save data'
        })
      }
    }
  } catch (error) {
    console.error('❌ Error saving extracted data:', error)
    
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: 'extractionSaveFailed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

// Handle user confirmation to save duplicate data
async function handleConfirmSaveDuplicate(extractedData: any, formFormat: any): Promise<void> {
  console.log('✅ User confirmed saving duplicate data')
  
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
    url: '*://docs.google.com/forms/*'
  })
  
  await saveExtractedDataToBackend(extractedData, formFormat, tabs[0]?.id)
}

// Handle browser action click - directly open dashboard tab
chrome.action.onClicked.addListener((tab) => {
  console.log('🖱️ Extension icon clicked, opening dashboard tab')
  chrome.tabs.create({ url: chrome.runtime.getURL('tabs/dashboard.html') })
})

export {}