const importGroups = [
  "builtin",
  "external",
  "internal",
  "parent",
  "sibling",
  "index",
  "object",
  "type",
];

/** @param {Array<{ pattern: string; group: string; position?: string }>} extraPathGroups */
export function createImportOrderRule(extraPathGroups = []) {
  const pathGroups = [
    { pattern: "@/**", group: "internal" },
    ...extraPathGroups,
  ];
  const hasReact = extraPathGroups.some((g) => g.pattern === "react");

  return [
    "error",
    {
      groups: importGroups,
      pathGroups,
      pathGroupsExcludedImportTypes: hasReact ? ["react"] : [],
      "newlines-between": "always",
      alphabetize: { order: "asc", caseInsensitive: true },
    },
  ];
}

/** Shared stricter rules for client and server (on top of typescript-eslint strict). */
export const strictRules = {
  eqeqeq: ["error", "always", { null: "ignore" }],
  curly: ["error", "all"],
  "no-console": ["warn", { allow: ["warn", "error"] }],
  "no-implicit-coercion": "error",
  "object-shorthand": "error",

  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/consistent-type-imports": [
    "error",
    { prefer: "type-imports", fixStyle: "inline-type-imports" },
  ],
  "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    },
  ],

  "import/no-duplicates": ["error", { "prefer-inline": true }],
  "import/newline-after-import": "error",
};
