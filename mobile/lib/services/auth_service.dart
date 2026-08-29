import 'api_service.dart';
import 'storage_service.dart';

class AuthService {
  final _api = ApiService();

  Future<bool> loginParent(String numero, String password) async {
    final data   = await _api.login(numero, password);
    final token  = data['token'] as String?;
    final parent = data['parent'] as Map<String, dynamic>?;

    if (token == null || parent == null) return false;

    await StorageService.saveToken(token);
    await StorageService.saveRole('parent');
    await StorageService.saveParentInfo(
      id:     parent['id'] as int,
      nom:    parent['nom_parent'] as String? ?? '',
      prenom: parent['prenom_parent'] as String? ?? '',
      numero: parent['numero_parent'] as String? ?? '',
    );
    return true;
  }

  Future<bool> loginEnseignant(String numero, String password) async {
    final data        = await _api.loginEnseignant(numero, password);
    final token       = data['token'] as String?;
    final enseignant  = data['enseignant'] as Map<String, dynamic>?;

    if (token == null || enseignant == null) return false;

    await StorageService.saveToken(token);
    await StorageService.saveRole('enseignant');
    await StorageService.saveEnseignantInfo(
      id:      enseignant['id'] as int,
      nom:     enseignant['nom'] as String? ?? '',
      prenoms: enseignant['prenoms'] as String? ?? '',
      numero:  enseignant['numero'] as String? ?? '',
    );
    return true;
  }

  Future<void> logout() async {
    final role = await StorageService.getRole();
    try {
      if (role == 'enseignant' || role == 'enseignant_central') {
        await _api.logoutEnseignant();
      } else {
        await _api.logout();
      }
    } catch (_) {
      // Nettoyer quand même si l'API échoue
    } finally {
      await StorageService.clearAll();
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await StorageService.getToken();
    return token != null && token.isNotEmpty;
  }
}
