# prometeo-contexto

Adaptador externo de sólo lectura para consultar Paradigma y recuperar primero localizadores y después texto canónico.

## Flujo

`consulta → mapa maestro → evidencia/localizadores → texto canónico → uso contextual`

- El mapa guía la recuperación; no sustituye las fuentes.
- La lectura exige un SHA completo e inmutable de Paradigma.
- El adaptador sólo realiza solicitudes `GET`; el acceso autenticado se inyecta desde el entorno consumidor y nunca se almacena en este repositorio.
- Los pasajes se enlazan al archivo canónico mediante el mapa y se entregan con referencia y SHA de blob.
- Todo texto leído conserva `contextOnly: true`; no se transforma en evidencia del caso ni confirma propuestas.
- Si una ruta de fuente quedó obsoleta tras renombrarse el archivo, sólo se acepta una coincidencia única entre el título del mapa y los nombres en `corpus/fuentes/`; cero o varias coincidencias fallan cerradas.

La implementación operativa está en `src/github-reader.mjs`. Ejecuta `npm test` para validar contrato, lectura contextual y el lector GitHub con fetch simulado.
