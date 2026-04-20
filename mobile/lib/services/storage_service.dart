import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _keyToken        = 'auth_token';
  static const _keyRole         = 'auth_role'; // 'parent' | 'enseignant'
  static const _keyServerUrl    = 'server_url'; // ex: https://lycee-moderne.monapp.ci

  // Cache synchrone chargé au démarrage de l'app
  static String? _cachedServerUrl;

  // Parent
  static const _keyParentId     = 'parent_id';
  static const _keyParentNom    = 'parent_nom';
  static const _keyParentPrenom = 'parent_prenom';
  static const _keyParentNumero = 'parent_numero';

  // Enseignant
  static const _keyEnseignantId     = 'enseignant_id';
  static const _keyEnseignantNom    = 'enseignant_nom';
  static const _keyEnseignantPrenom = 'enseignant_prenom';
  static const _keyEnseignantNumero = 'enseignant_numero';

  // ── URL serveur (établissement) ──────────────────────────────────────────

  /// Charge l'URL depuis le stockage sécurisé dans le cache synchrone.
  /// À appeler une fois au démarrage avant runApp().
  static Future<void> loadServerUrl() async {
    _cachedServerUrl = await _storage.read(key: _keyServerUrl);
  }

  static Future<void> saveServerUrl(String url) async {
    _cachedServerUrl = url;
    await _storage.write(key: _keyServerUrl, value: url);
  }

  static Future<void> clearServerUrl() async {
    _cachedServerUrl = null;
    await _storage.delete(key: _keyServerUrl);
  }

  /// Retour synchrone depuis le cache (disponible après loadServerUrl()).
  static String? getCachedServerUrl() => _cachedServerUrl;

  // ── Token & rôle ─────────────────────────────────────────────────────────

  static Future<void> saveToken(String token) =>
      _storage.write(key: _keyToken, value: token);

  static Future<String?> getToken() => _storage.read(key: _keyToken);

  static Future<void> saveRole(String role) =>
      _storage.write(key: _keyRole, value: role);

  static Future<String?> getRole() => _storage.read(key: _keyRole);

  // ── Parent ────────────────────────────────────────────────────────────────

  static Future<void> saveParentInfo({
    required int id,
    required String nom,
    required String prenom,
    required String numero,
  }) async {
    await _storage.write(key: _keyParentId,     value: id.toString());
    await _storage.write(key: _keyParentNom,    value: nom);
    await _storage.write(key: _keyParentPrenom, value: prenom);
    await _storage.write(key: _keyParentNumero, value: numero);
  }

  static Future<Map<String, String?>> getParentInfo() async => {
    'id':     await _storage.read(key: _keyParentId),
    'nom':    await _storage.read(key: _keyParentNom),
    'prenom': await _storage.read(key: _keyParentPrenom),
    'numero': await _storage.read(key: _keyParentNumero),
  };

  // ── Enseignant ────────────────────────────────────────────────────────────

  static Future<void> saveEnseignantInfo({
    required int id,
    required String nom,
    required String prenoms,
    required String numero,
  }) async {
    await _storage.write(key: _keyEnseignantId,     value: id.toString());
    await _storage.write(key: _keyEnseignantNom,    value: nom);
    await _storage.write(key: _keyEnseignantPrenom, value: prenoms);
    await _storage.write(key: _keyEnseignantNumero, value: numero);
  }

  static Future<Map<String, String?>> getEnseignantInfo() async => {
    'id':     await _storage.read(key: _keyEnseignantId),
    'nom':    await _storage.read(key: _keyEnseignantNom),
    'prenom': await _storage.read(key: _keyEnseignantPrenom),
    'numero': await _storage.read(key: _keyEnseignantNumero),
  };

  // ── Utilitaire ────────────────────────────────────────────────────────────

  static Future<void> clearAll() => _storage.deleteAll();
}
