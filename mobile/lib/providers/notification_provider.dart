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
    final token = await StorageService.getToken();
    if (token == null) return;
    final count = await _service.fetchNonLues(prefix: _prefix);
    if (count != _nonLues) {
      _nonLues = count;
      notifyListeners();
    }
  }

  // ── Liste complète ────────────────────────────────────────────────────────

  Future<void> fetchNotifications() async {
    _loading = true;
    notifyListeners();
    _notifications = await _service.fetchNotifications(prefix: _prefix);
    _nonLues = _notifications.where((n) => !n.estLu).length;
    _loading = false;
    notifyListeners();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  Future<void> marquerLue(int id) async {
    await _service.marquerLue(id, prefix: _prefix);
    _notifications = _notifications.map((n) {
      return n.id == id ? n.copyWith(luLe: DateTime.now()) : n;
    }).toList();
    _nonLues = _notifications.where((n) => !n.estLu).length;
    notifyListeners();
  }

  Future<void> marquerToutesLues() async {
    await _service.marquerToutesLues(prefix: _prefix);
    _notifications = _notifications.map((n) => n.copyWith(luLe: DateTime.now())).toList();
    _nonLues = 0;
    notifyListeners();
  }

  Future<void> supprimer(int id) async {
    await _service.supprimer(id, prefix: _prefix);
    final removed = _notifications.firstWhere((n) => n.id == id, orElse: () => _notifications.first);
    _notifications = _notifications.where((n) => n.id != id).toList();
    if (!removed.estLu) _nonLues = (_nonLues - 1).clamp(0, 9999);
    notifyListeners();
  }

  Future<void> enregistrerTokenFcm(String token) async {
    await _service.enregistrerTokenFcm(token, prefix: _prefix);
  }
}
