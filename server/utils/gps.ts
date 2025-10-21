export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateSpeed(
  lat1: number,
  lon1: number,
  time1: Date,
  lat2: number,
  lon2: number,
  time2: Date
): number {
  const distanceMiles = haversineDistance(lat1, lon1, lat2, lon2);
  const timeDiffHours = (time2.getTime() - time1.getTime()) / (1000 * 60 * 60);
  
  if (timeDiffHours === 0) return 0;
  
  return distanceMiles / timeDiffHours;
}

export function isSignificantMovement(
  distanceMiles: number,
  speedMph: number
): boolean {
  const MIN_DISTANCE_MILES = 0.093; // 150 meters (~490 feet)
  const MIN_SPEED_MPH = 0.5;
  
  return distanceMiles >= MIN_DISTANCE_MILES && speedMph >= MIN_SPEED_MPH;
}
