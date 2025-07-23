import { useState, useEffect } from "react"
import { Plus, Trash2, Save, Eye, Copy } from "lucide-react"
import { apiClient } from "@/utils/api"
import type { CountryTemplate, FormFormat, FieldMapping } from "@/types"

interface FormBuilderProps {
  onFormCreated: () => Promise<void>
}

export default function FormBuilder({ onFormCreated }: FormBuilderProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [formName, setFormName] = useState('')
  const [description, setDescription] = useState('')
  const [googleFormUrl, setGoogleFormUrl] = useState('')
  const [countryTemplates, setCountryTemplates] = useState<CountryTemplate[]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [generatedHTML, setGeneratedHTML] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    loadCountryTemplates()
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      loadCountryTemplate(selectedCountry)
    }
  }, [selectedCountry])

  const loadCountryTemplates = async () => {
    try {
      const response = await apiClient.getCountryTemplates()
      if (response.success && response.data) {
        setCountryTemplates(response.data)
      }
    } catch (error) {
      console.error('Failed to load country templates:', error)
    }
  }

  const loadCountryTemplate = async (country: string) => {
    try {
      setLoading(true)
      const response = await apiClient.getCountryTemplate(country)
      
      if (response.success && response.data) {
        const template = response.data
        
        // Convert template fields to field mappings
        const mappings: FieldMapping[] = template.fields.map(field => ({
          fieldName: field.name,
          googleFormSelector: `[${field.dataAttribute}]`,
          dataAttribute: field.dataAttribute,
          inputType: field.type as 'text' | 'number' | 'select' | 'textarea',
          isRequired: field.required,
          validationPattern: field.pattern,
          placeholder: field.placeholder
        }))
        
        setFieldMappings(mappings)
        generateHTML()
      }
    } catch (error) {
      console.error('Failed to load country template:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateHTML = async () => {
    if (!selectedCountry || !formName) return

    try {
      const response = await apiClient.generateFormTemplate({
        country: selectedCountry,
        formName: formName
      })

      if (response.success && response.data) {
        setGeneratedHTML(response.data.formTemplate)
      }
    } catch (error) {
      console.error('Failed to generate HTML:', error)
    }
  }

  const addCustomField = () => {
    const newField: FieldMapping = {
      fieldName: '',
      googleFormSelector: '',
      dataAttribute: '',
      inputType: 'text',
      isRequired: false,
      validationPattern: '',
      placeholder: ''
    }
    setFieldMappings([...fieldMappings, newField])
  }

  const updateFieldMapping = (index: number, field: string, value: any) => {
    const updated = [...fieldMappings]
    ;(updated[index] as any)[field] = value
    setFieldMappings(updated)
    
    // Regenerate HTML when fields change
    if (selectedCountry && formName) {
      generateHTML()
    }
  }

  const removeFieldMapping = (index: number) => {
    const updated = fieldMappings.filter((_, i) => i !== index)
    setFieldMappings(updated)
    
    if (selectedCountry && formName) {
      generateHTML()
    }
  }

  const saveFormFormat = async () => {
    if (!selectedCountry || !formName || fieldMappings.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      
      const formatData: Partial<FormFormat> = {
        country: selectedCountry as 'UK' | 'US' | 'India' | 'Japan',
        formName,
        description,
        googleFormUrl: googleFormUrl || undefined,
        isActive: true,
        fieldMappings,
        formTemplate: {
          title: formName,
          description,
          fields: fieldMappings.map(mapping => ({
            label: mapping.fieldName.charAt(0).toUpperCase() + mapping.fieldName.slice(1),
            type: mapping.inputType,
            required: mapping.isRequired,
            dataAttribute: mapping.dataAttribute || `data-${mapping.fieldName}`,
            placeholder: mapping.placeholder
          }))
        }
      }

      const response = await apiClient.createFormFormat(formatData)
      
      if (response.success) {
        alert('Form format created successfully!')
        await onFormCreated()
        
        // Reset form
        setFormName('')
        setDescription('')
        setGoogleFormUrl('')
        setFieldMappings([])
        setGeneratedHTML('')
      } else {
        alert('Failed to create form format: ' + response.error)
      }
    } catch (error) {
      console.error('Error saving form format:', error)
      alert('Failed to save form format')
    } finally {
      setSaving(false)
    }
  }

  const copyHTMLToClipboard = () => {
    navigator.clipboard.writeText(generatedHTML)
    alert('HTML copied to clipboard!')
  }

  const getCountryFlag = (country: string): string => {
    const flags = {
      UK: '🇬🇧',
      US: '🇺🇸',
      India: '🇮🇳',
      Japan: '🇯🇵'
    }
    return flags[country as keyof typeof flags] || '🌍'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Form Builder</h2>
        <div className="flex space-x-2">
          {generatedHTML && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <Eye size={14} />
              <span>{showPreview ? 'Hide' : 'Preview'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country *
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="">Select a country</option>
            {countryTemplates.map(template => (
              <option key={template.country} value={template.country}>
                {getCountryFlag(template.country)} {template.countryName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Form Name *
          </label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            onBlur={generateHTML}
            placeholder="e.g., NHS Patient Registration"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for this form format"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Google Form URL
          </label>
          <input
            type="url"
            value={googleFormUrl}
            onChange={(e) => setGoogleFormUrl(e.target.value)}
            placeholder="https://docs.google.com/forms/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Field Mappings */}
      {selectedCountry && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium text-gray-900">
              Field Mappings ({fieldMappings.length})
            </h3>
            <button
              onClick={addCustomField}
              className="flex items-center space-x-1 px-2 py-1 text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus size={14} />
              <span>Add Field</span>
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mx-auto mb-2"></div>
                <p className="text-xs text-gray-600">Loading template...</p>
              </div>
            ) : (
              fieldMappings.map((mapping, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={mapping.fieldName}
                      onChange={(e) => updateFieldMapping(index, 'fieldName', e.target.value)}
                      placeholder="Field name"
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <select
                      value={mapping.inputType}
                      onChange={(e) => updateFieldMapping(index, 'inputType', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Select</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={mapping.dataAttribute || ''}
                      onChange={(e) => updateFieldMapping(index, 'dataAttribute', e.target.value)}
                      placeholder="data-attribute"
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <input
                      type="text"
                      value={mapping.placeholder || ''}
                      onChange={(e) => updateFieldMapping(index, 'placeholder', e.target.value)}
                      placeholder="Placeholder text"
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-1 text-xs">
                      <input
                        type="checkbox"
                        checked={mapping.isRequired}
                        onChange={(e) => updateFieldMapping(index, 'isRequired', e.target.checked)}
                        className="rounded"
                      />
                      <span>Required</span>
                    </label>
                    
                    <button
                      onClick={() => removeFieldMapping(index)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Remove field"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Generated HTML Preview */}
      {showPreview && generatedHTML && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium text-gray-900">Generated HTML</h3>
            <button
              onClick={copyHTMLToClipboard}
              className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <Copy size={14} />
              <span>Copy</span>
            </button>
          </div>
          <textarea
            value={generatedHTML}
            readOnly
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs bg-gray-50"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2 pt-2">
        <button
          onClick={saveFormFormat}
          disabled={saving || !selectedCountry || !formName || fieldMappings.length === 0}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <>
              <Save size={14} />
              <span>Save Format</span>
            </>
          )}
        </button>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
        <p className="mb-1"><strong>Instructions:</strong></p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Select a country to load the standard template</li>
          <li>Customize the form name and description</li>
          <li>Modify field mappings as needed or add custom fields</li>
          <li>Use the generated HTML in your Google Forms</li>
          <li>Save the format to enable automatic extraction</li>
        </ol>
      </div>
    </div>
  )
}