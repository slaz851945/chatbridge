# Architecture ChatBridge — vue détaillée

## Flux d'export

User click "Exporter"
  -> Panel.handleExport()
    -> ExportFlow.run()
      -> DeepSeekAdapter.extract()
           - apiInterceptor -> capture ? -> Message[]
           - sinon VirtualListExtractor -> scroll + capture
      -> ExportChatUseCase.execute()
           - HashService.hashMessages()
      -> ZipBundle.build()
           - JsonSerializer.serialize()
           - MarkdownSerializer.serialize()
           - fflate.zipSync()
  -> downloadBlob(result.bytes, result.fileName)

## Flux d'import

User click "Importer"
  -> Panel.handleImport(file)
    -> ImportChatUseCase.execute()
      -> readBundle(file)
           - .zip -> unzipSync -> chat.json
           - .json -> JsonSerializer.deserialize()
      -> ChunkStrategy.chunk(messages, {compact})
      -> DeepSeekImporter.importChat(chat)
           pour chaque chunk :
             - setInputValue()
             - pressEnter()
             - waitForResponse() [échantillonnage longueur]
             - pause anti rate-limit

## Détection de fin de réponse

Boucle :
  - sleep 500ms
  - tail = 3 derniers .ds-message
  - signature = longueurs de texte jointes par |
  - si signature != lastSignature :
      stableSince = now
      lastSignature = signature
  - si now - stableSince >= 4000ms :
      return true

Indépendant du DOM virtualisé, du scroll, et des mutations React.

## Structure du projet

src/
  domain/
    models/         Message, Chat, ChatSource, Role, Attachment
    formats/        ExportEnvelope, ChatBridgeManifest
    hashing/        HashService
  application/
    export/         ExportChatUseCase, ExportFlow
    import/         ImportChatUseCase, bundleReader
    chunking/       ChunkStrategy
    bundle/         ZipBundle
    ports/          ChatSourcePort, ImportPort, SerializerPort
  infrastructure/
    deepseek/       DeepSeekAdapter, DeepSeekImporter, apiInterceptor
    serializers/    JsonSerializer, MarkdownSerializer
  interface/
    userscript/     Panel, download, main.ts
