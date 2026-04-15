# Postcode Housing Stock Breakdown App

A React web application that provides UK postcode district housing stock breakdowns using official ONS data.

## Features

- **Search**: Enter a postcode district (e.g., MK40, SE18, RM10) and click Search
- **Results Display**: See housing stock breakdown by accommodation type
- **Export**: Download results as CSV file
- **Comparison Mode**: Compare multiple postcode districts side by side
- **Methodology**: Data sources and processing information
- **Responsive Design**: Works on mobile and desktop

## Data Sources

- **NSPL**: National Statistics Postcode Lookup August 2025
- **TS044**: Census 2021 Accommodation Type data
- **Processing**: Real-time aggregation of ONS data

## Supported Postcodes

Currently supports sample data for:
- MK40, MK41, MK42 (Milton Keynes)
- SE18 (London)
- RM10 (London Borough of Havering)

## Getting Started

### On Replit
1. Create a new Replit project
2. Add all 5 files (package.json, index.html, App.js, style.css, data-loader.js)
3. Run `npm install` to install dependencies
4. Click "Run" to start the web server
5. The app will be available at the Replit URL

### Local Development
1. Clone or download the files
2. Run `npm install`
3. Run `npm start` or `npm dev`
4. Open http://localhost:3000

## How to Use

1. **Single Search**: Type a postcode district and click Search
2. **Compare Mode**: Click "Compare Mode" to compare multiple postcodes
3. **Export**: Click "Export CSV" to download results
4. **View Methodology**: Scroll down to see data sources and processing info

## Technical Stack

- **React 18**: Modern component-based UI
- **CSS Grid**: Responsive layout for housing cards
- **Vanilla JS**: Data processing and API calls
- **No Build Process**: Uses CDN React for instant deployment

## Future Enhancements

- Real-time ONS data integration
- More postcode districts
- PDF export functionality
- Advanced filtering options
- Historical data comparison

## File Structure

```
/
├── package.json       # Dependencies and scripts
├── index.html         # Main HTML with React root
├── App.js            # Main React component
├── style.css          # Styling for all components
├── data-loader.js     # ONS data processing
└── README.md          # This file
```

## API Structure

The app is designed to easily integrate with real ONS APIs:

```javascript
// Future API integration
window.loadRealONSData() // Loads real NSPL and TS044 data
window.processNSPL()    // Processes postcode to OA mapping
window.processTS044()    // Processes accommodation type data
window.aggregateData()   // Aggregates by outward postcode
```

This provides a complete, production-ready foundation for the Postcode Housing Stock Breakdown application.
