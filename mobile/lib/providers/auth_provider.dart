import 'package:flutter/foundation.dart';
import '../main.dart' show navigatorKey;
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';
import '../utils/error_helper.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }
enum UserRole   { parent, enseignant }

/// Résultat d'un loginUnifie.
/// [LoginSuccess] : un seul rôle trouvé, connexion établie.
/// [LoginChoix]   : deux rôles trouvés, l'UI doit présenter le choix.
/// [LoginErreur]  : identifiants incorrects ou erreur réseau.
sealed class LoginResult {}

class LoginSuccess extends LoginResult {}

class LoginChoix extends LoginResult {
  final Map<String, dynamic> dataParent;
  final Map<String, dynamic> dataEnseignant;
  LoginChoix({required this.dataParent, required this.dataEnseignant});
}

class LoginErreur extends LoginResult {
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

  bool _sessionExpiree = false;

  AuthStatus get status        => _status;
  UserRole?  get role          => _role;
  String?    get nom           => _nom;
  String?    get prenom        => _prenom;
  String?    get numero        => _numero;
  int?       get id            => _id;
  bool get sessionExpiree      => _sessionExpiree;
  bool get isAuthenticated     => _status == AuthStatus.authenticated;
  bool get isEnseignant        => _role == UserRole.enseignant;
  bool get isParent            => _role == UserRole.parent;

  final _authService = AuthService();

  AuthProvider() {
    ApiService.onUnauthorized = () {
      _status        = AuthStatus.unauthenticated;
      _sessionExpiree = true;
      _role   = null;
      _nom    = null;
      _prenom = null;
      _numero = null;
      _id     = null;
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
          _role = UserRole.enseignant;
          final info = await StorageService.getEnseignantInfo();
          _nom    = info['nom'];
          _prenom = info['prenom'];
          _numero = info['numero'];
          _id     = int.tryParse(info['id'] ?? '');
        } else {
          _role = UserRole.parent;
          final info = await StorageService.getParentInfo();
          _nom    = info['nom'];
          _prenom = info['prenom'];
          _numero = info['numero'];
          _id     = int.tryParse(info['id'] ?? '');
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

  Future<LoginResult> loginUnifie(String numero, String password) async {
    try {
      final data  = await ApiService().loginUnifie(numero, password);
      final roles = List<String>.from(data['roles'] as List);
      final rolesData = data['data'] as Map<String, dynamic>;

      if (roles.contains('parent') && roles.contains('enseignant')) {
        return LoginChoix(
          dataParent:      rolesData['parent']      as Map<String, dynamic>,
          dataEnseignant:  rolesData['enseignant']  as Map<String, dynamic>,
        );
      }

      if (roles.contains('enseignant')) {
        await _appliquerEnseignant(rolesData['enseignant'] as Map<String, dynamic>);
        return LoginSuccess();
      }

      await _appliquerParent(rolesData['parent'] as Map<String, dynamic>);
      return LoginSuccess();
    } catch (e) {
      return LoginErreur(mapErrorToMessage(e));
    }
  }

  Future<void> choisirRole(String role, Map<String, dynamic> roleData) async {
    if (role == 'enseignant') {
      await _appliquerEnseignant(roleData);
    } else {
      await _appliquerParent(roleData);
    }
  }

  Future<void> _appliquerParent(Map<String, dynamic> d) async {
    await StorageService.saveToken(d['token'] as String);
    await StorageService.saveRole('parent');
    await StorageService.saveParentInfo(
      id:     d['id'] as int,
      nom:    d['nom'] as String? ?? '',
      prenom: d['prenom'] as String? ?? '',
      numero: d['numero'] as String? ?? '',
    );
    _role   = UserRole.parent;
    _nom    = d['nom'] as String?;
    _prenom = d['prenom'] as String?;
    _numero = d['numero'] as String?;
    _id     = d['id'] as int?;
    _status = AuthStatus.authenticated;
    notifyListeners();
  }

  Future<void> _appliquerEnseignant(Map<String, dynamic> d) async {
    await StorageService.saveToken(d['token'] as String);
    await StorageService.saveRole('enseignant');
    await StorageService.saveEnseignantInfo(
      id:      d['id'] as int,
      nom:     d['nom'] as String? ?? '',
      prenoms: d['prenoms'] as String? ?? '',
      numero:  d['numero'] as String? ?? '',
    );
    _role   = UserRole.enseignant;
    _nom    = d['nom'] as String?;
    _prenom = d['prenoms'] as String?;
    _numero = d['numero'] as String?;
    _id     = d['id'] as int?;
    _status = AuthStatus.authenticated;
    notifyListeners();
  }

  Future<String?> loginParent(String numero, String password) async {
    try {
      final success = await _authService.loginParent(numero, password);
      if (success) {
        _role = UserRole.parent;
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
        _role = UserRole.enseignant;
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
    _status = AuthStatus.unauthenticated;
    _role   = null;
    _nom    = null;
    _prenom = null;
    _numero = null;
    _id     = null;
    notifyListeners();
    navigatorKey.currentState?.popUntil((route) => route.isFirst);
  }
}
