
# 📦 Retrofit Plan: Add Type Checking to Plain JavaScript Using JSDoc

This plan introduces **type safety** to your **vanilla JS codebase** using JSDoc + TypeScript's `checkJs` mode. It ensures that your code continues to run and pass tests at every stage — with **no transpilation required**.

---

## ✅ Goal

- Add type safety (via TypeScript in `checkJs` mode)
- Keep `.js` files unchanged in runtime (no transpilation)
- Retain working application at each stage

---

## 📋 Step-by-Step Plan

### **1. Set up TypeScript for type checking (no build/transpile)**

Add a `tsconfig.json` file:

```json
{
  "compilerOptions": {
    "checkJs": true,
    "allowJs": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["src/**/*.js"]
}
```

Run:

```bash
tsc --noEmit
```

---

### **2. Add a shared `types.js` file**

Create `src/types.js`, and define your custom types:

```js
/**
 * @typedef {Object} Person
 * @property {string} name
 * @property {number} age
 * @property {boolean} isAdmin
 */
```

Reference this in other files:

```js
/// <reference path="./types.js" />
```

---

### **3. Annotate top-level modules**

Start with one or two central files (e.g. `utils.js`):

```js
/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function add(a, b) {
  return a + b;
}
```

---

### **4. Use editor support**

In VS Code or similar:
- Hover and see inferred types
- Spot inline type errors
- Use `@ts-ignore` if needed during transition

---

### **5. Gradually annotate the rest**

Go module-by-module:
- Add reference to `types.js`
- Annotate parameters, returns, and object structures
- Use `@typedef` and `@callback` where needed

Check after each:

```bash
tsc --noEmit && npm test
```

---

### **6. Optional: ESLint integration**

Install ESLint with TypeScript support:

```bash
npm install --save-dev eslint @typescript-eslint/parser
```

`.eslintrc` setup:

```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["plugin:@typescript-eslint/recommended"],
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  }
}
```

---

### **7. Add type check to CI**

```bash
tsc --noEmit && npm test
```

Ensure type-safe code stays enforced.

---

## 🗂️ Suggested Layout

```
src/
  types.js
  utils/
    math.js
    string.js
  models/
    user.js
    admin.js
```

---

## 🧠 Tips

- Use `@typedef` for object shapes, `@callback` for functions
- Use `@interface` only when inheritance is needed
- Keep types central in `types.js`, or inline if local
- Avoid refactoring logic — just annotate for now

---

## 🏁 Result

- ✅ Full IntelliSense in editors
- ✅ Type errors flagged before deploy
- ✅ Still fully editable & debuggable in production
