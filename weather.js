const API_KEY = '0b5815f56dce418b39afd375d2e0a9a2', body = document.getElementById('body'), form = document.getElementById('weatherForm'), cityInput = document.getElementById('cityInput'), locationBtn = document.getElementById('locationBtn'), aiInsightBtn = document.getElementById('aiInsightBtn'), searchText = document.getElementById('searchText'), loadingSpinner = document.getElementById('loadingSpinner'), errorMessage = document.getElementById('errorMessage'), errorText = document.getElementById('errorText'), currentWeather = document.getElementById('currentWeather'), timeline = document.getElementById('timeline'), aiChatbot = document.getElementById('aiChatbot'), closeChatbot = document.getElementById('closeChatbot'), chatMessages = document.getElementById('chatMessages'), chatInput = document.getElementById('chatInput'), sendChatBtn = document.getElementById('sendChatBtn'), searchHistory = document.getElementById('searchHistory'), historyList = document.getElementById('historyList'), clearHistory = document.getElementById('clearHistory');

let currentWeatherData = null, searchHistoryData = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
let weatherMap = null;
let weatherLayers = {};
const weatherIcons = { '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️', '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️', '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️', '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️', '50d': '🌫️', '50n': '🌫️' };
const weatherBackgrounds = { 'clear': 'sunny', 'clouds': 'cloudy', 'rain': 'rainy', 'drizzle': 'rainy', 'thunderstorm': 'rainy', 'snow': 'snowy', 'mist': 'cloudy', 'fog': 'cloudy', 'haze': 'cloudy' };

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return;

    showLoading(true);
    hideError();

    try {
        await getWeatherData(city);
    } catch (error) {
        showError('Unable to fetch weather data. Please check the city name and try again.');
    } finally {
        showLoading(false);
    }
});

locationBtn.addEventListener('click', async () => {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by this browser.');
        return;
    }

    showLoading(true);
    hideError();

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                await getWeatherDataByCoords(latitude, longitude);
            } catch (error) {
                showError('Unable to fetch weather data for your location.');
            } finally {
                showLoading(false);
            }
        },
        (error) => {
            showLoading(false);
            showError('Unable to get your location. Please allow location access or enter a city manually.');
        }
    );
});

aiInsightBtn.addEventListener('click', () => {
    aiChatbot.classList.remove('hidden');
    if (currentWeatherData) {
        addChatMessage('🤖', `I can see you're checking the weather in ${currentWeatherData.current.name}! What would you like to know about the weather conditions?`, 'bot');
    }
});

closeChatbot.addEventListener('click', () => {
    aiChatbot.classList.add('hidden');
});

sendChatBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});

// Search history event listeners
cityInput.addEventListener('focus', () => {
    if (searchHistoryData.length > 0) {
        displaySearchHistory();
        searchHistory.classList.remove('hidden');
    }
});

cityInput.addEventListener('blur', (e) => {
    // Delay hiding to allow clicking on history items
    setTimeout(() => {
        if (!searchHistory.contains(document.activeElement)) {
            searchHistory.classList.add('hidden');
        }
    }, 200);
});

cityInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length > 0 && searchHistoryData.length > 0) {
        const filtered = searchHistoryData.filter(item =>
            item.city.toLowerCase().includes(query)
        );
        displaySearchHistory(filtered);
        searchHistory.classList.remove('hidden');
    } else if (query.length === 0 && searchHistoryData.length > 0) {
        displaySearchHistory();
        searchHistory.classList.remove('hidden');
    } else {
        searchHistory.classList.add('hidden');
    }
});

clearHistory.addEventListener('click', () => {
    searchHistoryData = [];
    localStorage.removeItem('weatherSearchHistory');
    searchHistory.classList.add('hidden');
});

// Click outside to close history
document.addEventListener('click', (e) => {
    if (!cityInput.contains(e.target) && !searchHistory.contains(e.target)) {
        searchHistory.classList.add('hidden');
    }
});

function showLoading(loading) {
    searchText.style.display = loading ? 'none' : 'block';
    loadingSpinner.style.display = loading ? 'block' : 'none';
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    currentWeather.classList.add('hidden');
    timeline.classList.add('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function addToSearchHistory(cityName, country) {
    const historyItem = {
        city: cityName,
        country: country || '',
        timestamp: new Date().toISOString(),
        displayName: country ? `${cityName}, ${country}` : cityName
    };

    // Remove if already exists
    searchHistoryData = searchHistoryData.filter(item =>
        item.city.toLowerCase() !== cityName.toLowerCase()
    );

    // Add to beginning
    searchHistoryData.unshift(historyItem);

    // Keep only last 10 searches
    searchHistoryData = searchHistoryData.slice(0, 10);

    // Save to localStorage
    localStorage.setItem('weatherSearchHistory', JSON.stringify(searchHistoryData));
}

function displaySearchHistory(filteredData = null) {
    const dataToShow = filteredData || searchHistoryData;
    historyList.innerHTML = '';

    if (dataToShow.length === 0) {
        historyList.innerHTML = '<p class="text-white/60 text-sm text-center py-2">No recent searches</p>';
        return;
    }

    dataToShow.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-200 group';

        const timeAgo = getTimeAgo(new Date(item.timestamp));

        historyItem.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-white/60">📍</span>
                        <div>
                            <div class="text-white font-medium">${item.displayName}</div>
                            <div class="text-white/50 text-xs">${timeAgo}</div>
                        </div>
                    </div>
                    <button class="delete-history opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all duration-200" data-city="${item.city}">
                        ✕
                    </button>
                `;

        // Click to search
        historyItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-history')) {
                cityInput.value = item.city;
                searchHistory.classList.add('hidden');
                getWeatherData(item.city);
            }
        });

        // Delete individual item
        const deleteBtn = historyItem.querySelector('.delete-history');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            searchHistoryData = searchHistoryData.filter(historyItem =>
                historyItem.city.toLowerCase() !== item.city.toLowerCase()
            );
            localStorage.setItem('weatherSearchHistory', JSON.stringify(searchHistoryData));
            displaySearchHistory();

            if (searchHistoryData.length === 0) {
                searchHistory.classList.add('hidden');
            }
        });

        historyList.appendChild(historyItem);
    });
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

async function getWeatherData(city) {
    try {
        // Get current weather
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
        );

        if (!currentResponse.ok) {
            throw new Error('City not found');
        }

        const currentData = await currentResponse.json();

        // Get 5-day forecast
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
        );

        const forecastData = await forecastResponse.json();

        currentWeatherData = {
            current: currentData,
            forecast: processForecastData(forecastData.list)
        };

        displayCurrentWeather(currentData);
        displayTimeline(currentWeatherData.forecast);
        updateBackground(currentData.weather[0].main.toLowerCase());

        // Add to search history
        addToSearchHistory(currentData.name, currentData.sys.country);

    } catch (error) {
        throw new Error('Unable to fetch weather data');
    }
}

async function getWeatherDataByCoords(lat, lon) {
    try {
        // Get current weather by coordinates
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );

        const currentData = await currentResponse.json();

        // Get 5-day forecast by coordinates
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );

        const forecastData = await forecastResponse.json();

        currentWeatherData = {
            current: currentData,
            forecast: processForecastData(forecastData.list)
        };

        cityInput.value = currentData.name;
        displayCurrentWeather(currentData);
        displayTimeline(currentWeatherData.forecast);
        updateBackground(currentData.weather[0].main.toLowerCase());

        // Add to search history
        addToSearchHistory(currentData.name, currentData.sys.country);

    } catch (error) {
        throw new Error('Unable to fetch weather data for your location');
    }
}

function processForecastData(forecastList) {
    // Group forecast data by day and get daily min/max temperatures
    const dailyData = {};

    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();

        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                dt: item.dt,
                temps: [],
                weather: item.weather[0],
                date: date
            };
        }

        dailyData[dateKey].temps.push(item.main.temp);
    });

    // Convert to array and calculate min/max for each day
    const processedForecast = Object.values(dailyData).map(day => ({
        dt: day.dt,
        main: {
            temp_max: Math.max(...day.temps),
            temp_min: Math.min(...day.temps)
        },
        weather: [day.weather]
    }));

    // Take only first 5 days (API limitation)
    return processedForecast.slice(0, 5);
}

function generateHistoricalData() {
    // Generate mock historical data for past 3 days
    const historicalData = [];
    const today = new Date();

    for (let i = 3; i >= 1; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const weatherTypes = ['Clear', 'Clouds', 'Rain', 'Snow'];
        const icons = ['01d', '02d', '09d', '13d'];
        const randomIndex = Math.floor(Math.random() * weatherTypes.length);

        historicalData.push({
            dt: date.getTime() / 1000,
            main: {
                temp_max: Math.floor(Math.random() * 15) + 15,
                temp_min: Math.floor(Math.random() * 10) + 5
            },
            weather: [{
                main: weatherTypes[randomIndex],
                icon: icons[randomIndex]
            }],
            isHistorical: true
        });
    }

    return historicalData;
}

function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    addChatMessage('👤', message, 'user');
    chatInput.value = '';

    // Simulate AI response
    setTimeout(() => {
        const response = generateAIResponse(message);
        addChatMessage('🤖', response, 'bot');
    }, 1000);
}

function addChatMessage(icon, message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex items-start gap-3 ${type === 'user' ? 'justify-end' : ''}`;

    const messageContent = `
                <div class="${type === 'user' ? 'order-2' : ''}">
                    <div class="text-2xl">${icon}</div>
                </div>
                <div class="bg-white/${type === 'user' ? '20' : '10'} rounded-2xl p-4 max-w-xs ${type === 'user' ? 'order-1' : ''}">
                    <p class="text-white/90">${message}</p>
                </div>
            `;

    messageDiv.innerHTML = messageContent;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function generateAIResponse(userMessage) {
    const message = userMessage.toLowerCase();

    if (!currentWeatherData) {
        return "I'd love to help with weather information! Please search for a location first so I can provide accurate weather insights.";
    }

    const { current } = currentWeatherData;
    const temp = Math.round(current.main.temp);
    const condition = current.weather[0].main.toLowerCase();
    const humidity = current.main.humidity;
    const windSpeed = current.wind.speed;

    // Weather condition responses
    if (message.includes('rain') || message.includes('chance')) {
        let rainChance = 0;
        if (condition.includes('rain')) rainChance = 80;
        else if (condition.includes('drizzle')) rainChance = 60;
        else if (condition.includes('thunderstorm')) rainChance = 90;
        else if (condition.includes('clouds')) rainChance = 20;
        else rainChance = 5;
        return `There's a ${rainChance}% chance of rain in ${current.name}. ${rainChance > 50 ? "I'd recommend bringing an umbrella! ☔" : "Looks like you can leave the umbrella at home! ☀️"}`;
    }

    if (message.includes('temperature') || message.includes('hot') || message.includes('cold')) {
        if (temp < 10) {
            return `It's quite chilly at ${temp}°C in ${current.name}! I'd recommend wearing warm layers and maybe a hot drink to keep cozy. 🧥☕`;
        } else if (temp > 25) {
            return `It's warm at ${temp}°C in ${current.name}! Perfect weather for outdoor activities. Stay hydrated and consider sunscreen! ☀️💧`;
        } else {
            return `The temperature is a pleasant ${temp}°C in ${current.name}. Great weather for most outdoor activities! 🌤️`;
        }
    }

    if (message.includes('humidity')) {
        if (humidity > 70) {
            return `Humidity is quite high at ${humidity}% in ${current.name}. You might feel warmer than the actual temperature. Wear breathable fabrics! 💧`;
        } else {
            return `Humidity is comfortable at ${humidity}% in ${current.name}. Perfect conditions for outdoor activities! 🌬️`;
        }
    }

    if (message.includes('wind')) {
        if (windSpeed > 8) {
            return `It's quite windy with speeds of ${windSpeed} m/s in ${current.name}. Be careful with loose items and consider the wind chill! 💨`;
        } else {
            return `Wind is gentle at ${windSpeed} m/s in ${current.name}. Perfect for outdoor activities! 🍃`;
        }
    }

    if (message.includes('clothes') || message.includes('wear') || message.includes('outfit')) {
        let clothing = [];
        if (temp < 5) clothing.push('heavy coat', 'warm layers', 'gloves', 'hat');
        else if (temp < 15) clothing.push('jacket', 'long pants', 'closed shoes');
        else if (temp < 25) clothing.push('light sweater', 'comfortable clothes');
        else clothing.push('light clothing', 'shorts', 't-shirt', 'sunhat');

        if (condition.includes('rain')) clothing.push('umbrella', 'waterproof jacket');

        return `For ${temp}°C weather in ${current.name}, I'd suggest: ${clothing.join(', ')}. ${condition.includes('rain') ? 'Also bring rain protection! ☔' : ''}`;
    }

    if (message.includes('activity') || message.includes('do') || message.includes('plan')) {
        const activities = getActivityRecommendations(temp, condition, windSpeed);
        return `Based on the current weather in ${current.name} (${temp}°C, ${condition}), here are some great activities: ${activities.join(', ')}! 🎯`;
    }

    // Default responses
    const responses = [
        `The weather in ${current.name} is ${temp}°C with ${condition} conditions. How can I help you plan your day?`,
        `Currently it's ${current.weather[0].description} in ${current.name}. What would you like to know about the weather?`,
        `I can help you with weather information for ${current.name}! Ask me about temperature, precipitation, clothing recommendations, or activities.`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
}

function getActivityRecommendations(temp, condition, windSpeed) {
    const activities = [];

    if (temp >= 20 && temp <= 28 && !condition.includes('rain') && windSpeed < 8) {
        activities.push('hiking', 'picnicking', 'outdoor sports');
    }

    if (temp >= 15 && temp <= 25 && condition.includes('clear')) {
        activities.push('photography', 'sightseeing', 'cycling');
    }

    if (condition.includes('rain')) {
        activities.push('reading indoors', 'visiting museums', 'cooking');
    }

    if (condition.includes('snow')) {
        activities.push('skiing', 'snowboarding', 'building snowmen');
    }

    if (temp > 30) {
        activities.push('swimming', 'indoor shopping', 'early morning walks');
    }

    return activities;
}

function displayAIInsights(insights) {
    aiContent.innerHTML = insights.map(insight =>
        `<div class="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">${insight}</div>`
    ).join('');

    aiInsights.classList.remove('hidden');
}

function displayCurrentWeather(data) {
    document.getElementById('cityName').textContent = data.name;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    document.getElementById('weatherIcon').textContent = weatherIcons[data.weather[0].icon] || '☀️';
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
    document.getElementById('description').textContent = data.weather[0].description;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${data.wind.speed} m/s`;

    // Display rain chance (calculate from weather conditions)
    let rainChance = 0;
    const weatherMain = data.weather[0].main.toLowerCase();
    if (weatherMain.includes('rain')) rainChance = 80;
    else if (weatherMain.includes('drizzle')) rainChance = 60;
    else if (weatherMain.includes('thunderstorm')) rainChance = 90;
    else if (weatherMain.includes('clouds')) rainChance = 20;
    else rainChance = 5;
    document.getElementById('rainChance').textContent = `${rainChance}%`;

    document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}°C`;

    // Display sunrise and sunset times
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    document.getElementById('sunrise').textContent = sunrise.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    document.getElementById('sunset').textContent = sunset.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    currentWeather.classList.remove('hidden');
}

function displayTimeline(forecastData) {
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';

    // Generate historical data and combine with forecast
    const historicalData = generateHistoricalData();
    const today = new Date();

    // Add today's data
    const todayData = {
        dt: today.getTime() / 1000,
        main: {
            temp_max: currentWeatherData ? Math.round(currentWeatherData.current.main.temp) : 20,
            temp_min: currentWeatherData ? Math.round(currentWeatherData.current.main.temp - 5) : 15
        },
        weather: [{
            main: currentWeatherData ? currentWeatherData.current.weather[0].main : 'Clear',
            icon: currentWeatherData ? currentWeatherData.current.weather[0].icon : '01d'
        }],
        isToday: true
    };

    // Combine all data: historical + today + forecast (first 3 days)
    const allData = [...historicalData, todayData, ...forecastData.slice(0, 3)];

    allData.forEach((day, index) => {
        const date = new Date(day.dt * 1000);
        const isToday = day.isToday;
        const isHistorical = day.isHistorical;

        const dayCard = document.createElement('div');
        dayCard.className = `metric-card timeline-card rounded-2xl p-6 text-center min-w-[140px] transition-all duration-500 hover:scale-110 ${isToday ? 'ring-2 ring-white/60 bg-white/20' : ''} ${isHistorical ? 'opacity-70' : ''}`;

        let dayName;
        if (isToday) {
            dayName = 'Today';
        } else if (isHistorical) {
            const daysAgo = Math.ceil((today - date) / (1000 * 60 * 60 * 24));
            dayName = `${daysAgo}d ago`;
        } else {
            dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        }

        const weatherIcon = weatherIcons[day.weather[0].icon] || '☀️';

        dayCard.innerHTML = `
                    <div class="text-white/90 text-lg font-bold uppercase tracking-wider mb-4">
                        ${dayName}
                    </div>
                    <div class="text-7xl mb-6 ${isHistorical ? '' : 'pulse-icon'}">${weatherIcon}</div>
                    <div class="text-white text-3xl font-black mb-2">${Math.round(day.main.temp_max)}°</div>
                    <div class="text-white/70 text-xl font-medium mb-3">${Math.round(day.main.temp_min)}°</div>
                    <div class="text-white/60 text-base capitalize font-medium">${day.weather[0].main}</div>
                    ${isHistorical ? '<div class="text-white/40 text-base mt-2">Historical</div>' : ''}
                `;

        container.appendChild(dayCard);
    });

    timeline.classList.remove('hidden');
}

function updateBackground(weatherType) {
    // Remove all weather background classes
    Object.values(weatherBackgrounds).forEach(bg => {
        body.classList.remove(bg);
    });

    // Add appropriate background class
    const bgClass = weatherBackgrounds[weatherType] || 'default-bg';
    body.classList.add(bgClass);
}

// Map Initialization and Functions
function initWeatherMap() {
    if (weatherMap) return;

    weatherMap = L.map('weatherMap', {
        preferCanvas: true,
        attributionControl: false
    }).setView([51.505, -0.09], 2); // Default to London

    // Base tile layer (OpenStreetMap)
    const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(weatherMap);

    // Weather overlay layers
    const apiKey = API_KEY;
    const layerUrls = {
        temp: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`,
        precip: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`,
        wind: `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}`,
        clouds: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`
    };

    Object.keys(layerUrls).forEach(key => {
        weatherLayers[key] = L.tileLayer(layerUrls[key], {
            opacity: 0.6,
            attribution: ''
        });
    });

    // Add temperature layer by default
    weatherLayers.temp.addTo(weatherMap);

    // Handle map clicks to get weather at coordinates
    weatherMap.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        await getWeatherDataByCoords(lat, lng);

        // Show map info panel
        document.getElementById('mapClickInfo').classList.remove('hidden');
        document.getElementById('mapWeatherContent').innerHTML = `
            <div class="text-center col-span-2">
                <div class="text-2xl mb-2">${weatherIcons[currentWeatherData.current.weather[0].icon] || '☀️'}</div>
                <div class="text-white text-xl font-bold">${Math.round(currentWeatherData.current.main.temp)}°C</div>
                <div class="text-white/80">${currentWeatherData.current.name}, ${currentWeatherData.current.sys.country}</div>
                <div class="text-white/60">${currentWeatherData.current.weather[0].description}</div>
            </div>
            <div class="text-white text-center">
                <div class="mb-1">🌡️ Feels Like: ${Math.round(currentWeatherData.current.main.feels_like)}°C</div>
                <div class="mb-1">💧 Humidity: ${currentWeatherData.current.main.humidity}%</div>
                <div class="mb-1">💨 Wind: ${currentWeatherData.current.wind.speed} m/s</div>
                <div class="mb-1">👁️ Visibility: ${(currentWeatherData.current.visibility || 10000) / 1000} km</div>
                <div class="mb-1">🌅 Sunrise: ${new Date(currentWeatherData.current.sys.sunrise * 1000).toLocaleTimeString()}</div>
                <div class="mb-1">🌇 Sunset: ${new Date(currentWeatherData.current.sys.sunset * 1000).toLocaleTimeString()}</div>
            </div>
        `;

        // Center map on clicked location
        weatherMap.setView([lat, lng], 10);

        // Switch to weather tab to show details
        document.getElementById('tabWeather').click();
    });
}

function showWeatherLayer(layerName) {
    // Hide all layers
    Object.values(weatherLayers).forEach(layer => {
        if (weatherMap) layer.remove();
    });

    // Show selected layer
    if (layerName && weatherLayers[layerName] && weatherMap) {
        weatherLayers[layerName].addTo(weatherMap);

        // Update active button state
        document.querySelectorAll('.layer-btn').forEach(btn => {
            btn.classList.toggle('bg-white/30', btn.dataset.layer === layerName);
            btn.classList.toggle('bg-white/20', btn.dataset.layer !== layerName);
        });

        // Hide the off button when a layer is active
        document.getElementById('layerOff').classList.remove('bg-red-500/30');
        document.getElementById('layerOff').classList.add('bg-white/20');
    } else {
        // Show off button when no layer
        document.getElementById('layerOff').classList.add('bg-red-500/30');
        document.getElementById('layerOff').classList.remove('bg-white/20');
    }
}

// Tab switching functions
function setupTabNavigation() {
    document.getElementById('tabMap').addEventListener('click', () => {
        document.getElementById('tabMap').classList.add('bg-white/20', 'text-white');
        document.getElementById('tabMap').classList.remove('bg-white/10', 'text-white/70');
        document.getElementById('tabWeather').classList.add('bg-white/10', 'text-white/70');
        document.getElementById('tabWeather').classList.remove('bg-white/20', 'text-white');

        document.getElementById('mapNav').classList.remove('hidden');
        document.getElementById('mapSection').classList.remove('hidden');
        document.getElementById('layerControls').classList.remove('hidden');

        // Initialize map if not already done
        if (!weatherMap) initWeatherMap();

        // Hide other sections
        document.getElementById('currentWeather').classList.add('hidden');
        document.getElementById('timeline').classList.add('hidden');
        document.getElementById('aiChatbot').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
    });

    document.getElementById('tabWeather').addEventListener('click', () => {
        document.getElementById('tabWeather').classList.add('bg-white/20', 'text-white');
        document.getElementById('tabWeather').classList.remove('bg-white/10', 'text-white/70');
        document.getElementById('tabMap').classList.add('bg-white/10', 'text-white/70');
        document.getElementById('tabMap').classList.remove('bg-white/20', 'text-white');

        document.getElementById('mapNav').classList.add('hidden');
        document.getElementById('mapSection').classList.add('hidden');
        document.getElementById('layerControls').classList.add('hidden');

        // Show weather sections
        document.getElementById('currentWeather').classList.remove('hidden');
        document.getElementById('timeline').classList.remove('hidden');
        document.getElementById('errorMessage').classList.remove('hidden');

        // Hide map click info when switching tabs
        document.getElementById('mapClickInfo').classList.add('hidden');
    });

    document.getElementById('closeMapInfo').addEventListener('click', () => {
        document.getElementById('mapClickInfo').classList.add('hidden');
    });

    // Layer toggle buttons
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const layer = btn.dataset.layer;
            showWeatherLayer(layer);
        });
    });

    document.getElementById('layerOff').addEventListener('click', () => {
        showWeatherLayer(null);
    });
}

// Auto-detect user location on page load
window.addEventListener('load', () => {
    // Setup tab navigation
    setupTabNavigation();

    // Initialize map in background (will be positioned once loaded)
    initWeatherMap();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    await getWeatherDataByCoords(latitude, longitude);
                } catch (error) {
                    // Fallback to a default city if location fails
                    cityInput.value = 'London';
                    getWeatherData('London');
                }
            },
            () => {
                // User denied location or error occurred, use default
                cityInput.value = 'London';
                getWeatherData('London');
            }
        );
    } else {
        // Geolocation not supported, use default
        cityInput.value = 'London';
        getWeatherData('London');
    }
});


(function () { function c() { var b = a.contentDocument || a.contentWindow.document; if (b) { var d = b.createElement('script'); d.innerHTML = "window.__CF$cv$params={r:'98ef158220b759cc',t:'MTc2MDUyODg3MS4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);"; b.getElementsByTagName('head')[0].appendChild(d) } } if (document.body) { var a = document.createElement('iframe'); a.height = 1; a.width = 1; a.style.position = 'absolute'; a.style.top = 0; a.style.left = 0; a.style.border = 'none'; a.style.visibility = 'hidden'; document.body.appendChild(a); if ('loading' !== document.readyState) c(); else if (window.addEventListener) document.addEventListener('DOMContentLoaded', c); else { var e = document.onreadystatechange || function () { }; document.onreadystatechange = function (b) { e(b); 'loading' !== document.readyState && (document.onreadystatechange = e, c()) } } } })();