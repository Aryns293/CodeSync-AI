export function runBeforeCrdtBenchmark() { 
    const sizes = [ 1000, 5000, 10000, 25000, 50000 ]; 
    const edits = 100; 
    const results = []; 
    
    for (const size of sizes) { 
        let code = "A".repeat(size); 
        let totalBytes = 0; 
        
        for (let i = 0; i < edits; i++) { 
            code += "X"; 
            const payload = { roomId: "benchmark-room", code, timestamp: new Date().toISOString() }; 
            const bytes = new TextEncoder().encode(JSON.stringify(payload)).length; 
            totalBytes += bytes; 
        } 
        
        results.push({ 
            documentSize: size, 
            edits, 
            totalBytes, 
            totalKB: (totalBytes / 1024).toFixed(2), 
            averageBytesPerEdit: (totalBytes / edits).toFixed(2) 
        }); 
    } 
    
    console.table(results); 
    return results; 
}
