import { useState } from "react"
import { RefreshCw, FileText, ToggleLeft, Eye, Trash2, Plus } from "lucide-react"
import { apiClient } from "@/utils/api"
import type { FormFormat } from "@/types"

interface FormFormatsProps {
  formFormats: FormFormat[]
  onRefresh: () => Promise<void>
  loading: boolean
}

export default function FormFormats({ formFormats, onRefresh, loading }: FormFormatsProps) {
  const [selectedFormat, setSelectedFormat] = useState<FormFormat | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const getCountryFlag = (country: string): string => {
    const flags = {
      UK: '🇬🇧',
      US: '🇺🇸',
      India: '🇮🇳',
      Japan: '🇯🇵'
    }
    return flags[country as keyof typeof flags] || '🌍'
  }

  const handleToggleActive = async (formatId: string) => {
    try {
      setToggling(formatId)
      const response = await apiClient.toggleFormFormat(formatId)
      
      if (response.success) {
        await onRefresh()
      } else {
        alert('Failed to toggle format: ' + response.error)
      }
    } catch (error) {
      console.error('Error toggling format:', error)
      alert('Failed to toggle format')
    } finally {
      setToggling(null)
    }
  }

  const handleDeleteFormat = async (formatId: string) => {
    if (!confirm('Are you sure you want to delete this form format?')) {
      return
    }

    try {
      setDeleting(formatId)
      const response = await apiClient.deleteFormFormat(formatId)
      
      if (response.success) {
        await onRefresh()
        if (selectedFormat?._id === formatId) {
          setSelectedFormat(null)
        }
      } else {
        alert('Failed to delete format: ' + response.error)
      }
    } catch (error) {
      console.error('Error deleting format:', error)
      alert('Failed to delete format')
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const FormatCard = ({ format }: { format: FormFormat }) => (
    <div
      key={format._id}
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        format.isActive
          ? 'border-green-200 bg-green-50 hover:border-green-300'
          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
      }`}
      onClick={() => setSelectedFormat(format)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <FileText size={14} className="text-gray-500" />
            <h3 className="font-medium text-gray-900 text-sm">{format.formName}</h3>
            <span className="text-lg">{getCountryFlag(format.country)}</span>
          </div>
          
          {format.description && (
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {format.description}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                format.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {format.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-gray-500">
                {format.fieldMappings.length} fields
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {formatDate(format.updatedAt)}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedFormat(format)
            }}
            className="p-1 text-gray-400 hover:text-primary-600"
            title="View details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleActive(format._id!)
            }}
            disabled={toggling === format._id}
            className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
            title={format.isActive ? 'Deactivate' : 'Activate'}
          >
            {toggling === format._id ? (
              <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full" />
            ) : (
              <ToggleLeft size={14} />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteFormat(format._id!)
            }}
            disabled={deleting === format._id}
            className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
            title="Delete format"
          >
            {deleting === format._id ? (
              <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  )

  const FormatDetail = ({ format }: { format: FormFormat }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Form Format Details</h2>
            <button
              onClick={() => setSelectedFormat(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              {getCountryFlag(format.country)} {format.formName}
            </h3>
            {format.description && (
              <p className="text-sm text-gray-600 mb-2">{format.description}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Country:</span>
                <span className="ml-2">{format.country}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  format.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {format.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2">{formatDate(format.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">Updated:</span>
                <span className="ml-2">{formatDate(format.updatedAt)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Field Mappings ({format.fieldMappings.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {format.fieldMappings.map((mapping, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded border text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{mapping.fieldName}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      mapping.isRequired
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {mapping.isRequired ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    <div>Selector: <code className="text-xs bg-gray-200 px-1 rounded">{mapping.googleFormSelector}</code></div>
                    <div>Type: {mapping.inputType}</div>
                    {mapping.dataAttribute && (
                      <div>Data Attribute: <code className="text-xs bg-gray-200 px-1 rounded">{mapping.dataAttribute}</code></div>
                    )}
                    {mapping.validationPattern && (
                      <div>Pattern: <code className="text-xs bg-gray-200 px-1 rounded">{mapping.validationPattern}</code></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {format.googleFormUrl && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Google Form URL</h4>
              <a
                href={format.googleFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 text-sm underline break-all"
              >
                {format.googleFormUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Form Formats ({formFormats.length})
        </h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-1 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 bg-green-50 border border-green-200 rounded">
          <div className="text-green-800 font-medium">Active Formats</div>
          <div className="text-green-600">
            {formFormats.filter(f => f.isActive).length}
          </div>
        </div>
        <div className="p-2 bg-gray-50 border border-gray-200 rounded">
          <div className="text-gray-800 font-medium">Total Formats</div>
          <div className="text-gray-600">{formFormats.length}</div>
        </div>
      </div>

      {/* Format List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading form formats...</p>
          </div>
        ) : formFormats.length > 0 ? (
          formFormats.map((format) => (
            <FormatCard key={format._id} format={format} />
          ))
        ) : (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-3">No form formats found</p>
            <p className="text-xs text-gray-500">
              Create a new format using the Form Builder
            </p>
          </div>
        )}
      </div>

      {/* Format Detail Modal */}
      {selectedFormat && <FormatDetail format={selectedFormat} />}
    </div>
  )
}