const { useState, useEffect } = React;

function App() {
    const [postcode, setPostcode] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [housingData, setHousingData] = useState({});
    const [compareMode, setCompareMode] = useState(false);
    const [comparePostcodes, setComparePostcodes] = useState(['', '', '']);
    const [compareResults, setCompareResults] = useState([]);

    // Load real ONS data on mount
    useEffect(() => {
        loadRealData();
    }, []);

    const loadRealData = async () => {
        setLoading(true);
        try {
            const data = await window.loadHousingData();
            setHousingData(data);
        } catch (err) {
            setError('Failed to load housing data');
        } finally {
            setLoading(false);
        }
    };

    const normalizePostcode = (code) => {
        return code.trim().toUpperCase().replace(/\s+/g, '');
    };

    const validatePostcode = (code) => {
        const normalized = normalizePostcode(code);
        const postcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/;
        return postcodePattern.test(normalized);
    };

    const searchPostcode = () => {
        const normalized = normalizePostcode(postcode);
        setError('');
        setResults(null);
        
        if (!normalized) {
            setError('Please enter a postcode district');
            return;
        }
        
        if (!validatePostcode(normalized)) {
            setError('Invalid postcode format. Examples: MK40, SE18, RM10');
            return;
        }
        
        const data = housingData[normalized];
        if (!data) {
            setError(`Postcode district ${normalized} not found. Try: MK40, MK41, SE18, RM10, MK42`);
            return;
        }
        
        setResults(data);
    };

    const exportCSV = () => {
        if (!results) return;
        
        const csvContent = `Postcode District,Detached,Semi Detached,Terraced,Flats,Caravan,Total Stock
${results.outward_postcode},${results.detached},${results.semi},${results.terraced},${results.flat},${results.caravan},${results.total_stock}`;
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `housing-stock-${results.outward_postcode}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const runComparison = () => {
        const validPostcodes = comparePostcodes
            .map(p => normalizePostcode(p))
            .filter(p => p && housingData[p]);
        
        if (validPostcodes.length < 2) {
            setError('Please enter at least 2 valid postcodes to compare');
            return;
        }
        
        const comparisonData = validPostcodes.map(code => housingData[code]);
        setCompareResults(comparisonData);
        setError('');
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading">
                    <h2>Loading housing data...</h2>
                    <p>Processing latest ONS data</p>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <header>
                <h1>Housing Stock by Postcode District</h1>
                <p>Enter a UK postcode district to see housing stock breakdown using official ONS data</p>
            </header>

            <main>
                <section className="search-section">
                    <div className="search-container">
                        <input 
                            type="text" 
                            value={postcode}
                            onChange={(e) => setPostcode(e.target.value)}
                            placeholder="Enter postcode district (e.g., MK40, SE18, RM10)"
                            onKeyPress={(e) => e.key === 'Enter' && searchPostcode()}
                        />
                        <button onClick={searchPostcode}>Search</button>
                        <button onClick={() => setCompareMode(!compareMode)} className="compare-btn">
                            {compareMode ? 'Single Search' : 'Compare Mode'}
                        </button>
                    </div>
                    {error && <div className="error-message">{error}</div>}
                </section>

                {!compareMode ? (
                    results && (
                        <section className="results-section">
                            <div className="results-header">
                                <h2>Postcode District: {results.outward_postcode}</h2>
                                <div className="total-stock">
                                    <span className="total-label">Total Residential Stock:</span>
                                    <span className="total-number">{results.total_stock.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="housing-types">
                                <div className="housing-card detached">
                                    <h3>Detached</h3>
                                    <span className="count">{results.detached.toLocaleString()}</span>
                                </div>
                                <div className="housing-card semi">
                                    <h3>Semi Detached</h3>
                                    <span className="count">{results.semi.toLocaleString()}</span>
                                </div>
                                <div className="housing-card terraced">
                                    <h3>Terraced</h3>
                                    <span className="count">{results.terraced.toLocaleString()}</span>
                                </div>
                                <div className="housing-card flat">
                                    <h3>Flats</h3>
                                    <span className="count">{results.flat.toLocaleString()}</span>
                                </div>
                                <div className="housing-card caravan">
                                    <h3>Caravan</h3>
                                    <span className="count">{results.caravan.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="actions">
                                <button onClick={exportCSV} className="export-btn">Export CSV</button>
                            </div>

                            <div className="methodology">
                                <h3>Methodology</h3>
                                <p>This data uses official ONS NSPL and Census 2021 TS044 accommodation type data. 
                                   Housing stock estimates are calculated by mapping postcodes to Output Areas and 
                                   aggregating accommodation type counts.</p>
                                <p><strong>Data sources:</strong> NSPL August 2025, Census 2021 TS044</p>
                                <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
                            </div>
                        </section>
                    )
                ) : (
                    <section className="compare-section">
                        <h2>Compare Postcode Districts</h2>
                        <div className="compare-inputs">
                            <input 
                                type="text" 
                                value={comparePostcodes[0]}
                                onChange={(e) => {
                                    const newPostcodes = [...comparePostcodes];
                                    newPostcodes[0] = e.target.value;
                                    setComparePostcodes(newPostcodes);
                                }}
                                placeholder="Postcode 1"
                            />
                            <input 
                                type="text" 
                                value={comparePostcodes[1]}
                                onChange={(e) => {
                                    const newPostcodes = [...comparePostcodes];
                                    newPostcodes[1] = e.target.value;
                                    setComparePostcodes(newPostcodes);
                                }}
                                placeholder="Postcode 2"
                            />
                            <input 
                                type="text" 
                                value={comparePostcodes[2]}
                                onChange={(e) => {
                                    const newPostcodes = [...comparePostcodes];
                                    newPostcodes[2] = e.target.value;
                                    setComparePostcodes(newPostcodes);
                                }}
                                placeholder="Postcode 3"
                            />
                            <button onClick={runComparison}>Compare</button>
                        </div>
                        
                        {compareResults.length > 0 && (
                            <div className="compare-results">
                                <table className="compare-table">
                                    <thead>
                                        <tr>
                                            <th>Postcode</th>
                                            <th>Detached</th>
                                            <th>Semi</th>
                                            <th>Terraced</th>
                                            <th>Flats</th>
                                            <th>Caravan</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {compareResults.map((data, index) => (
                                            <tr key={index}>
                                                <td><strong>{data.outward_postcode}</strong></td>
                                                <td>{data.detached.toLocaleString()}</td>
                                                <td>{data.semi.toLocaleString()}</td>
                                                <td>{data.terraced.toLocaleString()}</td>
                                                <td>{data.flat.toLocaleString()}</td>
                                                <td>{data.caravan.toLocaleString()}</td>
                                                <td><strong>{data.total_stock.toLocaleString()}</strong></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}

// Render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
