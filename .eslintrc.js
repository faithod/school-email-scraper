module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    "jest/globals": true,
  },
  extends: [
    "eslint:recommended",
    "plugin:unicorn/recommended"
  ],
//   parserOptions: {
//     ecmaVersion: 12,
//     sourceType: "module",
//   },
  plugins: ["jest", "unicorn"],
  root: true,
  rules: {
    "no-undef": "error"
  },
};
