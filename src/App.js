import React, { useState } from 'react';
import { Send, MapPin, Cloud, Compass, Loader2 } from 'lucide-react';

const App = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [placesData, setPlacesData] = useState(null);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState('');

  const geocodePlace = async (placeName) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'TourismAgentSystem/1.0'
        }
      }
    );
    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('Place not found');
    }
    
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name
    };
  };

  const getWeather = async (placeName) => {
    try {
      const location = await geocodePlace(placeName);
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,precipitation_probability&timezone=auto`
      );
      const data = await response.json();
      
      return {
        temperature: data.current.temperature_2m,
        precipitationChance: data.current.precipitation_probability || 0,
        location: placeName
      };
    } catch (err) {
      throw new Error(`Weather data unavailable for ${placeName}`);
    }
  };

  const getPlaces = async (placeName) => {
    try {
      const location = await geocodePlace(placeName);
      
      const query = `
        [out:json][timeout:25];
        (
          node["tourism"="attraction"](around:15000,${location.lat},${location.lon});
          node["tourism"="museum"](around:15000,${location.lat},${location.lon});
          node["historic"](around:15000,${location.lat},${location.lon});
          node["leisure"="park"](around:15000,${location.lat},${location.lon});
        );
        out body 20;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });
      
      const data = await response.json();
      
      const places = data.elements
        .filter(el => el.tags && el.tags.name)
        .map(el => el.tags.name)
        .filter((name, idx, arr) => arr.indexOf(name) === idx)
        .slice(0, 5);
      
      if (places.length === 0) {
        return {
          places: [],
          location: placeName,
          message: 'No major tourist attractions found in database'
        };
      }
      
      return {
        places,
        location: placeName
      };
    } catch (err) {
      throw new Error(`Places data unavailable for ${placeName}`);
    }
  };

  const extractPlaceName = (text) => {
    // Simple extraction: look for common patterns
    const lowerText = text.toLowerCase();
    
    // Remove common phrases
    let cleanText = text
      .replace(/i'm going to /gi, '')
      .replace(/i am going to /gi, '')
      .replace(/going to /gi, '')
      .replace(/visit /gi, '')
      .replace(/trip to /gi, '')
      .replace(/plan my trip/gi, '')
      .replace(/let's plan/gi, '')
      .replace(/what is the temperature/gi, '')
      .replace(/what are the places/gi, '')
      .replace(/can i visit/gi, '')
      .replace(/what is the weather/gi, '')
      .replace(/there/gi, '')
      .replace(/\?/g, '')
      .replace(/,/g, '')
      .trim();
    
    // Get the first word/phrase that looks like a place name
    const words = cleanText.split(' ');
    return words[0] || cleanText;
  };

  const shouldGetWeather = (text) => {
    const lowerText = text.toLowerCase();
    return lowerText.includes('weather') || 
           lowerText.includes('temperature') || 
           lowerText.includes('rain') ||
           lowerText.includes('climate');
  };

  const shouldGetPlaces = (text) => {
    const lowerText = text.toLowerCase();
    return lowerText.includes('place') || 
           lowerText.includes('visit') || 
           lowerText.includes('attraction') ||
           lowerText.includes('trip') ||
           lowerText.includes('plan') ||
           lowerText.includes('see') ||
           lowerText.includes('go to');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setWeatherData(null);
    setPlacesData(null);

    try {
      const placeName = extractPlaceName(input);
      setLocation(placeName);
      
      const needsWeather = shouldGetWeather(input);
      const needsPlaces = shouldGetPlaces(input);
      
      // If neither is explicitly mentioned, get both
      const getWeatherData = needsWeather || (!needsWeather && !needsPlaces);
      const getPlacesData = needsPlaces || (!needsWeather && !needsPlaces);

      const promises = [];
      
      if (getWeatherData) {
        promises.push(
          getWeather(placeName)
            .then(data => setWeatherData(data))
            .catch(err => console.error('Weather error:', err))
        );
      }
      
      if (getPlacesData) {
        promises.push(
          getPlaces(placeName)
            .then(data => setPlacesData(data))
            .catch(err => console.error('Places error:', err))
        );
      }

      await Promise.all(promises);
      
      if (!getWeatherData && !getPlacesData) {
        setError('Please ask about weather or places to visit');
      }
      
    } catch (err) {
      setError(err.message || "I don't know if this place exists. Please try another location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Compass className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Tourism AI Agent</h1>
            </div>
            <p className="text-blue-100">Your intelligent trip planning assistant</p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-800">Weather Agent</h3>
              </div>
              <p className="text-sm text-gray-600">Real-time weather data</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-gray-800">Places Agent</h3>
              </div>
              <p className="text-sm text-gray-600">Tourist attractions finder</p>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Where do you want to go?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !loading && input.trim()) {
                        handleSubmit(e);
                      }
                    }}
                    placeholder="e.g., I'm going to Bangalore, let's plan my trip"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !input.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Planning...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Plan Trip
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {(weatherData || placesData || error) && (
              <div className="mt-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}
                
                {weatherData && (
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-blue-600" />
                      Weather in {location}
                    </h3>
                    <div className="text-gray-800">
                      <p className="text-2xl font-bold text-blue-600 mb-2">
                        {weatherData.temperature}°C
                      </p>
                      <p className="text-sm">
                        Precipitation chance: <span className="font-semibold">{weatherData.precipitationChance}%</span>
                      </p>
                    </div>
                  </div>
                )}

                {placesData && placesData.places && placesData.places.length > 0 && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-indigo-600" />
                      Places to Visit in {location}
                    </h3>
                    <ul className="space-y-2">
                      {placesData.places.map((place, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-800">
                          <span className="text-indigo-600 font-bold mt-1">•</span>
                          <span>{place}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {placesData && placesData.places && placesData.places.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">No major tourist attractions found in the database for {location}.</p>
                  </div>
                )}
              </div>
            )}

            {!weatherData && !placesData && !error && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-medium text-gray-700">Try these examples:</p>
                <div className="space-y-2">
                  {[
                    "I'm going to Bangalore, let's plan my trip",
                    "I'm going to Paris, what is the temperature there?",
                    "I'm going to Tokyo, what is the weather and what places can I visit?"
                  ].map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(example)}
                      className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors border border-gray-200"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Powered by Open-Meteo and OpenStreetMap APIs</p>
        </div>
      </div>
    </div>
  );
};

export default App;