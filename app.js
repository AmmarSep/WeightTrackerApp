// --- Configuration ---
const STORAGE_KEY = 'weightTrackerData';

// GitHub Sync Configuration
const GITHUB_CONFIG = {
    owner: "YOUR_GITHUB_USERNAME",
    repo: "YOUR_REPO_NAME",
    path: "weights.json",
    token: "YOUR_GITHUB_PERSONAL_ACCESS_TOKEN" // Requires 'repo' scope
};

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
const syncBtn = document.getElementById('syncBtn');
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
    syncBtn.addEventListener('click', handleSync);
    exportCsvBtn.addEventListener('click', exportCSV);
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

// --- GitHub Sync ---
// Helper to encode/decode base64 correctly with UTF-8 support
const b64DecodeUnicode = str => decodeURIComponent(Array.prototype.map.call(atob(str), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
const b64EncodeUnicode = str => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));

async function handleSync() {
    if (GITHUB_CONFIG.token === "YOUR_GITHUB_PERSONAL_ACCESS_TOKEN" || !GITHUB_CONFIG.owner || !GITHUB_CONFIG.repo) {
        alert("GitHub Sync is not configured. Please update GITHUB_CONFIG in app.js");
        return;
    }

    syncBtn.textContent = 'Syncing...';
    syncBtn.disabled = true;

    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;
    const headers = {
        'Authorization': `token ${GITHUB_CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json'
    };

    try {
        // Step 1: Pull data
        let fileSha = null;
        let cloudData = [];
        
        try {
            const getResponse = await fetch(apiUrl, { headers, method: 'GET' });
            if (getResponse.ok) {
                const getResult = await getResponse.json();
                fileSha = getResult.sha;
                
                // Decode Base64 content to JSON string, then parse
                const decodedContent = b64DecodeUnicode(getResult.content);
                try {
                    cloudData = JSON.parse(decodedContent);
                } catch (parseError) {
                    throw new Error("Invalid JSON in remote weights.json file.");
                }
            } else if (getResponse.status !== 404) {
                const errorData = await getResponse.json();
                throw new Error(errorData.message || "Failed to fetch from GitHub.");
            }
            // If 404, it means the file doesn't exist yet, which is fine (cloudData remains [])
        } catch (networkError) {
            throw new Error(`Network/Fetch error: ${networkError.message}`);
        }

        // Step 2: Merge logic (Unique key = date + weight, avoid duplicates, preserve newest)
        // Since we don't have timestamps, we merge by adding all local and cloud data,
        // and using a combination of date+weight as a unique key to filter out duplicates.
        const mergedMap = new Map();
        
        // Add cloud data first
        cloudData.forEach(entry => {
            if (entry && entry.date && entry.weight) {
                const key = `${entry.date}_${entry.weight}`;
                mergedMap.set(key, entry);
            }
        });
        
        // Add local data (will overwrite cloud if same key, preserving local/newest entries for that key)
        entries.forEach(entry => {
            if (entry && entry.date && entry.weight) {
                const key = `${entry.date}_${entry.weight}`;
                mergedMap.set(key, entry);
            }
        });

        const mergedEntries = Array.from(mergedMap.values());
        
        // Sort by date just to keep the internal array organized
        mergedEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Step 3: Push data
        const newContentJson = JSON.stringify(mergedEntries, null, 2);
        const encodedContent = b64EncodeUnicode(newContentJson);
        
        const putBody = {
            message: "Sync weight tracker data",
            content: encodedContent
        };
        
        if (fileSha) {
            putBody.sha = fileSha; // Required for updating an existing file
        }

        const putResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(putBody)
        });

        if (!putResponse.ok) {
            const putResult = await putResponse.json();
            if (putResponse.status === 409) {
                throw new Error("Merge conflict: The file was updated remotely during sync. Please try syncing again.");
            }
            throw new Error(putResult.message || "Failed to push to GitHub.");
        }

        // Update local state and UI
        entries = mergedEntries;
        saveData();
        updateUI();

        alert("Sync completed successfully!");

    } catch (error) {
        console.error("Sync error:", error);
        alert(`Error during sync: ${error.message}`);
    } finally {
        syncBtn.textContent = 'Sync Data';
        syncBtn.disabled = false;
    }
}

// Start app
init();