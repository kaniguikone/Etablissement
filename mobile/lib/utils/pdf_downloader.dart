// Conditional import : dart:html sur web, dart:io + open_file ailleurs
import 'pdf_downloader_stub.dart'
    if (dart.library.html) 'pdf_downloader_web.dart'
    if (dart.library.io)   'pdf_downloader_io.dart';

/// Ouvre ou télécharge [bytes] comme PDF avec le nom [filename].
Future<void> ouvrirPdf(List<int> bytes, String filename) =>
    ouvrirPdfPlatforme(bytes, filename);
