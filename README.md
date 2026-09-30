# promete-contexto

Adaptador externo de sólo lectura para consultar Paradigma y recuperar primero localizadores y después texto canónico.

## Flujo

`consulta → mapa maestro → evidencia/localizadores → texto canónico → uso contextual`

- El mapa guía la recuperación; no sustituye las fuentes.
- La lectura exige un SHA completo e inmutable de Paradigma.
- El adaptador sólo realiza solicitudes `GET`; la autenticación se inyecta y queda encapsulada en una función de transporte read-only.
- Los pasajes se enlazan al archivo canónico mediante el mapa y se entregan con referencia y SHA de blob.
- Todo texto leído conserva `contextOnly: true`; no se transforma en evidencia del caso ni confirma propuestas.
- Si una ruta de fuente quedó obsoleta tras renombrarse el archivo, sólo se acepta una coincidencia única entre el título del mapa y los nombres en `corpus/fuentes/`; cero o varias coincidencias fallan cerradas.

## Verificación

`npm test` valida contratos, lector y restricción de autenticación con pruebas deterministas. No prueba permisos reales de GitHub.

Para comprobar acceso live a Paradigma privado desde una máquina autorizada:

1. Copia `.env.example` a `.env.local`.
2. Añade en `.env.local` un token GitHub con permiso read-only para Paradigma en `PROMETEO_PARADIGMA_READ_TOKEN`.
3. Ejecuta `npm run verify:paradigma-live`.

El token sólo se envía por HTTPS al endpoint Contents de `kagenomusuko-svg/Paradigma`, en solicitudes GET ancladas a un SHA completo; no puede usarse desde este adaptador para otros repositorios ni operaciones de escritura y nunca se imprime. El reporte registra el SHA fijado, la versión del mapa, el SHA de la fuente y `contextOnly: true`, sin imprimir el texto recuperado. `.env.local` está ignorado por Git.

La comprobación también está disponible como workflow manual `Paradigma live read-only verification` en la rama `main`, usando el secreto de Actions `PROMETEO_PARADIGMA_READ_TOKEN`. El workflow es independiente de las pruebas lingüísticas y no requiere claves de proveedores de modelos.

La implementación está en `src/github-reader.mjs`; la autenticación read-only, en `src/github-auth.mjs`.
