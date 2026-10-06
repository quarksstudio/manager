# Auditoría independiente

Ejecutar `pnpm test:audit` desde manager. La suite exige comportamiento correcto
y ausencia de pins vulnerables conocidos; **se espera salida 1** en el checkout
auditado. No hay skips ni expectativas invertidas. No se registra como proyecto
Nx: `audit.config.cjs` evita el descubrimiento automático de `jest.config.*`.

```sh
pnpm test:audit --testNamePattern='M07:'
pnpm test:audit --testPathIgnorePatterns=dependencies.spec.ts
pnpm test:audit --runTestsByPath tools/audit/installer.spec.ts
```

[Informe consolidado](../../../server/docs/auditoria-consolidada-hallazgos.md),
incluidas las secciones de hallazgos y dependencias.

Las reproducciones usan fuentes reales y fixtures temporales; transporte y
registro se simulan. dependencies.spec.ts es un guard offline de las versiones
devueltas por npm audit, no un exploit de CVE. Después de actualizar dependencias,
repetir `pnpm audit --json` y revisar el inventario; eliminar un pin conocido no
garantiza que su reemplazo sea seguro. El snapshot conserva muestras de hasta
tres cadenas por versión y el número de cadenas reportadas.

Se compilan tests con ts-jest en modo isolatedModules; ejecutar las suites
habituales para comprobar los contratos tipados de sus respectivos paquetes.
