import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { Patient } from '../models/Patient'
import { FormFormat } from '../models/FormFormat'
import { ExtractionLog } from '../models/ExtractionLog'

dotenv.config()

function calculateAge(birthDate: Date): number {
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1
  }
  return age
}

const samplePatients = {
  uk: [
    {
      name: 'John Smith',
      age: calculateAge(new Date('1985-03-15')),
      country: 'UK' as const,
      countryData: {
        nhsNumber: '1234567890',
        address: 'SW1A 1AA, London',
        gpName: 'Dr. Elizabeth Taylor',
        nhsInsuranceNumber: 'NHS123456'
      },
      extractedAt: new Date(),
      status: 'verified' as const
    },
    {
      name: 'Emma Johnson',
      age: calculateAge(new Date('1990-07-22')),
      country: 'UK' as const,
      countryData: {
        nhsNumber: '0987654321',
        address: 'E1 6AN, London',
        gpName: 'Dr. James Wilson',
        nhsInsuranceNumber: 'NHS789012'
      },
      extractedAt: new Date(),
      status: 'extracted' as const
    },
    {
      name: 'William Brown',
      age: calculateAge(new Date('1978-11-30')),
      country: 'UK' as const,
      countryData: {
        nhsNumber: '5432167890',
        address: 'M1 1AE, Manchester',
        gpName: 'Dr. Sarah Jones',
        nhsInsuranceNumber: 'NHS345678'
      },
      extractedAt: new Date(),
      status: 'verified' as const
    }
  ],
  us: [
    {
      name: 'Michael Davis',
      age: calculateAge(new Date('1982-06-10')),
      country: 'US' as const,
      countryData: {
        mrn: 'MRN123456',
        ssn: '123-45-6789',
        healthInsurancePolicyNumber: 'HIP-789012',
        primaryInsuranceProvider: 'Blue Cross Blue Shield'
      },
      extractedAt: new Date(),
      status: 'extracted' as const
    },
    {
      name: 'Sarah Wilson',
      age: calculateAge(new Date('1995-09-25')),
      country: 'US' as const,
      countryData: {
        mrn: 'MRN789012',
        ssn: '987-65-4321',
        healthInsurancePolicyNumber: 'HIP-345678',
        primaryInsuranceProvider: 'Aetna'
      },
      extractedAt: new Date(),
      status: 'verified' as const
    },
    {
      name: 'Robert Martinez',
      age: calculateAge(new Date('1975-12-03')),
      country: 'US' as const,
      countryData: {
        mrn: 'MRN456789',
        ssn: '456-78-9012',
        healthInsurancePolicyNumber: 'HIP-901234',
        primaryInsuranceProvider: 'United Healthcare'
      },
      extractedAt: new Date(),
      status: 'extracted' as const
    }
  ],
  india: [
    {
      name: 'Raj Patel',
      age: calculateAge(new Date('1988-04-20')),
      country: 'India' as const,
      countryData: {
        hospitalUidAadhaar: '123456789012',
        insuranceMemberID: 'INS-123456',
        insuranceCompanyName: 'Star Health Insurance'
      },
      extractedAt: new Date(),
      status: 'verified' as const
    },
    {
      name: 'Priya Sharma',
      age: calculateAge(new Date('1992-08-15')),
      country: 'India' as const,
      countryData: {
        hospitalUidAadhaar: '210987654321',
        insuranceMemberID: 'INS-789012',
        insuranceCompanyName: 'ICICI Lombard'
      },
      extractedAt: new Date(),
      status: 'extracted' as const
    },
    {
      name: 'Arjun Kumar',
      age: calculateAge(new Date('1980-01-26')),
      country: 'India' as const,
      countryData: {
        hospitalUidAadhaar: '345678901234',
        insuranceMemberID: 'INS-345678',
        insuranceCompanyName: 'HDFC ERGO'
      },
      extractedAt: new Date(),
      status: 'verified' as const
    }
  ],
  japan: [
    {
      name: 'Takeshi Yamamoto',
      age: calculateAge(new Date('1986-05-12')),
      country: 'Japan' as const,
      countryData: {
        hospitalPatientID: 'HID-123456',
        nationalHealthInsuranceCardNumber: 'NHIC-789012',
        prefectureCode: '13' // Tokyo
      },
      extractedAt: new Date(),
      status: 'extracted' as const
    },
    {
      name: 'Yuki Tanaka',
      age: calculateAge(new Date('1991-10-08')),
      country: 'Japan' as const,
      countryData: {
        hospitalPatientID: 'HID-789012',
        nationalHealthInsuranceCardNumber: 'NHIC-345678',
        prefectureCode: '27' // Osaka
      },
      extractedAt: new Date(),
      status: 'verified' as const
    },
    {
      name: 'Hiroshi Suzuki',
      age: calculateAge(new Date('1979-02-28')),
      country: 'Japan' as const,
      countryData: {
        hospitalPatientID: 'HID-456789',
        nationalHealthInsuranceCardNumber: 'NHIC-901234',
        prefectureCode: '40' // Fukuoka
      },
      extractedAt: new Date(),
      status: 'extracted' as const
    }
  ]
}

const sampleFormFormats = [
  {
    country: 'UK' as const,
    formName: 'Patient Registration Form - UK',
    description: 'UK patient registration form with NHS data',
    googleFormUrl: 'https://docs.google.com/forms/d/e/ID/viewform',
    isActive: true,
    fieldMappings: [
      { 
        fieldName: 'name', 
        googleFormSelector: 'input[aria-labelledby="i1 i4"]',
        inputType: 'text' as const,
        isRequired: true,
        placeholder: 'Full Name'
      },
      { 
        fieldName: 'age', 
        googleFormSelector: 'input[aria-labelledby="i6 i9"]',
        inputType: 'number' as const,
        isRequired: true,
        placeholder: 'Age'
      },
      { 
        fieldName: 'nhsNumber', 
        googleFormSelector: 'input[aria-labelledby="i11 i14"]',
        inputType: 'text' as const,
        isRequired: true,
        validationPattern: '^[0-9]{10}$',
        placeholder: 'NHS Number (10 digits)'
      },
      { 
        fieldName: 'address', 
        googleFormSelector: 'input[aria-labelledby="i16 i19"]',
        inputType: 'textarea' as const,
        isRequired: false,
        placeholder: 'Address'
      },
      { 
        fieldName: 'gpName', 
        googleFormSelector: 'input[aria-labelledby="i21 i24"]',
        inputType: 'text' as const,
        isRequired: false,
        placeholder: 'GP Name'
      }
    ],
    formTemplate: {
      title: 'NHS Patient Registration',
      description: 'Please fill in your NHS registration details',
      fields: [
        { label: 'Full Name', type: 'text', required: true, options: [], dataAttribute: 'name' },
        { label: 'Age', type: 'number', required: true, options: [], dataAttribute: 'age' },
        { label: 'NHS Number', type: 'text', required: true, options: [], dataAttribute: 'nhsNumber' },
        { label: 'Address', type: 'textarea', required: false, options: [], dataAttribute: 'address' },
        { label: 'GP Name', type: 'text', required: false, options: [], dataAttribute: 'gpName' }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    country: 'US' as const,
    formName: 'Patient Registration Form - US',
    description: 'US hospital patient intake form',
    googleFormUrl: 'https://docs.google.com/forms/d/e/ID/viewform',
    isActive: true,
    fieldMappings: [
      { 
        fieldName: 'name', 
        googleFormSelector: 'input[aria-labelledby="i1 i4"]',
        inputType: 'text' as const,
        isRequired: true,
        placeholder: 'Full Name'
      },
      { 
        fieldName: 'age', 
        googleFormSelector: 'input[aria-labelledby="i6 i9"]',
        inputType: 'number' as const,
        isRequired: true,
        placeholder: 'Age'
      },
      { 
        fieldName: 'ssn', 
        googleFormSelector: 'input[aria-labelledby="i16 i19"]',
        inputType: 'text' as const,
        isRequired: true,
        validationPattern: '^[0-9]{3}-[0-9]{2}-[0-9]{4}$',
        placeholder: 'SSN (XXX-XX-XXXX)'
      },
      { 
        fieldName: 'mrn', 
        googleFormSelector: 'input[aria-labelledby="i11 i14"]',
        inputType: 'text' as const,
        isRequired: false,
        placeholder: 'Medical Record Number'
      },
      { 
        fieldName: 'insuranceProvider', 
        googleFormSelector: 'input[aria-labelledby="i21 i24"]',
        inputType: 'text' as const,
        isRequired: false,
        placeholder: 'Insurance Provider'
      }
    ],
    formTemplate: {
      title: 'US Patient Intake Form',
      description: 'Please provide your patient information',
      fields: [
        { label: 'Full Name', type: 'text', required: true, options: [], dataAttribute: 'name' },
        { label: 'Age', type: 'number', required: true, options: [], dataAttribute: 'age' },
        { label: 'Social Security Number', type: 'text', required: true, options: [], dataAttribute: 'ssn' },
        { label: 'Medical Record Number', type: 'text', required: false, options: [], dataAttribute: 'mrn' },
        { label: 'Insurance Provider', type: 'text', required: false, options: [], dataAttribute: 'insuranceProvider' }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    country: 'India' as const,
    formName: 'Patient Registration Form - India',
    description: 'Indian hospital patient registration with Aadhaar',
    googleFormUrl: 'https://docs.google.com/forms/d/e/ID/viewform',
    isActive: true,
    fieldMappings: [
      { 
        fieldName: 'name', 
        googleFormSelector: 'input[aria-labelledby="i1 i4"]',
        inputType: 'text' as const,
        isRequired: true,
        placeholder: 'Full Name'
      },
      { 
        fieldName: 'age', 
        googleFormSelector: 'input[aria-labelledby="i6 i9"]',
        inputType: 'text' as const,
        isRequired: true,
        placeholder: 'Patient Age'
      },
      { 
        fieldName: 'aadhaar', 
        googleFormSelector: 'input[aria-labelledby ="i11 i14"]',
        inputType: 'text' as const,
        isRequired: true,
        validationPattern: '^[0-9]{12}$',
        placeholder: 'Hospital UID / Aadhaar Number'
      },
      { 
        fieldName: 'insuranceMemberID', 
        googleFormSelector: 'input[aria-labelledby="i16 i19"]',
        inputType: 'text' as const,
        isRequired: true,
        placeholder: 'Insurance Member ID'
      },
      { 
        fieldName: 'insuranceCompany', 
        googleFormSelector: 'input[aria-labelledby="i22 i24"]',
        inputType: 'text' as const,
        isRequired: false,
        placeholder: 'Insurance Company Name'
      }
    ],
    formTemplate: {
      title: 'Patient Registration - India',
      description: 'Please fill in your registration details',
      fields: [
        { label: 'Full Name', type: 'text', required: true, options: [], dataAttribute: 'name' },
        { label: 'Age', type: 'number', required: true, options: [], dataAttribute: 'age' },
        { label: 'Aadhaar Number', type: 'text', required: true, options: [], dataAttribute: 'aadhaar' },
        { label: 'Insurance Member ID', type: 'text', required: false, options: [], dataAttribute: 'insuranceMemberID' },
        { label: 'Insurance Company', type: 'text', required: false, options: [], dataAttribute: 'insuranceCompany' }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    country: 'Japan' as const,
    formName: 'Patient Registration Form - Japan',
    description: 'Japanese hospital patient registration with National Health Insurance Card Number and Prefecture Code',
    googleFormUrl: 'https://docs.google.com/forms/d/e/ID/viewform',
    isActive: true,
    fieldMappings: [
      { 
        fieldName: 'name', 
        googleFormSelector: 'input[aria-labelledby="i1 i4"]',
        inputType: 'text' as const,
        isRequired: true,
        placeholder: 'Full Name'
      },
      { 
        fieldName: 'age', 
        googleFormSelector: 'input[aria-labelledby="i6 i9"]',
        inputType: 'number' as const,
        isRequired: true,
        placeholder: 'Age'
      },
      { 
        fieldName: 'patientID', 
        googleFormSelector: 'input[aria-labelledby="i11 i14"]',
        inputType: 'text' as const,
        isRequired: true,
        placeholder: 'Hospital Patient ID'
      },
      { 
        fieldName: 'healthInsuranceCard', 
        googleFormSelector: 'input[aria-labelledby="i16 i19"]',
        inputType: 'text' as const,
        isRequired: false,
        placeholder: 'Health Insurance Card Number'
      },
      { 
        fieldName: 'prefectureCode', 
        googleFormSelector: 'input[aria-labelledby="i21 i24"]',
        inputType: 'select' as const,
        isRequired: false,
        placeholder: 'Prefecture'
      }
    ],
    formTemplate: {
      title: '患者登録 (Patient Registration)',
      description: '患者情報を入力してください',
      fields: [
        { label: 'Full Name', type: 'text', required: true, options: [], dataAttribute: 'name' },
        { label: 'Age', type: 'number', required: true, options: [], dataAttribute: 'age' },
        { label: 'Hospital Patient ID', type: 'text', required: true, options: [], dataAttribute: 'patientID' },
        { label: 'Health Insurance Card', type: 'text', required: false, options: [], dataAttribute: 'healthInsuranceCard' },
        { label: 'Prefecture', type: 'select', required: false, options: ['13-Tokyo', '27-Osaka', '40-Fukuoka'], dataAttribute: 'prefectureCode' }
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/his-data-extractor')
    console.log('Connected to MongoDB')

    // Clear existing data
    console.log('Clearing existing data...')
    await Patient.deleteMany({})
    await FormFormat.deleteMany({})
    await ExtractionLog.deleteMany({})

    // Insert sample patients
    console.log('Inserting sample patients...')
    const allPatients = [
      ...samplePatients.uk,
      ...samplePatients.us,
      ...samplePatients.india,
      ...samplePatients.japan
    ]
    
    const insertedPatients = await Patient.insertMany(allPatients)
    console.log(`Inserted ${insertedPatients.length} patients`)

    // Insert form formats
    console.log('Inserting form formats...')
    const insertedFormats = await FormFormat.insertMany(sampleFormFormats)
    console.log(`Inserted ${insertedFormats.length} form formats`)

    // Display summary
    console.log('\n=== Seed Summary ===')
    console.log(`UK Patients: ${samplePatients.uk.length}`)
    console.log(`US Patients: ${samplePatients.us.length}`)
    console.log(`India Patients: ${samplePatients.india.length}`)
    console.log(`Japan Patients: ${samplePatients.japan.length}`)
    console.log(`Total Patients: ${insertedPatients.length}`)
    console.log(`Form Formats: ${insertedFormats.length}`)
    console.log('\nDatabase seeded successfully!')

  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

// Run the seed function
seedDatabase()