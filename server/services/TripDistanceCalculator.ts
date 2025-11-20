import { Client, TravelMode } from '@googlemaps/google-maps-services-js';

interface GPSPoint {
  lat: number;
  lng: number;
  timestamp: Date;
}

export class TripDistanceCalculator {
  private client: Client;
  private apiKey: string;
  private readonly MAX_WAYPOINTS = 23; // Google Maps allows 25 total (origin + 23 waypoints + destination)

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new Client({});
  }

  async calculateTripDistanceFromPath(
    gpsPoints: GPSPoint[]
  ): Promise<{ miles: number; meters: number } | null> {
    if (gpsPoints.length < 2) {
      console.warn('Need at least 2 GPS points to calculate trip distance');
      return null;
    }

    try {
      const origin = `${gpsPoints[0].lat},${gpsPoints[0].lng}`;
      const destination = `${gpsPoints[gpsPoints.length - 1].lat},${gpsPoints[gpsPoints.length - 1].lng}`;
      
      const middlePoints = gpsPoints.slice(1, -1);
      
      let waypoints: string[] = [];
      if (middlePoints.length > 0) {
        const step = Math.ceil(middlePoints.length / this.MAX_WAYPOINTS);
        waypoints = middlePoints
          .filter((_, index) => index % step === 0)
          .slice(0, this.MAX_WAYPOINTS)
          .map(point => `${point.lat},${point.lng}`);
      }

      const response = await this.client.directions({
        params: {
          origin,
          destination,
          waypoints: waypoints.length > 0 ? waypoints : undefined,
          mode: TravelMode.driving,
          key: this.apiKey,
        },
      });

      if (!response.data) {
        console.error('Google Maps API returned no data');
        return null;
      }

      if (response.data.status !== 'OK') {
        console.error(`Google Maps API error: ${response.data.status}`, response.data.error_message || '');
        return null;
      }

      if (!response.data.routes || response.data.routes.length === 0) {
        console.warn('No route found for GPS path');
        return null;
      }

      const route = response.data.routes[0];
      
      if (!route.legs || route.legs.length === 0) {
        console.warn('Route has no legs');
        return null;
      }

      const totalDistance = route.legs.reduce((sum, leg) => {
        return sum + (leg.distance?.value || 0);
      }, 0);

      return {
        meters: totalDistance,
        miles: totalDistance / 1609.34,
      };
    } catch (error: any) {
      if (error.response) {
        console.error('Google Maps API HTTP error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.request) {
        console.error('Google Maps API request failed (no response):', error.message);
      } else {
        console.error('Error setting up Google Maps request:', error.message);
      }
      return null;
    }
  }

  async calculateSimpleDistance(
    startLat: string,
    startLng: string,
    endLat: string,
    endLng: string
  ): Promise<number | null> {
    const result = await this.calculateTripDistanceFromPath([
      { lat: parseFloat(startLat), lng: parseFloat(startLng), timestamp: new Date() },
      { lat: parseFloat(endLat), lng: parseFloat(endLng), timestamp: new Date() }
    ]);

    return result ? result.miles : null;
  }
}
