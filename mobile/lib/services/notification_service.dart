import '../models/notification_model.dart';
import 'api_service.dart';

/// Façade légère qui délègue à ApiService (qui gère le Dio + auth).
class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final ApiService _api = ApiService();

  Future<List<NotificationModel>> fetchNotifications({String prefix = 'parent'}) async {
    try {
      final items = await _api.getNotifications(prefix: prefix);
      return items.map((e) => NotificationModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<int> fetchNonLues({String prefix = 'parent'}) async {
    try {
      return await _api.getNonLuesCount(prefix: prefix);
    } catch (_) {
      return 0;
    }
  }

  Future<void> marquerLue(int id, {String prefix = 'parent'}) async {
    try {
      await _api.marquerNotificationLue(id, prefix: prefix);
    } catch (_) {}
  }

  Future<void> marquerToutesLues({String prefix = 'parent'}) async {
    try {
      await _api.marquerToutesNotificationsLues(prefix: prefix);
    } catch (_) {}
  }

  Future<void> supprimer(int id, {String prefix = 'parent'}) async {
    try {
      await _api.supprimerNotification(id, prefix: prefix);
    } catch (_) {}
  }

  Future<void> enregistrerTokenFcm(String token, {String prefix = 'parent'}) async {
    try {
      await _api.enregistrerTokenFcm(token, prefix: prefix);
    } catch (_) {}
  }
}
