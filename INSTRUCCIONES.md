# Instrucciones de desarrollo — promete-contexto

## Autoridad y límites

- Paradigma es externo, normativo para contexto y de sólo lectura.
- Consultar el mapa sólo sirve para localizar fuentes. La lectura canónica posterior es obligatoria antes de usar una afirmación doctrinal.
- El mapa o el texto canónico de Paradigma nunca se convierte por esta capa en evidencia específica de un caso.
- No modificar el repositorio Paradigma desde promete-contexto.
- No inferir un path de fuente por coincidencia aproximada. Si la ruta del mapa está obsoleta, sólo aceptar una coincidencia única por título normalizado y registrar el SHA canónico recuperado.
- El texto entregado por este repositorio debe conservar `contextOnly: true` y proveniencia verificable.

## Implementación

- `queryParadigma` consulta el mapa y devuelve coincidencias con referencias de evidencia.
- `readParadigmaSources` lee los localizadores después de la consulta; no aceptar una lectura sin referencia y versión.
- `createParadigmaGitHubReader` sólo usa GET, ancla cada consulta a un SHA de commit de 40 caracteres y restringe archivos fuente a `corpus/fuentes/`.
- La autenticación se inyecta mediante una función fetch autorizada en el runtime consumidor. No añadir tokens, secretos ni credenciales al código, fixtures, logs o commits.
- Los errores de permisos, rutas no encontradas, fuentes ambiguas, hashes ausentes o texto vacío deben fallar cerrados.

## Validación

Ejecutar `npm test`. Las pruebas con fake fetch verifican el contrato del adaptador, no permisos de GitHub ni recuperación autenticada de Paradigma. La integración viva debe fijar un commit concreto y limitarse a lectura.


## Verificación live de acceso a Paradigma

La prueba autenticada es independiente del backend lingüístico y no utiliza credenciales de proveedores de modelos. Copia `.env.example` a `.env.local`, configura ahí un token GitHub con permiso de sólo lectura sobre `kagenomusuko-svg/Paradigma`, y ejecuta:

```sh
npm run verify:paradigma-live
```

La variable del token es `PROMETEO_PARADIGMA_READ_TOKEN`; el commit de fuente se fija con `PARADIGMA_SOURCE_COMMIT`. La función de transporte limita HTTPS al endpoint Contents de `kagenomusuko-svg/Paradigma`, exige un SHA de 40 caracteres y permite sólo GET. El script no imprime token ni texto de Paradigma. Las pruebas de CI verifican el aislamiento del secreto, repositorio, referencia y método; sólo la prueba live acredita permisos y lectura auténtica. Para GitHub Actions, configura el secreto repository-level `PROMETEO_PARADIGMA_READ_TOKEN` con acceso sólo lectura a `Paradigma` y ejecuta el workflow manual `Paradigma live read-only verification` desde la rama `main`.
