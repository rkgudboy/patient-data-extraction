# Chrome Extension

Patient data extraction Chrome extension built with Plasmo framework.

## Setup

```bash
npm install
npm run dev
```

## Build

- Development: `npm run dev`
- Production: `npm run build`

## Install Extension

1. Build the extension: `npm run dev`
2. Open Chrome → Extensions → Developer mode ON
3. Click "Load unpacked"
4. Select `build/chrome-mv3-dev` folder

## Usage

1. Navigate to Google Forms
2. Extension automatically detects and extracts patient data
3. Click extension icon to view dashboard
4. Data is saved to backend API

## Features

- Auto-detection of patient forms
- Real-time data extraction
- Duplicate detection with user confirmation
- Dashboard view for extracted data
- Multi-country support

## Development

Extension hot-reloads during development. Refresh extension in Chrome after code changes.