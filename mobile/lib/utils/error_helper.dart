import 'package:dio/dio.dart';

/// Convertit une exception en message lisible pour l'utilisateur.
String mapErrorToMessage(Object e, [String fallback = 'Une erreur inattendue s\'est produite.']) {
  if (e is DioException) {
    // Message personnalisé injecté par l'intercepteur (401/403)
    if (e.message != null && e.message!.isNotEmpty && e.type == DioExceptionType.badResponse) {
      final serverMsg = e.response?.data?['message'];
      if (serverMsg is String && serverMsg.isNotEmpty) return serverMsg;
      return e.message!;
    }

    return switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        'La connexion est trop lente. Vérifiez votre réseau.',
      DioExceptionType.connectionError =>
        'Impossible de contacter le serveur. Vérifiez votre connexion.',
      DioExceptionType.badResponse => () {
          final serverMsg = e.response?.data?['message'];
          if (serverMsg is String && serverMsg.isNotEmpty) return serverMsg;
          return 'Erreur serveur (${e.response?.statusCode ?? '?'}).';
        }(),
      DioExceptionType.cancel => 'Requête annulée.',
      _ => 'Erreur réseau. Vérifiez votre connexion.',
    };
  }

  return fallback;
}
