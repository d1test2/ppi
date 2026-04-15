const { useState, useEffect } = React;

function App() {
    const [postcode, setPostcode] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [compareMode, setCompareMode] = useState(false);
    const [comparePostcodes, setComparePostcodes] = useState(['', '', '']);
    const [compareResults, setCompareResults] = useState([]);

    const normalizePostcode = (code) => {
        return code.trim().toUpperCase().replace(/\s+/g, '');
    };

    const validatePostcode = (code) => {
        const normalized = normalizePostcode(code);
        const postcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/;
        return postcodePattern.test(normalized);
    };

    const searchPostcode = async () => {
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
        
        setLoading(true);
        try {
            const response = await fetch(`/api/outward-postcode/${normalized}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Postcode not found');
            }
            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const runComparison = async () => {
        const validPostcodes = comparePostcodes
            .map(p => normalizePostcode(p))
            .filter(p => p);
        
        if (validPostcodes.length < 2) {
            setError('Please enter at least 2 postcodes to compare');
            return;
        }
        
        setLoading(true);
        try {
            const response = await fetch('/api/outward-postcode/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ districts: validPostcodes })
            });
            const data = await response.json();
            setCompareResults(data);
            setError('');
        } catch (err) {
            setError('Failed to run comparison');
        } finally {
            setLoading(false);
        }
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
        a.click();
    };

    const exportPDF = () => {
        if (!results) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text("Housing Stock Breakdown", 20, 20);
        
        doc.setFontSize(16);
        doc.text(`Postcode District: ${results.outward_postcode}`, 20, 40);
        
        doc.setFontSize(12);
        doc.text(`Total Residential Stock: ${results.total_stock.toLocaleString()}`, 20, 55);
        
        const columns = ["Type", "Count"];
        let yPos = 70;
        
        const data = [
            ["Detached", results.detached.toLocaleString()],
            ["Semi Detached", results.semi.toLocaleString()],
            ["Terraced", results.terraced.toLocaleString()],
            ["Flats", results.flat.toLocaleString()],
            ["Caravan", results.caravan.toLocaleString()]
        ];

        data.forEach(([type, count]) => {
            doc.text(`${type}:`, 20, yPos);
            doc.text(count, 80, yPos);
            yPos += 10;
        });

        doc.setFontSize(10);
        doc.text("Methodology: Official ONS and Census 2021 data.", 20, yPos + 20);
        doc.text(`Last Updated: ${new Date(results.source.last_updated).toLocaleDateString()}`, 20, yPos + 30);

        doc.save(`housing-report-${results.outward_postcode}.pdf`);
    };

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
                        <button onClick={searchPostcode} disabled={loading}>
                            {loading ? 'Searching...' : 'Search'}
                        </button>
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
                                <button onClick={exportPDF} className="export-btn pdf">Export PDF</button>
                            </div>

                            <div className="methodology">
                                <h3>Methodology</h3>
                                <p><strong>Data sources:</strong> NSPL {results.source.nspl_version}, {results.source.ts044_version}</p>
                                <p><strong>Last updated:</strong> {new Date(results.source.last_updated).toLocaleDateString()}</p>
                            </div>
                        </section>
                    )
                ) : (
                    <section className="compare-section">
                        <h2>Compare Postcode Districts</h2>
                        <div className="compare-inputs">
                            {[0, 1, 2].map(i => (
                                <input 
                                    key={i}
                                    type="text" 
                                    value={comparePostcodes[i]}
                                    onChange={(e) => {
                                        const newPostcodes = [...comparePostcodes];
                                        newPostcodes[i] = e.target.value;
                                        setComparePostcodes(newPostcodes);
                                    }}
                                    placeholder={`Postcode ${i+1}`}
                                />
                            ))}
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
