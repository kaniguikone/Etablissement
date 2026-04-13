import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../widgets/loading_error_widget.dart';
import '../../theme/app_theme.dart';
import 'fil_messages_screen.dart';

class ConversationsScreen extends StatefulWidget {
  final String prefix; // 'parent' ou 'enseignant'
  const ConversationsScreen({super.key, required this.prefix});

  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  final _api = ApiService();
  List<Map<String, dynamic>> _conversations = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.getConversations(prefix: widget.prefix);
      setState(() {
        _conversations = data.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  String _formatDate(String? str) {
    if (str == null) return '';
    try {
      final d = DateTime.parse(str).toLocal();
      final now = DateTime.now();
      if (d.day == now.day && d.month == now.month && d.year == now.year) {
        return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
      }
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';
    } catch (_) { return ''; }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: _loading
          ? const LoadingWidget(message: 'Chargement...')
          : _error != null
              ? ErrorRetryWidget(message: _error!, onRetry: _load)
              : _conversations.isEmpty
                  ? const EmptyWidget(
                      message: 'Aucune conversation',
                      icon: Icons.chat_bubble_outline,
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        itemCount: _conversations.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, i) {
                          final c = _conversations[i];
                          final nonLus = (c['non_lus'] as int?) ?? 0;
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: AppTheme.primary.withValues(alpha: 0.15),
                              child: Text(
                                (c['autre_nom'] as String? ?? '?')[0].toUpperCase(),
                                style: const TextStyle(
                                  color: AppTheme.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            title: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    c['autre_nom'] as String? ?? '—',
                                    style: TextStyle(
                                      fontWeight: nonLus > 0 ? FontWeight.bold : FontWeight.w600,
                                    ),
                                  ),
                                ),
                                Text(
                                  _formatDate(c['dernier_at'] as String?),
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: nonLus > 0 ? AppTheme.primary : Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (c['eleve_nom'] != null)
                                  Text(c['eleve_nom'] as String,
                                      style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                Text(
                                  c['dernier_msg'] as String? ?? '',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: nonLus > 0 ? FontWeight.w600 : FontWeight.normal,
                                  ),
                                ),
                              ],
                            ),
                            trailing: nonLus > 0
                                ? CircleAvatar(
                                    radius: 10,
                                    backgroundColor: AppTheme.primary,
                                    child: Text('$nonLus',
                                        style: const TextStyle(
                                            color: Colors.white, fontSize: 10)),
                                  )
                                : null,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => FilMessagesScreen(
                                  prefix:    widget.prefix,
                                  autreNom:  c['autre_nom'] as String? ?? '—',
                                  autreType: c['autre_type'] as String,
                                  autreId:   c['autre_id'] as int,
                                  eleveId:   c['eleve_id'] as int?,
                                  eleveNom:  c['eleve_nom'] as String?,
                                ),
                              ),
                            ).then((_) => _load()),
                          );
                        },
                      ),
                    ),
    );
  }
}
