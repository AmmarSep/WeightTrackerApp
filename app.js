// --- Configuration ---
const STORAGE_KEY = 'weightTrackerData';

// --- State ---
let entries = [];
let chartInstance = null;

// --- DOM Elements ---
const form = document.getElementById('addWeightForm');
const dateInput = document.getElementById('dateInput');
const weightInput = document.getElementById('weightInput');
const historyBody = document.getElementById('historyBody');
const statCurrent = document.getElementById('statCurrent');
const statChange = document.getElementById('statChange');
const statAverage = document.getElementById('statAverage');
const themeToggle = document.getElementById('themeToggle');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// --- Initialization ---
function init() {
    // Set default date to today
    dateInput.valueAsDate = new Date();

    // Load theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    }

    // Load data
    loadData();

    // Event Listeners
    form.addEventListener('submit', handleAddEntry);
    themeToggle.addEventListener('click', toggleTheme);
    exportCsvBtn.addEventListener('click', exportCSV);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImport);
}

// --- Data Management ---
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            entries = JSON.parse(data);
        } catch (e) {
            console.error("Failed to parse local data", e);
            entries = [];
        }
    }
    updateUI();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function handleAddEntry(e) {
    e.preventDefault();
    
    const date = dateInput.value;
    const weight = parseFloat(weightInput.value);

    if (!date || isNaN(weight)) {
        alert("Please enter valid date and weight.");
        return;
    }

    // Check if entry for this date already exists
    const existingIndex = entries.findIndex(entry => entry.date === date);
    if (existingIndex >= 0) {
        if(confirm("An entry for this date already exists. Overwrite?")) {
            entries[existingIndex].weight = weight;
        } else {
            return; // Cancel addition
        }
    } else {
        entries.push({ date, weight });
    }

    saveData();
    updateUI();
    
    // Reset weight input, keep date
    weightInput.value = '';
}

function deleteEntry(date) {
    if (confirm("Are you sure you want to delete this entry?")) {
        entries = entries.filter(entry => entry.date !== date);
        saveData();
        updateUI();
    }
}

// --- UI Updates ---
function updateUI() {
    // Sort entries by date descending for table
    const sortedEntriesDesc = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    renderTable(sortedEntriesDesc);
    updateStats(sortedEntriesDesc);
    renderChart();
}

function renderTable(sortedData) {
    historyBody.innerHTML = '';
    
    if (sortedData.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="3" style="text-align:center">No entries yet.</td></tr>';
        return;
    }

    sortedData.forEach(entry => {
        const tr = document.createElement('tr');
        
        const dateTd = document.createElement('td');
        dateTd.textContent = entry.date;
        
        const weightTd = document.createElement('td');
        weightTd.textContent = entry.weight.toFixed(1);
        
        const actionsTd = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.style.padding = '4px 8px';
        deleteBtn.onclick = () => deleteEntry(entry.date);
        
        actionsTd.appendChild(deleteBtn);
        
        tr.appendChild(dateTd);
        tr.appendChild(weightTd);
        tr.appendChild(actionsTd);
        
        historyBody.appendChild(tr);
    });
}

function updateStats(sortedDataDesc) {
    if (sortedDataDesc.length === 0) {
        statCurrent.textContent = '-- kg';
        statChange.textContent = '-- kg';
        statAverage.textContent = '-- kg';
        return;
    }

    const currentWeight = sortedDataDesc[0].weight;
    // Oldest is last in desc array
    const oldestWeight = sortedDataDesc[sortedDataDesc.length - 1].weight;
    
    const totalChange = currentWeight - oldestWeight;
    
    const sum = entries.reduce((acc, curr) => acc + curr.weight, 0);
    const average = sum / entries.length;

    statCurrent.textContent = `${currentWeight.toFixed(1)} kg`;
    
    const changePrefix = totalChange > 0 ? '+' : '';
    statChange.textContent = `${changePrefix}${totalChange.toFixed(1)} kg`;
    statChange.style.color = totalChange > 0 ? 'var(--danger-color)' : (totalChange < 0 ? 'var(--success-color)' : 'var(--text-color)');
    
    statAverage.textContent = `${average.toFixed(1)} kg`;
}

function renderChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');
    
    // Sort ascending for chart
    const sortedEntriesAsc = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedEntriesAsc.map(e => e.date);
    const dataPoints = sortedEntriesAsc.map(e => e.weight);

    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    const gridColor = isDarkMode ? '#444' : '#e1e8ed';
    const textColor = isDarkMode ? '#f4f4f4' : '#333';

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weight (kg)',
                data: dataPoints,
                borderColor: '#4a90e2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#4a90e2',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                }
            },
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            }
        }
    });
}

// --- Theme Management ---
function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
    renderChart(); // Redraw chart with new colors
}

// --- CSV Export ---
function exportCSV() {
    if (entries.length === 0) {
        alert("No data to export.");
        return;
    }
    
    const header = "Date,Weight (kg)\n";
    const csvContent = entries.map(e => `${e.date},${e.weight}`).join("\n");
    const blob = new Blob([header + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'weight_history.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- JSON Export / Import Sync ---

// Export logic:
// Reads all entries from LocalStorage (currently loaded in the `entries` state).
// Converts the array to a JSON string.
// Creates a Blob with the JSON data and generates a temporary URL to trigger the file download.
function handleExport() {
    if (entries.length === 0) {
        alert("No data to export.");
        return;
    }

    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "weights.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import logic:
// Triggered when a file is selected. Reads the file as text.
// Parses the JSON string into an array of objects.
// Performs error handling to ensure the file is valid and follows the expected structure.
async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        
        // Error handling: Empty file
        if (!text.trim()) {
            throw new Error("The selected file is empty.");
        }

        // Error handling: Invalid JSON file
        const importedData = JSON.parse(text);

        // Error handling: Wrong structure
        if (!Array.isArray(importedData)) {
            throw new Error("Invalid file format. Expected a JSON array.");
        }

        // Validate structure of individual items
        const isValidStructure = importedData.every(item => 
            item.hasOwnProperty('date') && 
            item.hasOwnProperty('weight') &&
            typeof item.date === 'string' &&
            typeof item.weight === 'number'
        );

        if (!isValidStructure) {
            throw new Error("Invalid data structure. Entries must contain 'date' (string) and 'weight' (number).");
        }

        // Merge logic:
        // Use a Map to avoid duplicates.
        // Unique key is constructed using date + weight.
        // We preserve existing entries and merge in new, non-duplicate entries from the imported data.
        const mergedMap = new Map();
        
        // Add existing local entries first to preserve them
        entries.forEach(entry => {
            const key = `${entry.date}_${entry.weight}`;
            mergedMap.set(key, entry);
        });

        // Add imported entries. Overwrites duplicates with the same date+weight, effectively avoiding duplicates.
        importedData.forEach(entry => {
            const key = `${entry.date}_${entry.weight}`;
            mergedMap.set(key, entry);
        });

        // Convert the merged map back to an array
        entries = Array.from(mergedMap.values());
        
        // Sort by date descending (though updateUI also sorts them, good for state consistency)
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));

        saveData();
        updateUI();

        alert("Data imported successfully!");

    } catch (error) {
        console.error("Import error:", error);
        alert(`Error importing data: ${error.message}`);
    } finally {
        // Reset the file input so the same file can be imported again if needed
        event.target.value = '';
    }
}

// Start app
init();