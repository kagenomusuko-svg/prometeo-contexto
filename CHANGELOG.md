# Changelog

## 2026-09-29
- Se añade consulta al mapa maestro de Paradigma y lectura posterior de fuentes canónicas mediante un adaptador GitHub de sólo lectura fijado a commit.
- Las referencias evidencia → obra → fuente canónica conservan localizador, rango de líneas, SHA de blob y referencia al commit.
- Una ruta obsoleta sólo se resuelve por título normalizado si la coincidencia de fuente canónica es única; cualquier ambigüedad falla cerrada.
- Se añaden pruebas de lector con fetch simulado; no constituyen evidencia de acceso autenticado en vivo.

## 2026-09-30
- Se añade un transporte GitHub con token encapsulado, limitado por HTTPS al endpoint Contents de Paradigma, GET-only y referencias completas fijadas a commit.
- Se añade `npm run verify:paradigma-live` para comprobar mapa y fuente canónica privada usando un commit fijado; el reporte no imprime texto ni credencial.
- Se documentan `.env.local` y `.env.example`; la configuración local y secretos quedan fuera de Git.
- CI incluye pruebas deterministas de aislamiento de token y límite read-only; éstas no sustituyen la comprobación live.
