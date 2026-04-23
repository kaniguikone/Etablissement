import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/api_config.dart';
import '../models/periode.dart';
import 'storage_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  static VoidCallback? onUnauthorized;

  late final Dio _dio;

  ApiService._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl, // lu dynamiquement depuis StorageService
        connectTimeout: ApiConfig.connectTimeout,
        receiveTimeout: ApiConfig.receiveTimeout,
        headers: {'Accept': 'application/json'},
      ),
    );

    // Intercepteur : injecte le token Bearer + gère 401/403
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await StorageService.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          // Émulateur Android : "sous-domaine.10.0.2.2:8000" → connexion sur l'IP,
          // mais le header Host doit contenir le vrai sous-domaine pour le routing tenant.
          final vh = ApiConfig.virtualHost;
          if (vh != null) options.headers['Host'] = vh;
          handler.next(options);
        },
        onError: (DioException e, handler) async {
          final statusCode = e.response?.statusCode;
          if (statusCode == 401 || statusCode == 403) {
            final isLoginEndpoint = e.requestOptions.path.contains('/login');
            if (!isLoginEndpoint) {
              await StorageService.clearAll();
              onUnauthorized?.call();
            }
            handler.reject(DioException(
              requestOptions: e.requestOptions,
              response: e.response,
              type: DioExceptionType.badResponse,
              message: statusCode == 401
                  ? (isLoginEndpoint ? 'Identifiants incorrects.' : 'Session expirée. Veuillez vous reconnecter.')
                  : 'Accès non autorisé.',
            ));
          } else {
            handler.next(e);
          }
        },
      ),
    );
  }

  /// À appeler après avoir changé l'URL serveur (onboarding ou deep link).
  void resetBaseUrl() {
    _dio.options.baseUrl = ApiConfig.baseUrl;
  }

  // ─── Auth Parent ────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> login(String numero, String password) async {
    final response = await _dio.post(ApiConfig.parentLogin, data: {
      'numero_parent': numero,
      'password': password,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<void> logout() async {
    await _dio.post(ApiConfig.parentLogout);
  }

  // ─── Auth Enseignant ─────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> loginEnseignant(String numero, String password) async {
    final response = await _dio.post(ApiConfig.enseignantLogin, data: {
      'numero_enseignant': numero,
      'password': password,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<void> logoutEnseignant() async {
    await _dio.post(ApiConfig.enseignantLogout);
  }

  // ─── Portail Enseignant ──────────────────────────────────────────────────────

  Future<List<dynamic>> getClassesEnseignant() async {
    final response = await _dio.get(ApiConfig.enseignantClasses);
    return response.data as List<dynamic>;
  }

  Future<List<dynamic>> getElevesClasse(int classeId) async {
    final response = await _dio.get(ApiConfig.enseignantEleves(classeId));
    return response.data as List<dynamic>;
  }

  Future<List<dynamic>> getDevoirsEnseignant({int? periodeId}) async {
    final response = await _dio.get(
      ApiConfig.enseignantDevoirs,
      queryParameters: periodeId != null ? {'periode_id': periodeId} : null,
    );
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> creerDevoir(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConfig.enseignantDevoirs, data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> modifierDevoir(int id, Map<String, dynamic> data) async {
    final response = await _dio.put(ApiConfig.enseignantModifierDevoir(id), data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getNotesDevoir(int devoirId, {int? classeId}) async {
    final response = await _dio.get(
      ApiConfig.enseignantNotes(devoirId),
      queryParameters: classeId != null ? {'classe_id': classeId} : null,
    );
    return response.data as Map<String, dynamic>;
  }

  Future<void> sauvegarderNotes(int devoirId, List<Map<String, dynamic>> notes) async {
    await _dio.post(ApiConfig.enseignantSauvegarderNotes(devoirId), data: {'notes': notes});
  }

  Future<Periode?> getPeriodeParDate(String date) async {
    final response = await _dio.get(
      ApiConfig.enseignantPeriodesParDate,
      queryParameters: {'date': date},
    );
    if (response.data == null) return null;
    return Periode.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<dynamic>> getFeuillePresence({
    required int classeId,
    required int matiereId,
    required String date,
  }) async {
    final response = await _dio.get(ApiConfig.enseignantAssiduites, queryParameters: {
      'classe_id':  classeId,
      'matiere_id': matiereId,
      'date':       date,
    });
    return response.data as List<dynamic>;
  }

  Future<void> sauvegarderPresences(Map<String, dynamic> data) async {
    await _dio.post(ApiConfig.enseignantAssiduites, data: data);
  }

  Future<Map<String, dynamic>> getEmploiDuTempsEnseignant() async {
    final response = await _dio.get(ApiConfig.enseignantEmploi);
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getPeriodesEnseignant() async {
    final response = await _dio.get(ApiConfig.enseignantPeriodes);
    return response.data as List<dynamic>;
  }

  Future<List<dynamic>> getTypeDevoirs() async {
    final response = await _dio.get(ApiConfig.enseignantTypeDevoirs);
    return response.data as List<dynamic>;
  }

  // ─── Inscription ────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> soumettreInscription(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConfig.soumettreinscription, data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> statutInscription(String token) async {
    final response = await _dio.get(ApiConfig.statutInscription(token));
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getEtablissement() async {
    final response = await _dio.get(ApiConfig.etablissement);
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getNiveaux() async {
    final response = await _dio.get('/niveaux');
    return response.data as List<dynamic>;
  }

  // ─── CinetPay ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> initierPaiement({
    required int eleveId,
    required int scolariteId,
    required num montant,
    required String returnUrl,
  }) async {
    final response = await _dio.post(ApiConfig.initierPaiement, data: {
      'eleve_id':     eleveId,
      'scolarite_id': scolariteId,
      'montant':      montant,
      'return_url':   returnUrl,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> statutPaiement(String transactionId) async {
    final response = await _dio.get(ApiConfig.statutPaiement(transactionId));
    return response.data as Map<String, dynamic>;
  }

  Future<String> getProchainCode(String base) async {
    final response = await _dio.get('/enseignant/devoirs/prochainCode', queryParameters: {'base': base});
    return (response.data as Map<String, dynamic>)['code'] as String? ?? base;
  }

  Future<List<dynamic>> getInformationsEnseignant() async {
    final response = await _dio.get(ApiConfig.enseignantInfos);
    return response.data as List<dynamic>;
  }

  Future<List<dynamic>> getProgression({
    required int classeId,
    required int matiereId,
    required int periodeId,
  }) async {
    final response = await _dio.get(ApiConfig.enseignantProgression, queryParameters: {
      'classe_id':  classeId,
      'matiere_id': matiereId,
      'periode_id': periodeId,
    });
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> sauvegarderProgression(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConfig.enseignantProgression, data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<void> supprimerProgression(int id) async {
    await _dio.delete(ApiConfig.enseignantSupprimerProgression(id));
  }

  // ─── Portail Parent ─────────────────────────────────────────────────────────

  Future<List<dynamic>> getEnfants() async {
    final response = await _dio.get(ApiConfig.parentEnfants);
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getBulletin(int eleveId, int periodeId) async {
    final response = await _dio.get(ApiConfig.parentBulletin(eleveId, periodeId));
    return response.data as Map<String, dynamic>;
  }

  Future<List<int>> getBulletinPdf(int eleveId, int periodeId) async {
    final response = await _dio.get(
      ApiConfig.parentBulletinPdf(eleveId, periodeId),
      options: Options(responseType: ResponseType.bytes),
    );
    final data = response.data;
    if (data is List<int>) return data;
    return (data as List).cast<int>();
  }

  Future<List<dynamic>> getAssiduites(int eleveId, int periodeId) async {
    final response = await _dio.get(ApiConfig.parentAssiduites(eleveId, periodeId));
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getScolarites(int eleveId) async {
    final response = await _dio.get(ApiConfig.parentScolarites(eleveId));
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getEnseignants(int eleveId) async {
    final response = await _dio.get(ApiConfig.parentEnseignants(eleveId));
    return response.data as List<dynamic>;
  }

  Future<List<dynamic>> getInformations() async {
    final response = await _dio.get(ApiConfig.parentInfos);
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getEmploiDuTemps(int eleveId) async {
    final response = await _dio.get(ApiConfig.parentEmploi(eleveId));
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getPeriodes() async {
    final response = await _dio.get(ApiConfig.periodes);
    return response.data as List<dynamic>;
  }

  // ─── Années scolaires (portail parent) ──────────────────────────────────────

  Future<List<dynamic>> getAnneesScolaires() async {
    final response = await _dio.get('/parent/annees-scolaires');
    return response.data as List<dynamic>;
  }

  Future<List<dynamic>> getPeriodesParAnnee(int anneeId) async {
    final response = await _dio.get('/parent/periodes-annee/$anneeId');
    return response.data as List<dynamic>;
  }

  // ─── Notifications ───────────────────────────────────────────────────────────

  Future<List<dynamic>> getNotifications({String prefix = 'parent'}) async {
    final response = await _dio.get('/$prefix/notifications');
    final data = response.data as Map<String, dynamic>;
    return data['data'] as List<dynamic>;
  }

  Future<int> getNonLuesCount({String prefix = 'parent'}) async {
    final response = await _dio.get('/$prefix/notifications/non-lues');
    return (response.data as Map<String, dynamic>)['count'] as int? ?? 0;
  }

  Future<void> marquerNotificationLue(int id, {String prefix = 'parent'}) async {
    await _dio.post('/$prefix/notifications/$id/lire');
  }

  Future<void> marquerToutesNotificationsLues({String prefix = 'parent'}) async {
    await _dio.post('/$prefix/notifications/lire-tout');
  }

  Future<void> supprimerNotification(int id, {String prefix = 'parent'}) async {
    await _dio.delete('/$prefix/notifications/$id');
  }

  Future<void> enregistrerTokenFcm(String token, {String prefix = 'parent'}) async {
    await _dio.post('/$prefix/fcm-token', data: {'token': token});
  }

  // ─── Remplacements (enseignant) ──────────────────────────────────────────────

  Future<List<dynamic>> getMesRemplacements() async {
    final response = await _dio.get(ApiConfig.enseignantRemplacements);
    return response.data as List<dynamic>;
  }

  // ─── Messagerie ──────────────────────────────────────────────────────────────

  Future<List<dynamic>> getConversations({required String prefix}) async {
    final response = await _dio.get('/$prefix/messages/conversations');
    return response.data as List<dynamic>;
  }

  Future<List<dynamic>> getMessagesFil(int eleveId, int autreId, String autreType, {required String prefix}) async {
    final response = await _dio.get(
      '/$prefix/messages/eleve/$eleveId',
      queryParameters: {'autre_type': autreType, 'autre_id': autreId},
    );
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> envoyerMessage(Map<String, dynamic> data, {required String prefix}) async {
    final response = await _dio.post('/$prefix/messages', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<void> lireToutMessages(Map<String, dynamic> data, {required String prefix}) async {
    await _dio.post('/$prefix/messages/lire-tout', data: data);
  }

  // ─── RDV Parent ──────────────────────────────────────────────────────────────

  Future<List<dynamic>> getCreneauxRdvEnseignant(int enseignantId) async {
    final response = await _dio.get(ApiConfig.parentRdvCreneaux(enseignantId));
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> reserverRdv(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConfig.parentRdvReserver, data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getMesReservationsRdv() async {
    final response = await _dio.get(ApiConfig.parentRdvReservations);
    return response.data as List<dynamic>;
  }

  Future<void> annulerReservationRdv(int id) async {
    await _dio.delete(ApiConfig.parentRdvAnnuler(id));
  }

  // ─── RDV Enseignant ──────────────────────────────────────────────────────────

  Future<List<dynamic>> getMesCreneauxRdv() async {
    final response = await _dio.get(ApiConfig.enseignantRdvCreneaux);
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> creerCreneauRdv(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConfig.enseignantRdvCreneaux, data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getMesReservationsEnseignant() async {
    final response = await _dio.get(ApiConfig.enseignantRdvReservations);
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> confirmerRdv(int id, {String? note}) async {
    final response = await _dio.post(
      ApiConfig.enseignantRdvConfirmer(id),
      data: {'note_enseignant': note},
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> annulerRdvEnseignant(int id) async {
    final response = await _dio.post(ApiConfig.enseignantRdvAnnuler(id));
    return response.data as Map<String, dynamic>;
  }

  /// Recherche publique d'établissements (utilisée à l'onboarding).
  Future<List<Map<String, dynamic>>> rechercherEtablissements(String q) async {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConfig.centralBaseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      headers: {'Accept': 'application/json'},
    ));
    final response = await dio.get(
      '/etablissements/recherche',
      queryParameters: {'q': q},
    );
    return List<Map<String, dynamic>>.from(response.data as List);
  }

  /// Lookup par code court (ex: ABC123) — retourne {nom, domaine}.
  Future<Map<String, dynamic>> rechercherParCode(String code) async {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConfig.centralBaseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      headers: {'Accept': 'application/json'},
    ));
    final response = await dio.get('/etablissements/code/${code.trim().toUpperCase()}');
    return Map<String, dynamic>.from(response.data as Map);
  }
}
