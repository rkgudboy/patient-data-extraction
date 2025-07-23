import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import type { 
  ApiResponse, 
  Patient, 
  FormFormat, 
  DuplicateAnalysis, 
  CountryTemplate,
  ExtractedData 
} from '@/types'

const API_BASE_URL = 'http://localhost:3000/api'

class ApiClient {
  private client: AxiosInstance

  constructor(baseUrl: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] Request to: ${config.baseURL}${config.url}`)
        return config
      },
      (error) => {
        console.error('[API] Request error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`[API] Success response:`, response.data)
        return response
      },
      (error: AxiosError) => {
        console.error(`[API] Response error:`, error.response?.data || error.message)
        
        // Transform Axios error to our ApiResponse format
        const apiError: ApiResponse<any> = {
          success: false,
          error: error.response?.data?.error || error.message || 'Unknown error occurred'
        }
        
        return Promise.resolve({ data: apiError } as AxiosResponse)
      }
    )
  }

  // Patient endpoints
  async getPatients(params?: {
    country?: string
    limit?: number
    offset?: number
    search?: string
    status?: string
  }): Promise<ApiResponse<Patient[]>> {
    const response = await this.client.get<ApiResponse<Patient[]>>('/patients', { params })
    return response.data
  }

  async createPatient(patient: Partial<Patient>): Promise<ApiResponse<Patient>> {
    const response = await this.client.post<ApiResponse<Patient>>('/patients', patient)
    return response.data
  }

  async getPatient(id: string): Promise<ApiResponse<Patient>> {
    const response = await this.client.get<ApiResponse<Patient>>(`/patients/${id}`)
    return response.data
  }

  async updatePatient(id: string, patient: Partial<Patient>): Promise<ApiResponse<Patient>> {
    const response = await this.client.put<ApiResponse<Patient>>(`/patients/${id}`, patient)
    return response.data
  }

  async deletePatient(id: string): Promise<ApiResponse> {
    const response = await this.client.delete<ApiResponse>(`/patients/${id}`)
    return response.data
  }

  // Form Format endpoints
  async getFormFormats(params?: {
    country?: string
    active?: boolean
    url?: string
  }): Promise<ApiResponse<FormFormat[]>> {
    const response = await this.client.get<ApiResponse<FormFormat[]>>('/form-formats', { params })
    return response.data
  }

  async createFormFormat(format: Partial<FormFormat>): Promise<ApiResponse<FormFormat>> {
    const response = await this.client.post<ApiResponse<FormFormat>>('/form-formats', format)
    return response.data
  }

  async updateFormFormat(id: string, format: Partial<FormFormat>): Promise<ApiResponse<FormFormat>> {
    const response = await this.client.put<ApiResponse<FormFormat>>(`/form-formats/${id}`, format)
    return response.data
  }

  async deleteFormFormat(id: string): Promise<ApiResponse> {
    const response = await this.client.delete<ApiResponse>(`/form-formats/${id}`)
    return response.data
  }

  async toggleFormFormat(id: string): Promise<ApiResponse<FormFormat>> {
    const response = await this.client.post<ApiResponse<FormFormat>>(`/form-formats/${id}/toggle`)
    return response.data
  }

  async getFormFormatsByCountry(country: string): Promise<ApiResponse<FormFormat[]>> {
    const response = await this.client.get<ApiResponse<FormFormat[]>>(`/form-formats/country/${country}`)
    return response.data
  }

  // Extraction endpoints
  async analyzeExtraction(data: {
    googleFormUrl?: string
    extractedData: ExtractedData
    country: string
  }): Promise<ApiResponse<DuplicateAnalysis>> {
    const response = await this.client.post<ApiResponse<DuplicateAnalysis>>('/extract/analyze', data)
    return response.data
  }

  async saveExtractedData(data: {
    extractedData: ExtractedData
    formFormatId?: string
    googleFormUrl?: string
  }): Promise<ApiResponse<Patient>> {
    const response = await this.client.post<ApiResponse<Patient>>('/extract/save', data)
    return response.data
  }

  async findMatches(searchData: Partial<Patient>): Promise<ApiResponse<{
    exactMatches: Patient[]
    partialMatches: Array<{ patient: Patient; matchScore: number }>
  }>> {
    const response = await this.client.post<ApiResponse<{
      exactMatches: Patient[]
      partialMatches: Array<{ patient: Patient; matchScore: number }>
    }>>('/extract/match', searchData)
    return response.data
  }

  async validateExtraction(data: {
    extractedData: ExtractedData
    formFormatId: string
  }): Promise<ApiResponse<{
    isValid: boolean
    validationErrors: string[]
    missingFields: string[]
    formFormat: { country: string; formName: string }
  }>> {
    const response = await this.client.post<ApiResponse<{
      isValid: boolean
      validationErrors: string[]
      missingFields: string[]
      formFormat: { country: string; formName: string }
    }>>('/extract/validate', data)
    return response.data
  }

  // Template endpoints
  async getCountryTemplates(): Promise<ApiResponse<CountryTemplate[]>> {
    const response = await this.client.get<ApiResponse<CountryTemplate[]>>('/templates/countries')
    return response.data
  }

  async getCountryTemplate(country: string): Promise<ApiResponse<CountryTemplate>> {
    const response = await this.client.get<ApiResponse<CountryTemplate>>(`/templates/countries/${country}`)
    return response.data
  }

  async generateFormTemplate(data: {
    country: string
    formName: string
    customFields?: any[]
  }): Promise<ApiResponse<{
    formTemplate: string
    fieldMappings: any[]
    country: string
    formName: string
    fields: any[]
  }>> {
    const response = await this.client.post<ApiResponse<{
      formTemplate: string
      fieldMappings: any[]
      country: string
      formName: string
      fields: any[]
    }>>('/templates/generate', data)
    return response.data
  }

  async validateTemplate(data: {
    formTemplate: string
    country: string
  }): Promise<ApiResponse<{
    isValid: boolean
    validationResults: any
    suggestions: string[]
  }>> {
    const response = await this.client.post<ApiResponse<{
      isValid: boolean
      validationResults: any
      suggestions: string[]
    }>>('/templates/validate', data)
    return response.data
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await axios.get<ApiResponse>(`${this.client.defaults.baseURL?.replace('/api', '')}/health`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      return response.data
    } catch (error) {
      console.error(`[API] Health check failed:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      } as ApiResponse
    }
  }
}

export const apiClient = new ApiClient()

// Storage utilities for Chrome extension
export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key)
      return result[key] || null
    } catch (error) {
      console.error('Storage get error:', error)
      return null
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value })
    } catch (error) {
      console.error('Storage set error:', error)
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key)
    } catch (error) {
      console.error('Storage remove error:', error)
    }
  },

  async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear()
    } catch (error) {
      console.error('Storage clear error:', error)
    }
  }
}