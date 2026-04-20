import 'package:flutter/foundation.dart';
import '../main.dart' show navigatorKey;
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }
enum UserRole   { parent, enseignant }

class AuthProvider extends ChangeNotifier {
  AuthStatus _status = AuthStatus.unknown;
  UserRole?  _role;
  String?    _nom;
  String?    _prenom;
  String?    _numero;
  int?       _id;

  AuthStatus get status  => _status;
  UserRole?  get role    => _role;
  String?    get nom     => _nom;
  String?    get prenom  => _prenom;
  String?    get numero  => _numero;
  int?       get id      => _id;
  bool get isAuthenticated  => _status == AuthStatus.authenticated;
  bool get isEnseignant     => _role == UserRole.enseignant;
  bool get isParent         => _role == UserRole.parent;

  final _authService = AuthService();

  AuthProvider() {
    ApiService.onUnauthorized = () {
      _status = AuthStatus.unauthenticated;
      _role   = null;
      _nom    = null;
      _prenom = null;
      _numero = null;
      _id     = null;
      notifyListeners();
      navigatorKey.currentState?.popUntil((route) => route.isFirst);
    };
  }

  Future<void> checkAuth() async {
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
      return e.toString();
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
      return e.toString();
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
  }
}
