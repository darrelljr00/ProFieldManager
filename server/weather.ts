interface WeatherCondition {
  text: string;
  icon: string;
  code: number;
}

interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
  };
  current: {
    temp_c: number;
    temp_f: number;
    condition: WeatherCondition;
    humidity: number;
    precip_mm: number;
    precip_in: number;
    feelslike_c: number;
    feelslike_f: number;
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        maxtemp_f: number;
        mintemp_c: number;
        mintemp_f: number;
        avgtemp_c: number;
        avgtemp_f: number;
        condition: WeatherCondition;
        maxwind_mph: number;
        totalprecip_mm: number;
        totalprecip_in: number;
        daily_chance_of_rain: number;
        daily_chance_of_snow: number;
      };
      hour: Array<{
        time: string;
        temp_c: number;
        temp_f: number;
        condition: WeatherCondition;
        chance_of_rain: number;
        chance_of_snow: number;
        precip_mm: number;
        precip_in: number;
      }>;
    }>;
  };
}

export class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.weatherapi.com/v1';

  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ WEATHER_API_KEY environment variable not set - weather features will be disabled');
    }
  }
  
  private ensureApiKey() {
    if (!this.apiKey) {
      throw new Error('WEATHER_API_KEY environment variable is required for weather features');
    }
  }

  async getCurrentWeather(location: string): Promise<WeatherData> {
    this.ensureApiKey();
    const url = `${this.baseUrl}/current.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&aqi=no`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async getForecast(location: string, days: number = 3): Promise<WeatherData> {
    this.ensureApiKey();
    // Clean and validate location string
    const cleanLocation = location.trim().replace(/[^\w\s,.-]/g, '');
    if (!cleanLocation || cleanLocation.length < 2) {
      throw new Error(`Invalid location format: ${location}`);
    }
    
    const url = `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(cleanLocation)}&days=${days}&aqi=no&alerts=no`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Weather API error for location "${cleanLocation}": ${response.status} ${response.statusText} - ${errorData}`);
    }
    
    return response.json();
  }

  async getWeatherForDate(location: string, date: string): Promise<WeatherData> {
    this.ensureApiKey();
    // For future dates (up to 14 days), use forecast API
    const targetDate = new Date(date);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      // Past date, use history API
      const url = `${this.baseUrl}/history.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&dt=${date}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    } else if (diffDays <= 14) {
      // Future date within forecast range
      const forecast = await this.getForecast(location, Math.min(diffDays + 1, 14));
      return forecast;
    } else {
      throw new Error('Weather data not available for dates more than 14 days in the future');
    }
  }

  isRainyCondition(condition: WeatherCondition): boolean {
    const rainyConditions = [
      'Light rain', 'Moderate rain', 'Heavy rain', 'Light rain shower', 
      'Moderate or heavy rain shower', 'Torrential rain shower', 'Rain',
      'Patchy rain possible', 'Patchy light rain', 'Light drizzle',
      'Freezing drizzle', 'Heavy freezing drizzle', 'Patchy light drizzle',
      'Light freezing rain', 'Moderate or heavy freezing rain',
      'Light sleet', 'Moderate or heavy sleet', 'Patchy freezing drizzle possible'
    ];
    
    return rainyConditions.some(rainy => 
      condition.text.toLowerCase().includes(rainy.toLowerCase())
    );
  }

  getRainChanceForDate(weatherData: WeatherData, targetDate: string): number {
    if (!weatherData.forecast) return 0;

    const forecastDay = weatherData.forecast.forecastday.find(
      day => day.date === targetDate
    );

    return forecastDay?.day.daily_chance_of_rain || 0;
  }

  getWeatherSummary(weatherData: WeatherData, targetDate?: string): {
    condition: string;
    temperature: number;
    rainChance: number;
    isRainy: boolean;
    precipitationMm: number;
  } {
    if (targetDate && weatherData.forecast) {
      const forecastDay = weatherData.forecast.forecastday.find(
        day => day.date === targetDate
      );
      
      if (forecastDay) {
        return {
          condition: forecastDay.day.condition.text,
          temperature: forecastDay.day.avgtemp_c,
          rainChance: forecastDay.day.daily_chance_of_rain,
          isRainy: this.isRainyCondition(forecastDay.day.condition),
          precipitationMm: forecastDay.day.totalprecip_mm
        };
      }
    }

    // Fall back to current weather
    return {
      condition: weatherData.current.condition.text,
      temperature: weatherData.current.temp_c,
      rainChance: 0, // Current weather doesn't have rain chance
      isRainy: this.isRainyCondition(weatherData.current.condition),
      precipitationMm: weatherData.current.precip_mm
    };
  }
}

export const weatherService = new WeatherService();