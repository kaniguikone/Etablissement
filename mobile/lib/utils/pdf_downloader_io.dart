import 'dart:io';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';

Future<void> ouvrirPdfPlatforme(List<int> bytes, String filename) async {
  final dir = await getTemporaryDirectory();

  await _nettoyerAnciensPdf(dir, filename);

  final file = File('${dir.path}/$filename');
  await file.writeAsBytes(bytes);

  final result = await OpenFile.open(file.path);
  if (result.type != ResultType.done) {
    throw Exception(_messageErreur(result.type));
  }
}

/// Supprime les PDF téléchargés lors de sessions précédentes (hygiène du cache).
Future<void> _nettoyerAnciensPdf(Directory dir, String filenameCourant) async {
  try {
    final entries = dir.listSync().whereType<File>().where(
        (f) => f.path.endsWith('.pdf') && !f.path.endsWith(filenameCourant));
    for (final f in entries) {
      await f.delete();
    }
  } catch (_) {
    // Nettoyage best-effort : ne doit jamais empêcher l'ouverture du PDF.
  }
}

String _messageErreur(ResultType type) {
  switch (type) {
    case ResultType.noAppToOpen:
      return 'Aucune application installée ne permet d\'ouvrir un PDF. '
          'Installez une visionneuse PDF (ex. Google Drive, Adobe Acrobat).';
    case ResultType.permissionDenied:
      return 'Permission refusée pour ouvrir le fichier.';
    case ResultType.fileNotFound:
      return 'Le fichier PDF est introuvable.';
    case ResultType.error:
    case ResultType.done:
      return 'Impossible d\'ouvrir le PDF.';
  }
}
