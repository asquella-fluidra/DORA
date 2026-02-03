---
name: "etl-repo-toolchain"
description: "Initialize minimal TypeScript toolchain with build, lint, and test without CDK"
---

# Purpose
Inicializar la toolchain mínima de TypeScript para el proyecto sin incluir CDK todavía. Establece las bases de compilación, linting y testing.

# Scope

## IN SCOPE
- Crear/actualizar package.json con scripts mínimos
- Configurar TypeScript (tsconfig.json con modo estricto)
- Configurar ESLint y Prettier
- Configurar Vitest (framework de testing)
- Crear tests smoke básicos

## OUT OF SCOPE
- NO instalar CDK ni dependencias de AWS
- NO crear infraestructura CDK
- NO crear carpetas infra/ o src/
- Solo toolchain base TypeScript

# Inputs
- Proyecto vacío o existente sin toolchain TS

# Outputs
- package.json configurado con scripts: build, lint, test, format
- tsconfig.json con modo estricto
- ESLint config (.eslintrc.js o .eslintrc.json)
- Prettier config (.prettierrc)
- Vitest config (vitest.config.ts)
- Test smoke básico que valida la toolchain

# Steps

1. **Inicializar package.json**
   - `npm init -y` si no existe
   - Añadir scripts:
     ```json
     {
       "scripts": {
         "build": "tsc",
         "lint": "eslint . --ext .ts,.tsx",
         "lint:fix": "eslint . --ext .ts,.tsx --fix",
         "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
         "format:check": "prettier --check \"**/*.{ts,tsx,json,md}\"",
         "test": "vitest run",
         "test:watch": "vitest"
       }
     }
     ```

2. **Instalar dependencias de desarrollo**
   - `npm install --save-dev typescript`
   - `npm install --save-dev @types/node`
   - `npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin`
   - `npm install --save-dev prettier`
   - `npm install --save-dev vitest @vitest/ui`

3. **Configurar TypeScript (tsconfig.json)**
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "commonjs",
       "lib": ["ES2022"],
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "moduleResolution": "node",
       "outDir": "./dist",
       "rootDir": "./"
     }
   }
   ```

4. **Configurar ESLint (.eslintrc.json)**
   ```json
   {
     "parser": "@typescript-eslint/parser",
     "extends": [
       "eslint:recommended",
       "plugin:@typescript-eslint/recommended"
     ],
     "parserOptions": {
       "ecmaVersion": 2022,
       "sourceType": "module"
     },
     "rules": {
       "@typescript-eslint/no-unused-vars": "error",
       "@typescript-eslint/explicit-function-return-type": "warn"
     }
   }
   ```

5. **Configurar Prettier (.prettierrc)**
   ```json
   {
     "semi": true,
     "trailingComma": "es5",
     "singleQuote": true,
     "printWidth": 80,
     "tabWidth": 2
   }
   ```

6. **Configurar Vitest (vitest.config.ts)**
   ```typescript
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
     },
   });
   ```

7. **Crear test smoke básico**
   - Archivo: `smoke.test.ts`
   ```typescript
   import { describe, it, expect } from 'vitest';

   describe('Toolchain smoke test', () => {
     it('should run basic test', () => {
       expect(1 + 1).toBe(2);
     });
   });
   ```

8. **Ejecutar verification**
   - `npm run build`
   - `npm run lint`
   - `npm run test`

# Verification

## Quality Gates
- `npm run build` → Compilación exitosa sin errores de TS
- `npm run lint` → Cero errores de linting
- `npm run test` → Tests pasan (smoke test)
- `git diff` muestra solo archivos de toolchain creados

## Evidencias requeridas
- Archivos creados/modifyados: package.json, tsconfig.json, .eslintrc.json, .prettierrc, vitest.config.ts, smoke.test.ts
- Output de `npm run build`
- Output de `npm run lint`
- Output de `npm run test`
- Expected vs actual:
  - Expected: Compilación exitosa
  - Actual: [output del comando]

# Failure Handling

## Si build falla (errores de TS)
- Revisar errores en output
- Corregir tsconfig.json
- Re-ejecutar `npm run build`

## Si lint falla
- Revisar errores de ESLint
- Corregir configuración o añadir reglas específicas
- Re-ejecutar `npm run lint`

## Si test falla
- Verificar configuración de Vitest
- Asegurar que test smoke es válido
- Re-ejecutar `npm run test`

# Do / Don't

## DO
- Seguir modo estricto de TypeScript
- Usar ESLint + Prettier juntos
- Mantener scripts simples y claros
- Versionar todos los archivos de config

## DON'T
- NO instalar dependencias de producción (solo devDependencies)
- NO crear carpetas infra/ o src/
- NO instalar CDK o AWS SDK
- NO añadir configuraciones extra fuera de TS/ESLint/Prettier/Vitest

# Governance
- Respeta reglas de docs/governance/rules.md
- Cambios pequeños; si este paso tocara >15 archivos, dividir
- No avanzar si Quality Gates fallan (build/lint/test)
- Evidencias obligatorias: files changed + commands output + expected vs actual
