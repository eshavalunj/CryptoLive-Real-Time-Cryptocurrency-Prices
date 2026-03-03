// ===== DATA STORAGE =====
let allCryptos = [];
let filteredCryptos = [];
let currentFilter = 'all';
let userPortfolio = JSON.parse(localStorage.getItem('cryptoPortfolio')) || [];
let priceAlerts = JSON.parse(localStorage.getItem('priceAlerts')) || [];

// ===== API CONFIGURATION =====
const API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=INR&order=market_cap_desc&per_page=100&page=1&sparkline=true';

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    updateAlertCount();
    fetchCryptoData();
    setupEventListeners();
    
    // Auto-refresh every 60 seconds
    setInterval(fetchCryptoData, 60000);
});

// ===== THEME =====
function initializeTheme() {
    const savedTheme = localStorage.getItem('cryptoTheme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('cryptoTheme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });
}

// ===== CRYPTO ROW CLICK HANDLER =====
function attachCryptoRowListeners() {
    document.querySelectorAll('.crypto-row').forEach(row => {
        row.addEventListener('click', () => {
            const symbol = row.getAttribute('data-symbol');
            const tradingViewUrl = `https://www.tradingview.com/symbols/${symbol}USD/`;
            window.open(tradingViewUrl, '_blank');
        });
    });
}

// ===== FETCH DATA =====
async function fetchCryptoData() {
    showLoading();
    
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        
        const data = await response.json();
        allCryptos = data;
        filteredCryptos = data;
        
        renderCryptoTable();
        updateMarketOverview();
        updateLastUpdated();
        checkPriceAlerts();
        updateAlertCount();
        hideLoading();

    } catch (error) {
        console.error('Error fetching crypto data:', error);
        hideLoading();
        showError('Failed to load cryptocurrency data. Please try again later.');
    }
}

// ===== RENDER TABLE =====
function renderCryptoTable(cryptos = filteredCryptos) {
    const tbody = document.getElementById('cryptoTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (cryptos.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    tbody.innerHTML = cryptos.map((crypto, index) => {
        const priceChange = crypto.price_change_percentage_24h || 0;
        const changeClass = priceChange >= 0 ? 'change-positive' : 'change-negative';
        const changeIcon = priceChange >= 0 ? '▲' : '▼';
        
        return `
            <tr class="crypto-row" data-symbol="${crypto.symbol.toUpperCase()}" style="cursor: pointer;">
                <td><strong>${index + 1}</strong></td>
                <td>
                    <div class="coin-info">
                        <img src="${crypto.image}" alt="${crypto.name}" class="coin-img">
                        <span class="coin-name">${crypto.name}</span>
                    </div>
                </td>
                <td><strong>${crypto.symbol.toUpperCase()}</strong></td>
                <td class="text-right">
                    <span class="price">₹${formatNumber(crypto.current_price)}</span>
                </td>
                <td class="text-right">
                    <span class="${changeClass}">
                        ${changeIcon} ${Math.abs(priceChange).toFixed(2)}%
                    </span>
                </td>
                <td class="text-right">₹${formatLargeNumber(crypto.market_cap)}</td>
                <td class="text-right">₹${formatLargeNumber(crypto.total_volume)}</td>
                <td class="text-center">
                    ${generateMiniChart(crypto.sparkline_in_7d.price, priceChange >= 0)}
                </td>
            </tr>
        `;
    }).join('');
    
    attachCryptoRowListeners();
}

// ===== MARKET OVERVIEW =====
function updateMarketOverview() {
    if (allCryptos.length === 0) return;
    
    // Total Market Cap
    const totalMarketCap = allCryptos.reduce((sum, c) => sum + c.market_cap, 0);
    document.getElementById('totalMarketCap').textContent = '₹' + formatLargeNumber(totalMarketCap);
    
    // Top Gainer
    const topGainer = allCryptos.reduce((max, c) => 
        c.price_change_percentage_24h > max.price_change_percentage_24h ? c : max
    );
    document.getElementById('topGainer').textContent = 
        `${topGainer.symbol.toUpperCase()} +${topGainer.price_change_percentage_24h.toFixed(2)}%`;
    
    // Market Leader
    document.getElementById('topCrypto').textContent = allCryptos[0].name;
}

// ===== SEARCH =====
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        applyCurrentFilter();
        return;
    }
    
    const searched = allCryptos.filter(crypto =>
        crypto.name.toLowerCase().includes(searchTerm) ||
        crypto.symbol.toLowerCase().includes(searchTerm)
    );
    
    renderCryptoTable(searched);
}

// ===== FILTERS =====
function handleFilter(event) {
    const filterType = event.currentTarget.dataset.filter;
    currentFilter = filterType;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Clear search
    document.getElementById('searchInput').value = '';
    
    applyCurrentFilter();
}

function applyCurrentFilter() {
    switch (currentFilter) {
        case 'all':
            filteredCryptos = allCryptos;
            break;
        case 'top10':
            filteredCryptos = allCryptos.slice(0, 10);
            break;
        case 'gainers':
            filteredCryptos = allCryptos
                .filter(c => c.price_change_percentage_24h > 0)
                .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
            break;
        case 'losers':
            filteredCryptos = allCryptos
                .filter(c => c.price_change_percentage_24h < 0)
                .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);
            break;
    }
    
    renderCryptoTable(filteredCryptos);
}

// ===== MINI CHART =====
function generateMiniChart(prices, isPositive) {
    if (!prices || prices.length === 0) return '<span>-</span>';
    
    const color = isPositive ? '#10b981' : '#ef4444';
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const range = max - min;
    
    const points = prices.map((price, i) => {
        const x = (i / (prices.length - 1)) * 80;
        const y = 30 - ((price - min) / range) * 25;
        return `${x},${y}`;
    }).join(' ');
    
    return `
        <svg class="mini-chart" viewBox="0 0 80 30">
            <polyline
                fill="none"
                stroke="${color}"
                stroke-width="2"
                points="${points}"
            />
        </svg>
    `;
}

// ===== EXPORT TO CSV =====
function exportToCSV() {
    if (filteredCryptos.length === 0) {
        alert('No data to export!');
        return;
    }
    
    const headers = ['Rank', 'Name', 'Symbol', 'Price (INR)', '24h Change (%)', 'Market Cap', 'Volume (24h)'];
    const rows = filteredCryptos.map((crypto, index) => [
        index + 1,
        crypto.name,
        crypto.symbol.toUpperCase(),
        crypto.current_price,
        crypto.price_change_percentage_24h.toFixed(2),
        crypto.market_cap,
        crypto.total_volume
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto_prices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('CSV exported successfully!');
}

// ===== REFRESH =====
function refreshData() {
    fetchCryptoData();
    showNotification('Data refreshed!');
}

// ===== UTILITIES =====
function formatNumber(num) {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function formatLargeNumber(num) {
    if (!num) return 'N/A';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('lastUpdated').textContent = timeString;
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

function showError(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
        z-index: 9999;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
}

// ===== PORTFOLIO MANAGER =====
function openPortfolioManager() {
    populatePortfolioCoins();
    renderPortfolio();
    document.getElementById('portfolioModal').classList.remove('hidden');
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closePortfolioManager() {
    document.getElementById('portfolioModal').classList.add('hidden');
    document.getElementById('modalOverlay').classList.add('hidden');
}

function populatePortfolioCoins() {
    const select = document.getElementById('portfolioCoin');
    select.innerHTML = '<option value="">Select a coin...</option>';
    allCryptos.forEach(crypto => {
        const option = document.createElement('option');
        option.value = crypto.id;
        option.textContent = `${crypto.name} (${crypto.symbol.toUpperCase()})`;
        select.appendChild(option);
    });
}

function addToPortfolio() {
    const coinId = document.getElementById('portfolioCoin').value;
    const amount = parseFloat(document.getElementById('portfolioAmount').value);
    
    if (!coinId || !amount || amount <= 0) {
        showError('Please select a coin and enter a valid amount');
        return;
    }
    
    const coin = allCryptos.find(c => c.id === coinId);
    const existingEntry = userPortfolio.find(p => p.id === coinId);
    
    if (existingEntry) {
        existingEntry.totalInvestment += amount;
        existingEntry.quantity += amount / coin.current_price;
    } else {
        userPortfolio.push({
            id: coinId,
            name: coin.name,
            symbol: coin.symbol,
            quantity: amount / coin.current_price,
            totalInvestment: amount,
            buyPrice: coin.current_price
        });
    }
    
    localStorage.setItem('cryptoPortfolio', JSON.stringify(userPortfolio));
    document.getElementById('portfolioAmount').value = '';
    renderPortfolio();
    showNotification('Added to portfolio!');
}

function removeFromPortfolio(coinId) {
    userPortfolio = userPortfolio.filter(p => p.id !== coinId);
    localStorage.setItem('cryptoPortfolio', JSON.stringify(userPortfolio));
    renderPortfolio();
}

function renderPortfolio() {
    const list = document.getElementById('portfolioList');
    
    if (userPortfolio.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999;">No holdings yet. Add cryptocurrencies to your portfolio!</p>';
    } else {
        list.innerHTML = userPortfolio.map(holding => {
            const currentCrypto = allCryptos.find(c => c.id === holding.id);
            const currentValue = holding.quantity * currentCrypto.current_price;
            const profitLoss = currentValue - holding.totalInvestment;
            const profitLossPercent = (profitLoss / holding.totalInvestment * 100).toFixed(2);
            const isProfit = profitLoss >= 0;
            
            return `
                <div class="portfolio-item">
                    <div class="portfolio-info">
                        <div class="portfolio-coin">
                            <strong>${holding.name}</strong>
                            <span style="color: #999;">${holding.quantity.toFixed(4)} ${holding.symbol.toUpperCase()}</span>
                        </div>
                        <div class="portfolio-stats-inline">
                            <div>Invested: <strong>₹${holding.totalInvestment.toFixed(0)}</strong></div>
                            <div>Current: <strong>₹${currentValue.toFixed(0)}</strong></div>
                            <div class="${isProfit ? 'profit' : 'loss'}">
                                ${isProfit ? '+' : ''}₹${profitLoss.toFixed(0)} (${profitLossPercent}%)
                            </div>
                        </div>
                    </div>
                    <button onclick="removeFromPortfolio('${holding.id}')" class="btn-delete">Remove</button>
                </div>
            `;
        }).join('');
    }
    
    // Update portfolio stats
    const totalInvestment = userPortfolio.reduce((sum, p) => sum + p.totalInvestment, 0);
    const currentValue = userPortfolio.reduce((sum, p) => {
        const crypto = allCryptos.find(c => c.id === p.id);
        return sum + (p.quantity * crypto.current_price);
    }, 0);
    const profitLoss = currentValue - totalInvestment;
    
    document.getElementById('totalInvestment').textContent = '₹' + totalInvestment.toFixed(0);
    document.getElementById('currentValue').textContent = '₹' + currentValue.toFixed(0);
    document.getElementById('profitLoss').textContent = (profitLoss >= 0 ? '+' : '') + '₹' + profitLoss.toFixed(0);
    document.getElementById('profitLoss').style.color = profitLoss >= 0 ? '#10b981' : '#ef4444';
}

// ===== LEARNING HUB =====
function openLearningHub() {
    renderLearningContent();
    document.getElementById('learningModal').classList.remove('hidden');
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeLearningHub() {
    document.getElementById('learningModal').classList.add('hidden');
    document.getElementById('modalOverlay').classList.add('hidden');
}

function renderLearningContent() {
    const learningTopics = [
        {
            icon: '📊',
            title: 'Market Cap',
            description: 'Total value of all coins in circulation. Higher market cap = more stable.'
        },
        {
            icon: '📈',
            title: 'Volatility',
            description: 'Price changes over time. Higher volatility = higher risk but higher returns.'
        },
        {
            icon: '💰',
            title: 'Diversification',
            description: 'Spread investments across multiple coins to reduce risk.'
        },
        {
            icon: '🎯',
            title: 'Risk Management',
            description: 'Never invest more than you can afford to lose. Start small!'
        },
        {
            icon: '📉',
            title: 'Technical Analysis',
            description: 'Study price patterns and trends to predict future movements.'
        },
        {
            icon: '🔍',
            title: 'Due Diligence',
            description: 'Research projects, teams, and technology before investing.'
        }
    ];
    
    const grid = document.getElementById('learningGrid');
    grid.innerHTML = learningTopics.map(topic => `
        <div class="learning-card">
            <div class="learning-icon">${topic.icon}</div>
            <h4>${topic.title}</h4>
            <p>${topic.description}</p>
        </div>
    `).join('');
}

// ===== ALERT MANAGER =====
function openAlertManager() {
    populateAlertCoins();
    renderAlerts();
    document.getElementById('alertModal').classList.remove('hidden');
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeAlertManager() {
    document.getElementById('alertModal').classList.add('hidden');
    document.getElementById('modalOverlay').classList.add('hidden');
}

function populateAlertCoins() {
    const select = document.getElementById('alertCoin');
    select.innerHTML = '<option value="">Select a coin...</option>';
    allCryptos.forEach(crypto => {
        const option = document.createElement('option');
        option.value = crypto.id;
        option.textContent = `${crypto.name} (${crypto.symbol.toUpperCase()})`;
        select.appendChild(option);
    });
}

function createAlert() {
    const coinId = document.getElementById('alertCoin').value;
    const alertType = document.getElementById('alertType').value;
    const alertPrice = parseFloat(document.getElementById('alertPrice').value);
    
    if (!coinId || !alertPrice || alertPrice <= 0) {
        showError('Please fill in all alert fields');
        return;
    }
    
    const coin = allCryptos.find(c => c.id === coinId);
    
    priceAlerts.push({
        id: Math.random().toString(36).substr(2, 9),
        coinId: coinId,
        coinName: coin.name,
        coinSymbol: coin.symbol,
        alertType: alertType,
        alertPrice: alertPrice,
        currentPrice: coin.current_price,
        createdAt: new Date().toLocaleString()
    });
    
    localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
    document.getElementById('alertPrice').value = '';
    renderAlerts();
    updateAlertCount();
    showNotification('Alert created successfully!');
}

function removeAlert(alertId) {
    priceAlerts = priceAlerts.filter(a => a.id !== alertId);
    localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
    renderAlerts();
    updateAlertCount();
}

function renderAlerts() {
    const list = document.getElementById('alertsList');
    
    if (priceAlerts.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999;">No alerts set. Create one to stay updated!</p>';
    } else {
        list.innerHTML = priceAlerts.map(alert => {
            const crypto = allCryptos.find(c => c.id === alert.coinId);
            const currentPrice = crypto.current_price;
            const isTriggered = (alert.alertType === 'above' && currentPrice >= alert.alertPrice) ||
                              (alert.alertType === 'below' && currentPrice <= alert.alertPrice);
            
            return `
                <div class="alert-item ${isTriggered ? 'triggered' : ''}">
                    <div class="alert-info">
                        <strong>${alert.coinName} (${alert.coinSymbol.toUpperCase()})</strong>
                        <div class="alert-details">
                            Alert: ${alert.alertType === 'above' ? '⬆' : '⬇'} ₹${alert.alertPrice.toFixed(2)}
                            | Current: ₹${currentPrice.toFixed(2)}
                            ${isTriggered ? '<span class="alert-triggered">⚠️ TRIGGERED!</span>' : ''}
                        </div>
                    </div>
                    <button onclick="removeAlert('${alert.id}')" class="btn-delete">Remove</button>
                </div>
            `;
        }).join('');
    }
}

function updateAlertCount() {
    const count = priceAlerts.length;
    const countBadge = document.getElementById('alertCount');
    if (count > 0) {
        countBadge.textContent = count;
        countBadge.style.display = 'flex';
    } else {
        countBadge.style.display = 'none';
    }
}

// ===== MODAL HELPERS =====
function closeAllModals() {
    document.getElementById('portfolioModal').classList.add('hidden');
    document.getElementById('learningModal').classList.add('hidden');
    document.getElementById('alertModal').classList.add('hidden');
    document.getElementById('simulatorModal').classList.add('hidden');
    document.getElementById('modalOverlay').classList.add('hidden');
}

// ===== CHECK ALERTS =====
function checkPriceAlerts() {
    priceAlerts.forEach(alert => {
        const crypto = allCryptos.find(c => c.id === alert.coinId);
        if (!crypto) return;
        
        const isTriggered = (alert.alertType === 'above' && crypto.current_price >= alert.alertPrice) ||
                          (alert.alertType === 'below' && crypto.current_price <= alert.alertPrice);
        
        if (isTriggered) {
            showNotification(
                `${alert.coinName} ${alert.alertType === 'above' ? 'exceeded' : 'dropped below'} ₹${alert.alertPrice}! Current: ₹${crypto.current_price}`
            );
        }
    });
}

// ===== RETURNS SIMULATOR =====
let selectedSimulatorCoins = [];
let currentSimulationPeriod = '3m';

function openReturnsSimulator() {
    selectedSimulatorCoins = userPortfolio.length > 0 ? userPortfolio.map(p => p.id) : [];
    renderSimulatorCoinSelector();
    updateSimulation('3m');
    document.getElementById('simulatorModal').classList.remove('hidden');
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeReturnsSimulator() {
    document.getElementById('simulatorModal').classList.add('hidden');
    document.getElementById('modalOverlay').classList.add('hidden');
}

function renderSimulatorCoinSelector() {
    const container = document.getElementById('simulatorCoinSelector');
    container.innerHTML = allCryptos.slice(0, 20).map(crypto => {
        const isSelected = selectedSimulatorCoins.includes(crypto.id);
        return `
            <label class="coin-checkbox">
                <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSimulatorCoin('${crypto.id}')">
                <span>${crypto.name} (${crypto.symbol.toUpperCase()})</span>
            </label>
        `;
    }).join('');
}

function toggleSimulatorCoin(coinId) {
    const index = selectedSimulatorCoins.indexOf(coinId);
    if (index > -1) {
        selectedSimulatorCoins.splice(index, 1);
    } else {
        selectedSimulatorCoins.push(coinId);
    }
    updateSimulation(currentSimulationPeriod);
}

function updateSimulation(period) {
    currentSimulationPeriod = period;
    
    // Update active button
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('active');
    
    if (selectedSimulatorCoins.length === 0) {
        document.getElementById('bearishReturn').textContent = 'Select coins';
        document.getElementById('neutralReturn').textContent = 'Select coins';
        document.getElementById('bullishReturn').textContent = 'Select coins';
        return;
    }
    
    const selectedCoins = allCryptos.filter(c => selectedSimulatorCoins.includes(c.id));
    const projections = calculateProjections(selectedCoins, period);
    
    // Update scenario cards
    document.getElementById('bearishReturn').textContent = (projections.bearish.returnPercent >= 0 ? '+' : '') + projections.bearish.returnPercent.toFixed(2) + '%';
    document.getElementById('neutralReturn').textContent = (projections.neutral.returnPercent >= 0 ? '+' : '') + projections.neutral.returnPercent.toFixed(2) + '%';
    document.getElementById('bullishReturn').textContent = (projections.bullish.returnPercent >= 0 ? '+' : '') + projections.bullish.returnPercent.toFixed(2) + '%';
    
    document.getElementById('bearishValue').textContent = '₹' + projections.bearish.value.toFixed(0);
    document.getElementById('neutralValue').textContent = '₹' + projections.neutral.value.toFixed(0);
    document.getElementById('bullishValue').textContent = '₹' + projections.bullish.value.toFixed(0);
    
    // Color code the returns
    document.getElementById('bearishReturn').style.color = projections.bearish.returnPercent >= 0 ? '#10b981' : '#ef4444';
    document.getElementById('neutralReturn').style.color = projections.neutral.returnPercent >= 0 ? '#10b981' : '#ef4444';
    document.getElementById('bullishReturn').style.color = projections.bullish.returnPercent >= 0 ? '#10b981' : '#ef4444';
    
    renderSimulationDetails(selectedCoins, projections, period);
}

function calculateProjections(coins, period) {
    // Calculate total current value
    const totalValue = coins.reduce((sum, coin) => sum + coin.current_price * 10, 0); // Assume 10 units per coin for simulation
    
    // Calculate average volatility
    const avgVolatility = coins.reduce((sum, coin) => {
        const change24h = Math.abs(coin.price_change_percentage_24h || 0);
        return sum + change24h;
    }, 0) / coins.length;
    
    // Period multipliers (annualized volatility scaling)
    const periodMultipliers = {
        '1w': 0.06,
        '1m': 0.25,
        '3m': 0.75,
        '6m': 1.5,
        '1y': 3
    };
    
    const multiplier = periodMultipliers[period] || 0.75;
    const projectedVolatility = avgVolatility * multiplier;
    
    // Calculate scenarios with volatility-based estimation
    const scenarios = {
        bearish: {
            multiplier: 1 - (projectedVolatility * 0.5 / 100),
            value: 0,
            returnPercent: 0
        },
        neutral: {
            multiplier: 1 + (projectedVolatility * 0.15 / 100),
            value: 0,
            returnPercent: 0
        },
        bullish: {
            multiplier: 1 + (projectedVolatility * 0.8 / 100),
            value: 0,
            returnPercent: 0
        }
    };
    
    // Calculate projected values
    Object.keys(scenarios).forEach(scenario => {
        scenarios[scenario].value = totalValue * scenarios[scenario].multiplier;
        scenarios[scenario].returnPercent = ((scenarios[scenario].value - totalValue) / totalValue) * 100;
    });
    
    return scenarios;
}

function renderSimulationDetails(coins, projections, period) {
    const chart = document.getElementById('simulationChart');
    const table = document.getElementById('simulationTable');
    
    // Simple bar chart representation
    const maxValue = Math.max(
        projections.bearish.value,
        projections.neutral.value,
        projections.bullish.value
    );
    
    chart.innerHTML = `
        <div class="simulation-bars">
            <div class="bar-group">
                <div class="bar-label">Bearish</div>
                <div class="bar-container">
                    <div class="bar" style="width: ${(projections.bearish.value / maxValue) * 100}%; background: #ef4444;"></div>
                </div>
                <div class="bar-value">₹${projections.bearish.value.toFixed(0)}</div>
            </div>
            <div class="bar-group">
                <div class="bar-label">Neutral</div>
                <div class="bar-container">
                    <div class="bar" style="width: ${(projections.neutral.value / maxValue) * 100}%; background: #f59e0b;"></div>
                </div>
                <div class="bar-value">₹${projections.neutral.value.toFixed(0)}</div>
            </div>
            <div class="bar-group">
                <div class="bar-label">Bullish</div>
                <div class="bar-container">
                    <div class="bar" style="width: ${(projections.bullish.value / maxValue) * 100}%; background: #10b981;"></div>
                </div>
                <div class="bar-value">₹${projections.bullish.value.toFixed(0)}</div>
            </div>
        </div>
    `;
    
    // Coin breakdown table
    table.innerHTML = `
        <div class="coin-breakdown">
            <h4>Coin Breakdown</h4>
            <table class="sim-table">
                <thead>
                    <tr>
                        <th>Coin</th>
                        <th>Current Price</th>
                        <th>24h Change</th>
                        <th>Volatility Impact</th>
                    </tr>
                </thead>
                <tbody>
                    ${coins.map(coin => {
                        const change = coin.price_change_percentage_24h || 0;
                        const isPosChange = change >= 0;
                        return `
                            <tr>
                                <td><strong>${coin.symbol.toUpperCase()}</strong></td>
                                <td>₹${coin.current_price.toFixed(2)}</td>
                                <td style="color: ${isPosChange ? '#10b981' : '#ef4444'};">${isPosChange ? '+' : ''}${change.toFixed(2)}%</td>
                                <td>${(Math.abs(change) * (period === '1w' ? 0.06 : period === '1m' ? 0.25 : period === '3m' ? 0.75 : period === '6m' ? 1.5 : 3)).toFixed(2)}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}
