// Reads the kit source (../src) with the TypeScript compiler and writes src/generated/props.json:
// for every exported component or function of the MUI skin, its props (name, type, required,
// doc comment, default value). The docs props tables are drawn from this, so they cannot drift.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const entries = [resolve(root, "../src/mui/index.ts"), resolve(root, "../src/core/index.ts")];

const program = ts.createProgram(entries, {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  types: [],
  baseUrl: root,
  paths: { "*": ["./node_modules/@types/*", "./node_modules/*"] },
});
const checker = program.getTypeChecker();
const FLAGS =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
  ts.TypeFormatFlags.WriteArrayAsGenericType * 0;

const clean = (text) => text.replace(/\s+/g, " ").replace(/\| undefined/g, "").replace(/\s+\|\s*$/, "").trim();
const doc = (symbol) => ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();

/** Default values written in the destructured parameter: `({ size = "md" })`. */
function defaultsOf(declaration) {
  const out = {};
  const fn = declaration && (ts.isFunctionDeclaration(declaration) ? declaration : null);
  let params = fn?.parameters;
  if (!params && declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) {
    let init = declaration.initializer;
    if (ts.isCallExpression(init)) init = init.arguments[0] ?? init;
    if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) params = init.parameters;
  }
  const pattern = params?.[0]?.name;
  if (pattern && ts.isObjectBindingPattern(pattern)) {
    for (const el of pattern.elements) {
      if (el.initializer && ts.isIdentifier(el.propertyName ?? el.name)) {
        out[(el.propertyName ?? el.name).text] = el.initializer.getText();
      }
    }
  }
  return out;
}

const result = {};
for (const entry of entries) {
  const file = program.getSourceFile(entry);
  const moduleSymbol = checker.getSymbolAtLocation(file);
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    let symbol = exported;
    if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    if (!(symbol.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Variable))) continue;
    const declaration = symbol.valueDeclaration;
    if (!declaration) continue;
    const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
    const signature = type.getCallSignatures()[0];
    if (!signature) continue;
    const param = signature.getParameters()[0];
    const props = [];
    if (param) {
      const defaults = defaultsOf(declaration);
      const paramType = checker.getTypeOfSymbolAtLocation(param, declaration);
      for (const prop of checker.getPropertiesOfType(paramType)) {
        const propDecl = prop.valueDeclaration ?? prop.declarations?.[0];
        if (propDecl && propDecl.getSourceFile().fileName.includes("node_modules")) continue;
        const propType = checker.getTypeOfSymbolAtLocation(prop, propDecl ?? declaration);
        props.push({
          name: prop.getName(),
          // The type as written in the source when it has an annotation (keeps ReactNode and aliases).
          type: clean(propDecl?.type ? propDecl.type.getText() : checker.typeToString(propType, declaration, FLAGS)),
          required: !(prop.flags & ts.SymbolFlags.Optional),
          description: doc(prop),
          default: defaults[prop.getName()] ?? null,
        });
      }
    }
    result[exported.getName()] = {
      description: doc(symbol),
      props,
      source: declaration.getSourceFile().fileName.replace(/^.*\/src\//, "src/"),
    };
  }
}

const out = resolve(root, "src/generated/props.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
console.log(`props.json: ${Object.keys(result).length} exports`);
