# Changelog

## 2026-09-29
- Se añade consulta al mapa maestro de Paradigma y lectura posterior de fuentes canónicas mediante un adaptador GitHub de sólo lectura fijado a commit.
- Las referencias evidencia → obra → fuente canónica conservan localizador, rango de líneas, SHA de blob y referencia al commit.
- Una ruta obsoleta sólo se resuelve por título normalizado si la coincidencia de fuente canónica es única; cualquier ambigüedad falla cerrada.
- Se añaden pruebas de lector con fetch simulado; no constituyen evidencia de acceso autenticado en vivo.
