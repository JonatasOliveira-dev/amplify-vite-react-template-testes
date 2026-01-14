import { a, defineData, type ClientSchema } from "@aws-amplify/backend";

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [
      // ✅ Somente usuários autenticados (Cognito User Pool)
      allow.authenticated(),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // ✅ Default = Cognito User Pool (NÃO usa apiKey)
    defaultAuthorizationMode: "userPool",
  },
});
