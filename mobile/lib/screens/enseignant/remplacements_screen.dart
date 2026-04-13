import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../widgets/loading_error_widget.dart';

class RemplacementsScreen extends StatefulWidget {
  const RemplacementsScreen({super.key});

  @override
  State<RemplacementsScreen> createState() => _RemplacementsScreenState();
}

class _RemplacementsScreenState extends State<RemplacementsScreen> {
  final _api = ApiService();
  List<Map<String, dynamic>> _remplacements = [];
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
      final data = await _api.getMesRemplacements();
      setState(() {
        _remplacements = data.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Color _statutColor(String statut) => switch (statut) {
    'couvert'     => Colors.green,
    'non_couvert' => Colors.red,
    _             => Colors.orange,
  };

  String _statutLabel(String statut) => switch (statut) {
    'couvert'     => 'Couvert',
    'non_couvert' => 'Non couvert',
    _             => 'À assurer',
  };

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const LoadingWidget(message: 'Chargement...')
        : _error != null
            ? ErrorRetryWidget(message: _error!, onRetry: _load)
            : _remplacements.isEmpty
                ? const EmptyWidget(
                    message: 'Aucun remplacement à venir',
                    icon: Icons.swap_horiz,
                  )
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _remplacements.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) {
                        final r = _remplacements[i];
                        final creneau = r['creneau'] as Map<String, dynamic>?;
                        final statut = r['statut'] as String? ?? 'a_couvrir';
                        final color = _statutColor(statut);
                        return Card(
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: color.withValues(alpha: 0.15),
                              child: Icon(Icons.swap_horiz, color: color),
                            ),
                            title: Text(
                              creneau?['matiere']?['libelle_matiere'] as String? ?? '—',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${r['date_remplacement'] ?? ''}  · '
                                    '${creneau?['heure_debut']?.toString().substring(0, 5) ?? ''}–'
                                    '${creneau?['heure_fin']?.toString().substring(0, 5) ?? ''}'),
                                Text(
                                  creneau?['classe']?['nom_classe'] as String? ?? '—',
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ],
                            ),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _statutLabel(statut),
                                style: TextStyle(
                                  color: color,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  );
  }
}
