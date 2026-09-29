# Lectura del corpus de Paradigma

prometeo-contexto implementa explícitamente el flujo normativo:

consulta → mapa maestro → localizadores → texto real → uso.

La función queryParadigma sólo consulta el mapa externo y devuelve localizadores. La función readParadigmaSources recibe ese resultado y un lector inyectado de sólo lectura. El lector debe devolver:

- text: texto de la fuente canónica;
- sourceRef: referencia estable al origen externo;
- sourceVersion: versión o hash de la fuente.

El adaptador no copia Paradigma, no mantiene un corpus paralelo y no trata mapEvidenceStatus como verdad del caso. El texto leído se marca contextOnly: true: sirve para contexto doctrinal o formal y nunca promueve una propuesta lingüística, confirma causalidad o se convierte automáticamente en evidencia específica del caso.

La inyección del lector permite conectar posteriormente el repositorio externo, GitHub u otro almacenamiento aprobado sin que promete-contexto adquiera autoridad sobre el corpus.


## Lector GitHub fijado

`createParadigmaGitHubReader({ fetchImpl, sourceCommit })` consulta el mapa `mapa/mapa-maestro.json` del commit indicado y devuelve localizadores. La lectura posterior acepta únicamente archivos bajo `corpus/fuentes/`, conserva el SHA del blob y el enlace al commit. Las evidencias del mapa se relacionan con `works[].source` a través de `work_id`; cuando el path de la obra ya no existe, se resuelve mediante coincidencia exacta del título normalizado contra el directorio canónico. La resolución debe ser única; de otro modo se rechaza la lectura.

La autenticación queda a cargo de un `fetchImpl` autorizado que añade el token en memoria. El adaptador no acepta un token como parámetro, no registra headers y sólo emite solicitudes GET. Las pruebas usan respuestas simuladas; todavía no acreditan lectura autenticada en vivo desde un workflow.

Los rangos `source_lines` del mapa seleccionan el pasaje de la fuente canónica y el texto devuelto conserva `contextOnly: true`. Paradigma sigue siendo externo, canónico y de sólo lectura.
