---
name: "etl-repo-snapshot"
description: "Audit repository state without making any changes"
---

# Purpose
Auditar el estado actual del repositorio sin modificar ningún archivo. Proporciona un inventario de tecnologías, dependencias, riesgos y estructura existente.

# Scope

## IN SCOPE
- Listar estructura de directorios y archivos clave
- Detectar versiones de Node.js, npm, Python
- Identificar package.json, tsconfig.json, cdk.json, archivos Terraform
- Detectar dependencias instaladas
- Identificar configuraciones existentes (ESLint, Prettier, Jest, etc.)
- Reportar riesgos e incompatibilidades

## OUT OF SCOPE
- NO crear ni editar archivos
- NO instalar dependencias
- NO modificar configuraciones
- NO ejecutar builds o tests
- Solo lectura y reporte

# Inputs
- Ruta del repositorio (por defecto: actual)

# Outputs
- Inventario de estructura de carpetas
- Versiones detectadas (Node, npm, Python)
- Lista de archivos de configuración encontrados
- Análisis de riesgos (versiones incompatibles, dependencias obsoletas)
- Detección de tecnologías (CDK, Terraform, Docker, etc.)

# Steps

1. **Inspección de entorno**
   - `node -v` y `npm -v`
   - `python3 --version` (si existe)
   - `ls -la` para ver estructura raíz

2. **Detección de archivos de configuración**
   - `find . -maxdepth 3 -name "package.json"`
   - `find . -maxdepth 3 -name "cdk.json"`
   - `find . -maxdepth 3 -name "tsconfig.json"`
   - `find . -maxdepth 3 -name "*.tf"` (Terraform)
   - `find . -maxdepth 3 -name "Dockerfile"`

3. **Análisis de estructura**
   - Detectar carpetas: infra/, src/, glue/, docs/
   - Listar archivos en .opencode/
   - Identificar archivos de gobernanza en docs/governance/

4. **Reporte de riesgos**
   - Versiones de Node.js < 18 (incompatible con CDK v2 moderno)
   - Dependencias críticas faltantes
   - Conflictos entre tecnologías (ej: Terraform + CDK)
   - Ausencia de archivos de gobernanza

5. **Evidencias requeridas**
   - Comandos ejecutados + output
   - Lista de archivos encontrados
   - Análisis de riesgos (categoría: alto/medio/bajo)

# Verification
- Confirmar que `git diff` está vacío (sin cambios)
- Verificar que no se crearon nuevos archivos
- Validar que el reporte incluye: estructura, versiones, riesgos

# Failure Handling
- Si un comando falla (ej: node no instalado):
  - Documentar el error
  - Continuar con otras inspecciones posibles
  - Reportar el fallo en la evidencia

# Do / Don't

## DO
- Usar comandos no destructivos (ls, find, cat, grep)
- Documentar TODO lo encontrado
- Ser exhaustivo en la detección de tecnologías
- Categorizar riesgos por severidad

## DON'T
- NO ejecutar npm install, npm run build, o similares
- NO crear archivos temporales
- NO modificar .git/index
- NO ejecutar comandos de escritura

# Governance
- Respeta reglas de docs/governance/rules.md
- Cambios pequeños; si este paso tocara >15 archivos (improbable), dividir
- No avanzar si Quality Gates fallan (aquí: git diff vacío)
- Evidencias obligatorias: comandos + outputs + riesgos detectados
