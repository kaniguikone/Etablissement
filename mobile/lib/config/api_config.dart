import '../services/storage_service.dart';

class ApiConfig {
  // ─── URL serveur ─────────────────────────────────────────────────────────
  // Priorité : valeur sauvegardée dans StorageService (configurée au premier
  // lancement ou via deep link), sinon fallback sur --dart-define pour le dev.
  //
  // Exemples dev :
  //   flutter run  --dart-define=API_HOST=192.168.1.18:8000   (appareil physique Wi-Fi)
  //   flutter run  --dart-define=API_HOST=10.0.2.2:8000       (émulateur Android)
  //
  static String get _host =>
      StorageService.getCachedServerUrl() ??
      const String.fromEnvironment('API_HOST', defaultValue: 'localhost:8000');

  // En dev (port explicite ou localhost) → http. En production → https.
  static String get _scheme =>
      _host.contains(':') || _host == 'localhost' ? 'http' : 'https';

  static String get baseUrl        => '$_scheme://$_host/api';
  static String get storageBaseUrl => '$_scheme://$_host';

  /// Corrige les URLs de stockage qui contiennent localhost/127.0.0.1
  static String fixStorageUrl(String? url) {
    if (url == null) return '';
    return url
        .replaceAll('http://localhost:8000', storageBaseUrl)
        .replaceAll('http://127.0.0.1:8000', storageBaseUrl)
        .replaceAll('https://localhost:8000', storageBaseUrl)
        .replaceAll('https://127.0.0.1:8000', storageBaseUrl);
  }

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 15);

  // Endpoints Parent
  static const String parentLogin    = '/parent/login';
  static const String parentLogout   = '/parent/logout';
  static const String parentMe       = '/parent/me';
  static const String parentEnfants  = '/parent/enfants';
  static const String parentInfos    = '/parent/informations';

  static String parentBulletin(int eleveId, int periodeId) =>
      '/parent/enfant/$eleveId/bulletin/$periodeId';

  static String parentBulletinPdf(int eleveId, int periodeId) =>
      '/parent/enfant/$eleveId/bulletin/$periodeId/pdf';

  static String parentAssiduites(int eleveId, int periodeId) =>
      '/parent/enfant/$eleveId/assiduites/$periodeId';

  static String parentScolarites(int eleveId) =>
      '/parent/enfant/$eleveId/scolarites';

  static String parentEnseignants(int eleveId) =>
      '/parent/enfant/$eleveId/enseignants';

  static String parentEmploi(int eleveId) =>
      '/parent/enfant/$eleveId/emploi';

  // Endpoint public périodes
  static const String periodes = '/periodes';

  // Endpoints Enseignant
  static const String enseignantLogin  = '/enseignant/login';
  static const String enseignantLogout = '/enseignant/logout';
  static const String enseignantMe     = '/enseignant/me';
  static const String enseignantClasses     = '/enseignant/classes';
  static const String enseignantDevoirs     = '/enseignant/devoirs';
  static const String enseignantAssiduites  = '/enseignant/assiduites';
  static const String enseignantEmploi      = '/enseignant/emploi';
  static const String enseignantPeriodes        = '/enseignant/periodes';
  static const String enseignantPeriodesParDate = '/enseignant/periodes/parDate';
  static const String enseignantTypeDevoirs = '/enseignant/typeDevoirs';
  static const String enseignantInfos       = '/enseignant/informations';

  static String enseignantEleves(int classeId) =>
      '/enseignant/classe/$classeId/eleves';

  static String enseignantNotes(int devoirId) =>
      '/enseignant/devoir/$devoirId/notes';

  static String enseignantSauvegarderNotes(int devoirId) =>
      '/enseignant/devoir/$devoirId/notes';

  static String enseignantModifierDevoir(int devoirId) =>
      '/enseignant/devoirs/$devoirId';

  static const String enseignantProgression = '/enseignant/progression';
  static String enseignantSupprimerProgression(int id) =>
      '/enseignant/progression/$id';

  // Remplacements enseignant
  static const String enseignantRemplacements = '/enseignant/remplacements';

  // Messagerie enseignant
  static const String enseignantMsgConversations = '/enseignant/messages/conversations';
  static String enseignantMsgFil(int eleveId) => '/enseignant/messages/eleve/$eleveId';
  static const String enseignantMsgEnvoyer  = '/enseignant/messages';
  static const String enseignantMsgLireTout = '/enseignant/messages/lire-tout';

  // RDV enseignant
  static const String enseignantRdvCreneaux     = '/enseignant/rdv/creneaux';
  static const String enseignantRdvReservations = '/enseignant/rdv/reservations';
  static String enseignantRdvConfirmer(int id) => '/enseignant/rdv/reservations/$id/confirmer';
  static String enseignantRdvAnnuler(int id)   => '/enseignant/rdv/reservations/$id/annuler';

  // Messagerie parent
  static const String parentMsgConversations = '/parent/messages/conversations';
  static String parentMsgFil(int eleveId) => '/parent/messages/eleve/$eleveId';
  static const String parentMsgEnvoyer  = '/parent/messages';
  static const String parentMsgLireTout = '/parent/messages/lire-tout';

  // RDV parent
  static String parentRdvCreneaux(int enseignantId) =>
      '/parent/rdv/enseignant/$enseignantId/creneaux';
  static const String parentRdvReserver     = '/parent/rdv/reserver';
  static const String parentRdvReservations = '/parent/rdv/reservations';
  static String parentRdvAnnuler(int id)    => '/parent/rdv/reservations/$id';

  // Établissement (public)
  static const String etablissement = '/etablissement';

  // Endpoints Inscription (public)
  static const String soumettreinscription = '/inscription';
  static String statutInscription(String token) => '/inscription/$token/statut';

  // Endpoints CinetPay
  static const String initierPaiement = '/paiements/initier';
  static String statutPaiement(String transactionId) =>
      '/paiements/statut/$transactionId';
}
