import React from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";

import "@aws-amplify/ui-react/styles.css";
import {
  Authenticator,
  ThemeProvider,
  createTheme,
  View,
  Image,
} from "@aws-amplify/ui-react";

import App from "./App";
import "./App.css";
import logo from "./assets/logo.png";

/**
 * Config híbrida do Amplify:
 * - DEV: lê ../amplify_outputs.json (sandbox/local)
 * - PROD: lê variáveis VITE_* (Amplify Hosting -> Variáveis de ambiente)
 */
async function configureAmplify() {
  const isProd = import.meta.env.PROD;

  if (!isProd) {
    // DEV: usa o outputs gerado pelo `npx ampx sandbox`
    const outputsModule = await import("../amplify_outputs.json");
    Amplify.configure(outputsModule.default);
    return;
  }

  // PROD: usa env vars do Amplify Console
  const region = import.meta.env.VITE_AWS_REGION as string | undefined;
  const endpoint = import.meta.env.VITE_APPSYNC_ENDPOINT as string | undefined;
  const userPoolId = import.meta.env.VITE_USER_POOL_ID as string | undefined;
  const userPoolClientId = import.meta.env.VITE_USER_POOL_CLIENT_ID as
    | string
    | undefined;

  // Fail fast se estiver faltando algo
  const missing: string[] = [];
  if (!region) missing.push("VITE_AWS_REGION");
  if (!endpoint) missing.push("VITE_APPSYNC_ENDPOINT");
  if (!userPoolId) missing.push("VITE_USER_POOL_ID");
  if (!userPoolClientId) missing.push("VITE_USER_POOL_CLIENT_ID");

  if (missing.length) {
    throw new Error(
      `Faltando variável(is) de ambiente em produção: ${missing.join(
        ", "
      )}. Configure no Amplify Console -> Hospedagem -> Variáveis de ambiente.`
    );
  }

  // ✅ Força tipos após validação (para satisfazer o TypeScript)
  const regionS = region!;
  const endpointS = endpoint!;
  const userPoolIdS = userPoolId!;
  const userPoolClientIdS = userPoolClientId!;

  // ✅ Formato novo (compatível com Amplify Gen2 / aws-amplify atual)
  Amplify.configure({
    API: {
      GraphQL: {
        endpoint: endpointS,
        region: regionS,
        defaultAuthMode: "userPool",
      },
    },
    Auth: {
      Cognito: {
        userPoolId: userPoolIdS,
        userPoolClientId: userPoolClientIdS,
      },
    },
  });
} // ✅ FECHA configureAmplify AQUI

/* ========= TEMA DO LOGIN ========= */
const theme = createTheme({
  name: "aquapower-theme",
  tokens: {
    colors: {
      background: {
        primary: { value: "#071225" },
        secondary: { value: "#0b1730" },
      },
      font: {
        primary: { value: "rgba(255,255,255,0.92)" },
        secondary: { value: "rgba(255,255,255,0.65)" },
      },
      brand: {
        primary: {
          10: "#0b1730",
          80: "#52d1ff",
          90: "#38bdf8",
          100: "#0ea5e9",
        },
      },
    },
    components: {
      button: {
        primary: {
          backgroundColor: { value: "#0ea5e9" },
          color: { value: "#ffffff" },
        },
      },
      tabs: {
        item: {
          _active: {
            color: { value: "#52d1ff" },
          },
        },
      },
    },
  },
});

async function start() {
  await configureAmplify();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <Authenticator
          components={{
            Header() {
              return (
                <View textAlign="center" padding="1.5rem">
                  <Image
                    alt="Aquapower"
                    src={logo}
                    width="120px"
                    margin="0 auto 1rem"
                  />
                </View>
              );
            },
          }}
        >
          {({ signOut }) => <App signOut={signOut} />}
        </Authenticator>
      </ThemeProvider>
    </React.StrictMode>
  );
}

start().catch((err) => {
  console.error("Failed to start app:", err);
  document.body.innerHTML = `<pre style="padding:16px;color:#fff;background:#071225;white-space:pre-wrap;">${String(
    err?.message ?? err
  )}</pre>`;
});
//