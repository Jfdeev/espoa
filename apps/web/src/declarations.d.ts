// Shorthand ambient module declaration.
// @react-pdf/renderer ships `index.d.ts` with `export = ReactPDF` (CJS-style)
// while its package.json declares `"type": "module"`.
// TypeScript `bundler` + `verbatimModuleSyntax` cannot reconcile the two,
// so we tell the compiler the module exists (all exports are `any`).
declare module "@react-pdf/renderer";
