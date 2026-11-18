import { defineConfig } from "vite";
export default defineConfig({
  build: { target: "es2022" },
  server: {
    watch: {
      ignored: [
        "**/android/**",
        "**/artifacts/**",
        "**/.gradle-user*/**",
        "**/.tools/**",
        "**/releases/**",
      ],
    },
  },
});
