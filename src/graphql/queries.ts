export const latestReadings = `
  query LatestReadings($deviceId: String!, $limit: Int) {
    latestReadings(deviceId: $deviceId, limit: $limit) {
      deviceId
      timestamp_ms
      timestamp_iso
      temperatura
      humidade
    }
  }
`;
