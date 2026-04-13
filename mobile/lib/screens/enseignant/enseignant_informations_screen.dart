import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../models/information.dart';
import '../../widgets/loading_error_widget.dart';
import '../../theme/app_theme.dart';

class EnseignantInformationsScreen extends StatefulWidget {
  const EnseignantInformationsScreen({super.key});

  @override
  State<EnseignantInformationsScreen> createState() =>
      _EnseignantInformationsScreenState();
}

class _EnseignantInformationsScreenState
    extends State<EnseignantInformationsScreen> {
  final _api = ApiService();
  List<Information> _infos = [];
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
      final data = await _api.getInformationsEnseignant();
      setState(() {
        _infos = data.map((e) => Information.fromJson(e as Map<String, dynamic>)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const LoadingWidget(message: 'Chargement...')
        : _error != null
            ? ErrorRetryWidget(message: _error!, onRetry: _load)
            : _infos.isEmpty
                ? const EmptyWidget(
                    message: 'Aucune information disponible',
                    icon: Icons.notifications_outlined)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _infos.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => _InfoCard(info: _infos[i]),
                    ),
                  );
  }
}

class _InfoCard extends StatelessWidget {
  final Information info;
  const _InfoCard({required this.info});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.announcement_outlined,
                      size: 18, color: AppTheme.primary),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    info.titre,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(info.contenu,
                style: const TextStyle(fontSize: 13, color: Colors.black87, height: 1.4)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Icon(Icons.calendar_today, size: 12, color: Colors.grey),
                const SizedBox(width: 4),
                Text(info.date,
                    style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
