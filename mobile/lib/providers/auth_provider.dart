import 'package:flutter/foundation.dart';
import '../main.dart' show navigatorKey;
import '../models/ecole_session.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';
import '../utils/error_helper.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }
enum UserRole   { parent, enseignant }

/// Résultat d'un loginUnifie.
sealed class LoginResult {}
class LoginSuccess  extends LoginResult {}
class LoginChoix    extends LoginResult {
  final Map<String, dynamic> dataParentCentral;
  final Map<String, dynamic> dataEnseignantCentral;
  LoginChoix({required this.dataParentCentral, required this.dataEnseignantCentral});
}
class LoginErreur   extends LoginResult {
  final String message;
  LoginErreur(this.message);
}

class AuthProvider extends ChangeNotifier {
  AuthStatus _status = AuthStatus.unknown;
  UserRole?  _role;
  String?    _nom;
  String?    _prenom;
  String?    _numero;
  int?       _id;
  bool       _sessionExpiree = false;

  // ── Session centrale multi-écoles ────────────────────────────────────────
  List<EcoleSession> _ecoles           = [];
  int                _ecoleIndex       = 0;
  bool               _isCentral        = false;
  bool               _choixEcoleRequis = false;

  AuthStatus         get status         => _status;
  UserRole?          get role           => _role;
  String?            get nom            => _nom;
  String?            get prenom         => _prenom;
  String?            get numero         => _numero;
  int?               get id             => _id;
  bool               get sessionExpiree => _sessionExpiree;
  bool               get isAuthenticated=> _status == AuthStatus.authenticated;
  bool               get isEnseignant   => _role == UserRole.enseignant;
  bool               get isParent       => _role == UserRole.parent;
  bool               get isCentral      => _isCentral;
  bool               get choixEcoleRequis => _choixEcoleRequis;
  List<EcoleSession> get ecoles         => _ecoles;
  EcoleSession?      get ecoleActive    => _ecoles.isEmpty ? null : _ecoles[_ecoleIndex];

  /// Tous les enfants de toutes les écoles, avec leur école injectée.
  List<Map<String, dynamic>> get tousLesEnfants => [
    for (final e in _ecoles)
      for (final enfant in e.enfants)
        {...enfant, '_ecole_nom': e.nom, '_ecole_index': _ecoles.indexOf(e)},
  ];

  final _authService = AuthService();

  AuthProvider() {
    ApiService.onUnauthorized = () {
      _resetState(expire: true);
      notifyListeners();
      navigatorKey.currentState?.popUntil((route) => route.isFirst);
    };
  }

  void acquitterSessionExpiree() {
    _sessionExpiree = false;
    notifyListeners();
  }

  Future<void> checkAuth() async {
    try {
      final loggedIn = await _authService.isLoggedIn();
      if (loggedIn) {
        final roleStr = await StorageService.getRole();

        if (roleStr == 'enseignant') {
          await _restaurerEnseignant();
        } else if (roleStr == 'parent_central' || roleStr == 'enseignant_central') {
          await _restaurerSessionCentrale(roleStr!);
        } else {
          await _restaurerParent();
        }
        _status = AuthStatus.authenticated;
      } else {
        _status = AuthStatus.unauthenticated;
      }
    } catch (_) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  // ── Login unifié tenant ──────────────────────────────────────────────────

  Future<LoginResult> loginUnifie(String numero, String password) async {
    try {
      final data      = await ApiService().loginUnifie(numero, password);
      final roles     = List<String>.from(data['roles'] as List);
      final rolesData = data['data'] as Map<String, dynamic>;

      final hasParent     = roles.contains('parent_central');
      final hasEnseignant = roles.contains('enseignant_central');

      if (hasParent && hasEnseignant) {
        return LoginChoix(
          dataParentCentral:     rolesData['parent_central']     as Map<String, dynamic>,
          dataEnseignantCentral: rolesData['enseignant_central'] as Map<String, dynamic>,
        );
      }
      if (hasEnseignant) {
        await _appliquerSession('enseignant_central', rolesData['enseignant_central'] as Map<String, dynamic>);
        return LoginSuccess();
      }
      if (hasParent) {
        await _appliquerSession('parent_central', rolesData['parent_central'] as Map<String, dynamic>);
        return LoginSuccess();
      }
      return LoginErreur('Aucun accès actif trouvé pour ce numéro.');
    } catch (e) {
      return LoginErreur(mapErrorToMessage(e));
    }
  }

  Future<void> choisirRole(String role, Map<String, dynamic> roleData) async {
    await _appliquerSession(role, roleData);
  }

  /// Valide le choix d'établissement affiché après une connexion enseignant
  /// multi-écoles (voir [choixEcoleRequis]).
  void confirmerChoixEcole() {
    _choixEcoleRequis = false;
    notifyListeners();
  }

  Future<void> switchEcole(int index) async {
    if (index < 0 || index >= _ecoles.length) return;
    _ecoleIndex = index;
    await StorageService.saveEcoleActiveIndex(index);
    ApiService().switchEcole(_ecoles[index]);
    notifyListeners();
  }

  Future<String?> loginParent(String numero, String password) async {
    try {
      final success = await _authService.loginParent(numero, password);
      if (success) {
        _isCentral = false;
        _ecoles    = [];
        _role      = UserRole.parent;
        final info = await StorageService.getParentInfo();
        _nom    = info['nom'];
        _prenom = info['prenom'];
        _numero = info['numero'];
        _id     = int.tryParse(info['id'] ?? '');
        _status = AuthStatus.authenticated;
        notifyListeners();
        return null;
      }
      return 'Identifiants incorrects.';
    } catch (e) {
      return mapErrorToMessage(e);
    }
  }

  Future<String?> loginEnseignant(String numero, String password) async {
    try {
      final success = await _authService.loginEnseignant(numero, password);
      if (success) {
        _isCentral = false;
        _ecoles    = [];
        _role      = UserRole.enseignant;
        final info = await StorageService.getEnseignantInfo();
        _nom    = info['nom'];
        _prenom = info['prenom'];
        _numero = info['numero'];
        _id     = int.tryParse(info['id'] ?? '');
        _status = AuthStatus.authenticated;
        notifyListeners();
        return null;
      }
      return 'Identifiants incorrects.';
    } catch (e) {
      return mapErrorToMessage(e);
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    await StorageService.clearSessionCentrale();
    _resetState();
    notifyListeners();
    navigatorKey.currentState?.popUntil((route) => route.isFirst);
  }

  // ── Privé ────────────────────────────────────────────────────────────────

  /// Applique une session centrale (parent_central ou enseignant_central).
  Future<void> _appliquerSession(String role, Map<String, dynamic> userData) async {
    final ecoles = (userData['ecoles'] as List)
        .map((e) => EcoleSession.fromJson(e as Map<String, dynamic>))
        .toList();

    _ecoles     = ecoles;
    _ecoleIndex = 0;
    _isCentral  = true;
    _role       = role == 'parent_central' ? UserRole.parent : UserRole.enseignant;
    _nom        = userData['nom']       as String?;
    _prenom     = userData['prenom']    as String?;
    _numero     = userData['telephone'] as String?;
    _id         = userData['id']        as int?;
    _status     = AuthStatus.authenticated;

    // Un enseignant dans plusieurs établissements doit choisir explicitement
    // celui qu'il consulte avant d'accéder à son espace.
    _choixEcoleRequis = role == 'enseignant_central' && ecoles.length > 1;

    await StorageService.saveRole(role);
    await StorageService.saveSessionCentrale({
      'identity': {
        'nom':       _nom,
        'prenom':    _prenom,
        'telephone': _numero,
        'id':        _id,
      },
      'ecoles': ecoles.map((e) => e.toJson()).toList(),
    });
    await StorageService.saveEcoleActiveIndex(0);

    if (ecoles.isNotEmpty) {
      ApiService().switchEcole(ecoles[0]);
    }

    notifyListeners();
  }

  Future<void> _restaurerSessionCentrale(String roleStr) async {
    final session = await StorageService.getSessionCentrale();
    if (session == null) return;

    final identity = session['identity'] as Map<String, dynamic>;
    final ecoles   = (session['ecoles'] as List)
        .map((e) => EcoleSession.fromJson(e as Map<String, dynamic>))
        .toList();
    final index = await StorageService.getEcoleActiveIndex();

    _ecoles     = ecoles;
    _ecoleIndex = index.clamp(0, ecoles.isEmpty ? 0 : ecoles.length - 1);
    _isCentral  = true;
    _role       = roleStr == 'parent_central' ? UserRole.parent : UserRole.enseignant;
    _nom        = identity['nom']       as String?;
    _prenom     = identity['prenom']    as String?;
    _numero     = identity['telephone'] as String?;
    _id         = identity['id']        as int?;

    if (ecoles.isNotEmpty) {
      ApiService().switchEcole(_ecoles[_ecoleIndex]);
    }
  }

  Future<void> _restaurerParent() async {
    _isCentral = false;
    _role      = UserRole.parent;
    final info = await StorageService.getParentInfo();
    _nom    = info['nom'];
    _prenom = info['prenom'];
    _numero = info['numero'];
    _id     = int.tryParse(info['id'] ?? '');
  }

  Future<void> _restaurerEnseignant() async {
    _isCentral = false;
    _role      = UserRole.enseignant;
    final info = await StorageService.getEnseignantInfo();
    _nom    = info['nom'];
    _prenom = info['prenom'];
    _numero = info['numero'];
    _id     = int.tryParse(info['id'] ?? '');
  }

  void _resetState({bool expire = false}) {
    _status         = AuthStatus.unauthenticated;
    _sessionExpiree = expire;
    _role           = null;
    _nom            = null;
    _prenom         = null;
    _numero         = null;
    _id             = null;
    _isCentral        = false;
    _ecoles           = [];
    _ecoleIndex       = 0;
    _choixEcoleRequis = false;
  }
}
