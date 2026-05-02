import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Stocke les feuilles de présence saisies hors connexion.
/// Chaque entrée est identifiée par une clé unique classe_matiere_date.
class OfflinePresenceService {
  static const _clePrefixe = 'offline_presence_';
  static const _cleIndex   = 'offline_presence_index';

  // ── Sauvegarde locale ────────────────────────────────────────────────────

  Future<void> sauvegarder(Map<String, dynamic> payload) async {
    final prefs = await SharedPreferences.getInstance();
    final cle   = _construireCle(payload);

    await prefs.setString('$_clePrefixe$cle', jsonEncode(payload));

    final index = _lireIndex(prefs);
    if (!index.contains(cle)) {
      index.add(cle);
      await prefs.setStringList(_cleIndex, index);
    }
  }

  // ── Récupère toutes les entrées en attente ───────────────────────────────

  Future<List<Map<String, dynamic>>> enAttente() async {
    final prefs  = await SharedPreferences.getInstance();
    final index  = _lireIndex(prefs);
    final result = <Map<String, dynamic>>[];

    for (final cle in index) {
      final json = prefs.getString('$_clePrefixe$cle');
      if (json != null) {
        result.add(jsonDecode(json) as Map<String, dynamic>);
      }
    }
    return result;
  }

  // ── Nombre d'entrées en attente (pour badge UI) ──────────────────────────

  Future<int> nombreEnAttente() async {
    final prefs = await SharedPreferences.getInstance();
    return _lireIndex(prefs).length;
  }

  // ── Supprime une entrée après synchronisation réussie ───────────────────

  Future<void> supprimer(Map<String, dynamic> payload) async {
    final prefs = await SharedPreferences.getInstance();
    final cle   = _construireCle(payload);

    await prefs.remove('$_clePrefixe$cle');

    final index = _lireIndex(prefs)..remove(cle);
    await prefs.setStringList(_cleIndex, index);
  }

  // ── Vide tout ────────────────────────────────────────────────────────────

  Future<void> viderTout() async {
    final prefs = await SharedPreferences.getInstance();
    for (final cle in _lireIndex(prefs)) {
      await prefs.remove('$_clePrefixe$cle');
    }
    await prefs.remove(_cleIndex);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  String _construireCle(Map<String, dynamic> payload) {
    final classeId  = payload['classe_id']?.toString()  ?? '0';
    final matiereId = payload['matiere_id']?.toString() ?? '0';
    final date      = (payload['date'] ?? '').toString().replaceAll('-', '');
    return '${classeId}_${matiereId}_$date';
  }

  List<String> _lireIndex(SharedPreferences prefs) {
    return List<String>.from(prefs.getStringList(_cleIndex) ?? []);
  }
}
