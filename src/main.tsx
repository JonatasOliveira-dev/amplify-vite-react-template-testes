import React from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";

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

// ✅ CORRETO: usar o outputs direto (Gen 2)
Amplify.configure(outputs); 

/* ========= TEMA ========= */
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
