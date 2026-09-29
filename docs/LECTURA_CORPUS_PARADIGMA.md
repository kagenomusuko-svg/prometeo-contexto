# Lectura del corpus de Paradigma

prometeo-contexto implementa explícitamente el flujo normativo:

consulta → mapa maestro → localizadores → texto real → uso.

La función queryParadigma sólo consulta el mapa externo y devuelve localizadores. La función readParadigmaSources recibe ese resultado y un lector inyectado de sólo lectura. El lector debe devolver:

- text: texto de la fuente canónica;
- sourceRef: referencia estable al origen externo;
- sourceVersion: versión o hash de la fuente.

El adaptador no copia Paradigma, no mantiene un corpus paralelo y no trata mapEvidenceStatus como verdad del caso. El texto leído se marca contextOnly: true: sirve para contexto doctrinal o formal y nunca promueve una propuesta lingüística, confirma causalidad o se convierte automáticamente en evidencia específica del caso.

La inyección del lector permite conectar posteriormente el repositorio externo, GitHub u otro almacenamiento aprobado sin que promete-contexto adquiera autoridad sobre el corpus.
