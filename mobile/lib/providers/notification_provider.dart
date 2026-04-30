import 'dart:async';
import 'package:flutter/material.dart';
import '../models/notification_model.dart';
import '../services/notification_service.dart';
import '../services/storage_service.dart';

class NotificationProvider extends ChangeNotifier {
  final NotificationService _service = NotificationService();

  List<NotificationModel> _notifications = [];
  int _nonLues = 0;
  bool _loading = false;
  String _prefix = 'parent'; // 'parent' ou 'enseignant'
  Timer? _pollTimer;

  List<NotificationModel> get notifications => _notifications;
  int get nonLues => _nonLues;
  bool get loading => _loading;

  void init(String prefix) {
    _prefix = prefix;
    _fetchBadge();
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) => _fetchBadge());
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  // ── Badge (polling léger) ─────────────────────────────────────────────────

  Future<void> _fetchBadge() async {
    try {
      final token = await StorageService.getToken();
      if (token == null) return;
      final count = await _service.fetchNonLues(prefix: _prefix);
      if (count != _nonLues) {
        _nonLues = count;
        notifyListeners();
      }
    } catch (_) {
      // Échec silencieux : le badge reste à sa valeur précédente
    }
  }

  // ── Liste complète ────────────────────────────────────────────────────────

  Future<void> fetchNotifications() async {
    _loading = true;
    notifyListeners();
    try {
      _notifications = await _service.fetchNotifications(prefix: _prefix);
      _nonLues = _notifications.where((n) => !n.estLu).length;
    } catch (_) {
      // Conserve la liste précédente en cas d'erreur réseau
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  Future<void> marquerLue(int id) async {
    try {
      await _service.marquerLue(id, prefix: _prefix);
      _notifications = _notifications.map((n) {
        return n.id == id ? n.copyWith(luLe: DateTime.now()) : n;
      }).toList();
      _nonLues = _notifications.where((n) => !n.estLu).length;
      notifyListeners();
    } catch (_) {
      // L'UI reste inchangée si le serveur ne répond pas
    }
  }

  Future<void> marquerToutesLues() async {
    try {
      await _service.marquerToutesLues(prefix: _prefix);
      _notifications = _notifications.map((n) => n.copyWith(luLe: DateTime.now())).toList();
      _nonLues = 0;
      notifyListeners();
    } catch (_) {
      // L'UI reste inchangée si le serveur ne répond pas
    }
  }

  Future<void> supprimer(int id) async {
    try {
      await _service.supprimer(id, prefix: _prefix);
      final removed = _notifications.firstWhere((n) => n.id == id, orElse: () => _notifications.first);
      _notifications = _notifications.where((n) => n.id != id).toList();
      if (!removed.estLu) _nonLues = (_nonLues - 1).clamp(0, 9999);
      notifyListeners();
    } catch (_) {
      // L'UI reste inchangée si la suppression échoue
    }
  }

  Future<void> enregistrerTokenFcm(String token) async {
    try {
      await _service.enregistrerTokenFcm(token, prefix: _prefix);
    } catch (_) {
      // Non bloquant : les notifications push fonctionneront au prochain lancement
    }
  }
}
