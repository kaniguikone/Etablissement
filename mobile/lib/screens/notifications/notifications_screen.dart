import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/notification_model.dart';
import '../../providers/notification_provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().fetchNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationProvider>();
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifications'),
            if (provider.nonLues > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.red,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${provider.nonLues}',
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (provider.nonLues > 0)
            TextButton(
              onPressed: () => context.read<NotificationProvider>().marquerToutesLues(),
              child: const Text('Tout lire', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: provider.loading
          ? const Center(child: CircularProgressIndicator())
          : provider.notifications.isEmpty
              ? _EmptyState()
              : RefreshIndicator(
                  onRefresh: () => context.read<NotificationProvider>().fetchNotifications(),
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: provider.notifications.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) => _NotificationTile(
                      notif: provider.notifications[i],
                      onLire:      () => context.read<NotificationProvider>().marquerLue(provider.notifications[i].id),
                      onSupprimer: () => context.read<NotificationProvider>().supprimer(provider.notifications[i].id),
                    ),
                  ),
                ),
    );
  }
}

// ── Tile ──────────────────────────────────────────────────────────────────────

class _NotificationTile extends StatelessWidget {
  final NotificationModel notif;
  final VoidCallback onLire;
  final VoidCallback onSupprimer;

  const _NotificationTile({
    required this.notif,
    required this.onLire,
    required this.onSupprimer,
  });

  static const _iconData = {
    'absence':         (Icons.person_off_outlined,    Colors.red),
    'bulletin':        (Icons.description_outlined,   Colors.blue),
    'paiement_retard': (Icons.warning_amber_outlined, Colors.orange),
    'information':     (Icons.info_outline,           Colors.cyan),
    'devoir':          (Icons.edit_outlined,          Colors.purple),
    'inscription':     (Icons.how_to_reg_outlined,    Colors.green),
  };

  @override
  Widget build(BuildContext context) {
    final cfg   = _iconData[notif.type] ?? (Icons.notifications_outlined, Colors.grey);
    final color = cfg.$2;
    final icon  = cfg.$1;

    final dateStr = _formatDate(notif.createdAt);

    return InkWell(
      onTap: notif.estLu ? null : onLire,
      child: Container(
        color: notif.estLu ? null : color.withValues(alpha: .04),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icône
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: .12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),

            const SizedBox(width: 12),

            // Contenu
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notif.titre,
                          style: TextStyle(
                            fontWeight: notif.estLu ? FontWeight.w500 : FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      if (!notif.estLu)
                        Container(
                          width: 8, height: 8,
                          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notif.corps,
                    style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.access_time, size: 12, color: Colors.grey[400]),
                      const SizedBox(width: 4),
                      Text(dateStr, style: TextStyle(fontSize: 11, color: Colors.grey[400])),
                      const Spacer(),
                      // Supprimer
                      GestureDetector(
                        onTap: onSupprimer,
                        child: Icon(Icons.close, size: 16, color: Colors.grey[400]),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now  = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 1) return 'À l\'instant';
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays} j';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_none, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('Aucune notification', style: TextStyle(color: Colors.grey[500], fontSize: 16)),
        ],
      ),
    );
  }
}
