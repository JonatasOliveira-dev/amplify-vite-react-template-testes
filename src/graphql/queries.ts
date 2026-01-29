// src/graphql/queries.ts

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

export const dadosParqueByPeriod = /* GraphQL */ `
  query DadosParqueByPeriod(
    $device: String!
    $from: Int!
    $to: Int!
    $limit: Int
    $nextToken: String
  ) {
    dadosParqueByPeriod(device: $device, from: $from, to: $to, limit: $limit, nextToken: $nextToken) {
      items {
        timestamp
        registers {
          TEMP
          VOLTAGE
          CURRENT
          FREQUENCY
          POWER
        }
      }
      nextToken
    }
  }
`;