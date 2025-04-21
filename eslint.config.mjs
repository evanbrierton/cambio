import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import antfu from "@antfu/eslint-config";
import { FlatCompat } from "@eslint/eslintrc";
import stylistic from "@stylistic/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default antfu({
  ...eslintConfig,

  plugins: {
    "@stylistic": stylistic,
  },

  rules: {
    "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
    "@stylistic/semi": ["error", "always"],

    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],

    "func-style": ["error", "expression", { allowArrowFunctions: true }],

    "antfu/top-level-function": "off",

    "dot-notation": "off",
  },
});
