import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.cuentai.app",
  appName: "CuentAI",
  webDir: "dist",
  android: { backgroundColor: "#f5f6f8" },
  plugins: { CapacitorHttp: { enabled: true } },
};
export default config;
