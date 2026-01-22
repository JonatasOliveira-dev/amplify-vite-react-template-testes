export const latestDadosParque = /* GraphQL */ `
  query LatestDadosParque($device: String!) {
    latestDadosParque(device: $device) {
      device
      timestamp
      registers {
        TEMP
        VOLTAGE
        CURRENT
        FREQUENCY
        POWER
      }
    }
  }
`;
