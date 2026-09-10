import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", ".next/**", "extension/node_modules/**"],
  },
  {
    // Next.js app (server + client components) and shared lib/tests — ESM,
    // runs in both Node (server components, API routes) and the browser
    // (client components), so both global sets apply.
    files: ["app/**/*.js", "components/**/*.js", "lib/**/*.js", "tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-const-assign": "warn",
      "no-this-before-super": "warn",
      "no-undef": "warn",
      "no-unreachable": "warn",
      "no-unused-vars": "warn",
      "constructor-super": "warn",
      "valid-typeof": "warn",
    },
  },
  {
    // VS Code extension — plain CommonJS, runs under Node in the extension
    // host (no "type": "module" in extension/package.json).
    files: ["extension/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
      ecmaVersion: 2022,
      sourceType: "commonjs",
    },
    rules: {
      "no-const-assign": "warn",
      "no-this-before-super": "warn",
      "no-undef": "warn",
      "no-unreachable": "warn",
      "no-unused-vars": "warn",
      "constructor-super": "warn",
      "valid-typeof": "warn",
    },
  },
];