import 'package:flutter/foundation.dart' show kIsWeb;
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

  // En dev (port explicite, localhost, ou sous-domaine localhost/IP) → http.
  static String get _scheme =>
      _host.contains(':') || _host == 'localhost' ||
      _localhostMatch != null || _ipMatch != null
          ? 'http'
          : 'https';

  // sub.N.N.N.N[:port]  → connecter sur l'IP directement
  static final _ipHostRegex        = RegExp(r'^([^.]+)\.(\d+\.\d+\.\d+\.\d+(?::\d+)?)$');
  // sub.localhost[:port] → remplacer localhost par 10.0.2.2 (émulateur Android)
  static final _localhostHostRegex = RegExp(r'^([^.]+)\.(localhost(?::\d+)?)$');

  static Match? get _ipMatch        => _ipHostRegex.firstMatch(_host);
  static Match? get _localhostMatch => _localhostHostRegex.firstMatch(_host);

  // Port du serveur central (ex : "8000" depuis "localhost:8000")
  static String get _centralPort {
    final parts = _centralHost.split(':');
    return parts.length > 1 ? parts.last : '';
  }

  // Adresse TCP réelle (IP ou IP-centrale à la place de localhost sur mobile)
  static String get _connectionHost {
    if (_ipMatch != null) return _ipMatch!.group(2)!;
    if (_localhostMatch != null) {
      var serverPart = _localhostMatch!.group(2)!; // ex: "localhost" ou "localhost:8000"
      // Si pas de port dans le domaine stocké, hériter du port du serveur central
      if (!serverPart.contains(':') && _centralPort.isNotEmpty) {
        serverPart = '$serverPart:$_centralPort';
      }
      // Sur le web, subdomain.localhost:PORT est directement accessible (Chrome)
      if (kIsWeb) return '${_localhostMatch!.group(1)!}.$serverPart';
      // Remplacer localhost par l'IP du serveur central si c'est une IP
      // (appareil physique), sinon fallback sur 10.0.2.2 (émulateur Android).
      return serverPart.replaceFirst('localhost', _localIp);
    }
    return _host;
  }

  // IP à substituer à "localhost" : celle du central si configurée, sinon émulateur.
  static final _ipOnlyRegex = RegExp(r'^(\d+\.\d+\.\d+\.\d+)(?::\d+)?$');
  static String get _localIp {
    final m = _ipOnlyRegex.firstMatch(_centralHost);
    return m != null ? m.group(1)! : '10.0.2.2';
  }

  // En-tête Host original à injecter pour l'identification du tenant
  // Sur le web, le navigateur gère lui-même le header Host — pas besoin de l'injecter
  static String? get virtualHost {
    if (kIsWeb) return null;
    return (_ipMatch != null || _localhostMatch != null) ? _host : null;
  }

  static String get baseUrl        => '$_scheme://$_connectionHost/api';
  static String get storageBaseUrl => '$_scheme://$_connectionHost';

  // URL du serveur central (pour la recherche publique d'établissements).
  // Priorité : valeur sauvegardée par l'utilisateur (onboarding), sinon
  // --dart-define=CENTRAL_HOST=monapp.ci, sinon API_HOST, sinon localhost:8000.
  static String get _centralHost =>
      StorageService.getCachedCentralUrl() ??
      const String.fromEnvironment('CENTRAL_HOST',
          defaultValue: String.fromEnvironment('API_HOST', defaultValue: 'localhost:8000'));
  static String get _centralScheme =>
      _centralHost.contains(':') || _centralHost == 'localhost' ? 'http' : 'https';
  static String get centralBaseUrl => '$_centralScheme://$_centralHost/api';

  /// Corrige les URLs de stockage (localhost, 127.0.0.1, ou IP virtuelle tenant)
  static String fixStorageUrl(String? url) {
    if (url == null) return '';
    var fixed = url
        .replaceAll('http://localhost:8000', storageBaseUrl)
        .replaceAll('http://127.0.0.1:8000', storageBaseUrl)
        .replaceAll('https://localhost:8000', storageBaseUrl)
        .replaceAll('https://192.168.0.102:8000', storageBaseUrl);
    // Si on est en mode virtual-host, remplace aussi l'hôte d'origine par l'IP réelle
    if (_ipMatch != null) {
      fixed = fixed.replaceAll('://$_host', '://$_connectionHost');
    }
    return fixed;
  }

  static const Duration connectTimeout = Duration(seconds: 20);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Endpoint Auth mobile unifiée
  static const String mobileLogin = '/mobile/login';

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

  static String parentPaiements(int eleveId) =>
      '/parent/enfant/$eleveId/paiements';

  static String parentPaiementRecu(int paiementId) =>
      '/parent/paiements/$paiementId/recu';

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
