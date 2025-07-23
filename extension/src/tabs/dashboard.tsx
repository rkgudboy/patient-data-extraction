import { useState, useEffect } from "react"
import { 
  Database, 
  RefreshCw, 
  Search, 
  FileText, 
  Calendar,
  User,
  Activity,
  Download,
  Filter,
  ChevronDown,
  ExternalLink
} from "lucide-react"
import { apiClient } from "@/utils/api"
import type { Patient, FormFormat } from "@/types"

import "@/styles/globals.css"

function DashboardTab() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [formFormats, setFormFormats] = useState<FormFormat[]>([])
  const [loading, setLoading] = useState(true)
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<string>("")
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayExtractions: 0,
    activeFormats: 0,
    countries: [] as string[]
  })

  useEffect(() => {
    initializeDashboard()
  }, [])

  const initializeDashboard = async () => {
    try {
      setLoading(true)
      await checkApiStatus()
      await Promise.all([
        loadPatients(),
        loadFormFormats(),
        loadStats()
      ])
    } catch (error) {
      console.error('Failed to initialize dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkApiStatus = async () => {
    setApiStatus('checking')
    try {
      const response = await apiClient.healthCheck()
      setApiStatus(response.success ? 'connected' : 'disconnected')
    } catch (error) {
      setApiStatus('disconnected')
      console.error('API health check failed:', error)
    }
  }

  const loadPatients = async () => {
    try {
      const response = await apiClient.getPatients({ limit: 100 })
      if (response.success && response.data) {
        setPatients(response.data)
      }
    } catch (error) {
      console.error('Failed to load patients:', error)
    }
  }

  const loadFormFormats = async () => {
    try {
      const response = await apiClient.getFormFormats()
      if (response.success && response.data) {
        setFormFormats(response.data)
      }
    } catch (error) {
      console.error('Failed to load form formats:', error)
    }
  }

  const loadStats = async () => {
    // Calculate stats from loaded data
    const countries = [...new Set(patients.map(p => p.country))].filter(Boolean)
    const today = new Date().toDateString()
    const todayCount = patients.filter(p => 
      new Date(p.createdAt!).toDateString() === today
    ).length

    setStats({
      totalPatients: patients.length,
      todayExtractions: todayCount,
      activeFormats: formFormats.filter(f => f.isActive).length,
      countries
    })
  }

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = searchTerm === "" || 
      patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.visitNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCountry = selectedCountry === "" || patient.country === selectedCountry

    return matchesSearch && matchesCountry
  })

  const exportData = () => {
    const data = filteredPatients.map(p => ({
      Name: p.name,
      MRN: p.mrn,
      'Visit Number': p.visitNumber,
      DOB: p.dob,
      Country: p.country,
      'Form Name': p.formName,
      'Created At': new Date(p.createdAt!).toLocaleString()
    }))

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `patients-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                🏥 HIS Data Extractor Dashboard
              </h1>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                apiStatus === 'connected'
                  ? 'bg-green-100 text-green-700'
                  : apiStatus === 'disconnected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  apiStatus === 'connected' ? 'bg-green-500' :
                  apiStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <span>
                  {apiStatus === 'connected' ? 'Connected' :
                   apiStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}
                </span>
              </div>
            </div>
            <button
              onClick={initializeDashboard}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
              </div>
              <User className="text-primary-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Extractions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayExtractions}</p>
              </div>
              <Calendar className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Formats</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeFormats}</p>
              </div>
              <FileText className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Countries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.countries.length}</p>
              </div>
              <Activity className="text-purple-500" size={32} />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search patients by name, MRN, or visit number..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="relative">
                  <select
                    className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                  >
                    <option value="">All Countries</option>
                    {stats.countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>

                <button
                  onClick={exportData}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Patient Records ({filteredPatients.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MRN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visit Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DOB
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <tr key={patient._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.mrn}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.visitNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.dob}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {patient.country}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.formName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(patient.createdAt!).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => console.log('View patient:', patient._id)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredPatients.length === 0 && (
              <div className="text-center py-12">
                <Database className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">No patients found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardTab