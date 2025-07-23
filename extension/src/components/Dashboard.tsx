import { useState, useEffect } from "react"
import { Search, Filter, RefreshCw, User, Calendar, MapPin, Eye, Trash2 } from "lucide-react"
import { apiClient } from "@/utils/api"
import type { Patient } from "@/types"

interface DashboardProps {
  patients: Patient[]
  onRefresh: () => Promise<void>
  loading: boolean
}

export default function Dashboard({ patients, onRefresh, loading }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    filterPatients()
  }, [patients, searchTerm, selectedCountry, selectedStatus])

  const filterPatients = () => {
    let filtered = patients

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(patient =>
        patient.name.toLowerCase().includes(term) ||
        Object.values(patient.countryData).some(value =>
          value?.toString().toLowerCase().includes(term)
        )
      )
    }

    // Country filter
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(patient => patient.country === selectedCountry)
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(patient => patient.status === selectedStatus)
    }

    setFilteredPatients(filtered)
  }

  const handleDeletePatient = async (patientId: string) => {
    if (!confirm('Are you sure you want to delete this patient record?')) {
      return
    }

    try {
      setDeleting(patientId)
      const response = await apiClient.deletePatient(patientId)
      
      if (response.success) {
        await onRefresh()
        if (selectedPatient?._id === patientId) {
          setSelectedPatient(null)
        }
      } else {
        alert('Failed to delete patient: ' + response.error)
      }
    } catch (error) {
      console.error('Error deleting patient:', error)
      alert('Failed to delete patient')
    } finally {
      setDeleting(null)
    }
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

  const getStatusColor = (status: string): string => {
    const colors = {
      extracted: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      duplicate: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const PatientCard = ({ patient }: { patient: Patient }) => (
    <div
      key={patient._id}
      className="p-3 border border-gray-200 rounded-lg hover:border-primary-300 cursor-pointer transition-colors"
      onClick={() => setSelectedPatient(patient)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <User size={14} className="text-gray-500" />
            <h3 className="font-medium text-gray-900 text-sm">{patient.name}</h3>
            <span className="text-lg">{getCountryFlag(patient.country)}</span>
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-600 mb-2">
            <div className="flex items-center space-x-1">
              <Calendar size={12} />
              <span>Age: {patient.age}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MapPin size={12} />
              <span>{patient.country}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
              {patient.status}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(patient.extractedAt)}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedPatient(patient)
            }}
            className="p-1 text-gray-400 hover:text-primary-600"
            title="View details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeletePatient(patient._id!)
            }}
            disabled={deleting === patient._id}
            className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
            title="Delete patient"
          >
            {deleting === patient._id ? (
              <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  )

  const PatientDetail = ({ patient }: { patient: Patient }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Patient Details</h2>
            <button
              onClick={() => setSelectedPatient(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">{patient.name}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Age:</span>
                <span className="ml-2">{patient.age}</span>
              </div>
              <div>
                <span className="text-gray-500">Country:</span>
                <span className="ml-2">{getCountryFlag(patient.country)} {patient.country}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(patient.status)}`}>
                  {patient.status}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Extracted:</span>
                <span className="ml-2">{formatDate(patient.extractedAt)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Country-specific Data</h4>
            <div className="space-y-2 text-sm">
              {Object.entries(patient.countryData).map(([key, value]) => (
                value && (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                    </span>
                    <span className="font-medium">{value}</span>
                  </div>
                )
              ))}
            </div>
          </div>
          
          {patient.googleFormUrl && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Source</h4>
              <a
                href={patient.googleFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 text-sm underline"
              >
                View Original Form
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>
        
        <div className="flex space-x-2">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="all">All Countries</option>
            <option value="UK">🇬🇧 UK</option>
            <option value="US">🇺🇸 US</option>
            <option value="India">🇮🇳 India</option>
            <option value="Japan">🇯🇵 Japan</option>
          </select>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="all">All Status</option>
            <option value="extracted">Extracted</option>
            <option value="verified">Verified</option>
            <option value="duplicate">Duplicate</option>
          </select>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Patients ({filteredPatients.length})
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

      {/* Patient List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading patients...</p>
          </div>
        ) : filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <PatientCard key={patient._id} patient={patient} />
          ))
        ) : (
          <div className="text-center py-8">
            <User size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {searchTerm || selectedCountry !== 'all' || selectedStatus !== 'all'
                ? 'No patients match your filters'
                : 'No patients found'}
            </p>
          </div>
        )}
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && <PatientDetail patient={selectedPatient} />}
    </div>
  )
}