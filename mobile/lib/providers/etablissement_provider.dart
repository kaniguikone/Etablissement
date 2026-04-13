import 'package:flutter/foundation.dart';
import '../models/etablissement.dart';
import '../services/api_service.dart';

class EtablissementProvider extends ChangeNotifier {
  final _api = ApiService();

  EtablissementInfo? _info;
  EtablissementInfo? get info => _info;

  EtablissementProvider() {
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.getEtablissement();
      _info = EtablissementInfo.fromJson(data);
      notifyListeners();
    } catch (e) {
      debugPrint('[EtablissementProvider] Erreur chargement : $e');
    }
  }
}
