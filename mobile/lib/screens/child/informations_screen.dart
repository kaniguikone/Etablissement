import 'package:flutter/material.dart';
import '../../models/eleve.dart';
import '../../models/information.dart';
import '../../services/api_service.dart';
import '../../widgets/loading_error_widget.dart';

class InformationsScreen extends StatefulWidget {
  final Eleve eleve;
  const InformationsScreen({super.key, required this.eleve});

  @override
  State<InformationsScreen> createState() => _InformationsScreenState();
}

class _InformationsScreenState extends State<InformationsScreen> {
  final _api = ApiService();
  List<Information> _items = [];
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
      final data = await _api.getInformations();
      setState(() {
        _items = data
            .map((i) => Information.fromJson(i as Map<String, dynamic>))
            .toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Informations')),
      body: _loading
          ? const LoadingWidget()
          : _error != null
              ? ErrorRetryWidget(message: _error!, onRetry: _load)
              : _items.isEmpty
                  ? const EmptyWidget(
                      message: 'Aucune information disponible.',
                      icon: Icons.announcement_outlined,
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _items.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => _InfoCard(info: _items[i]),
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
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.campaign_outlined,
                    color: Color(0xFF5C6BC0), size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    info.titre,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              info.date,
              style: const TextStyle(color: Colors.grey, fontSize: 12),
            ),
            const Divider(height: 16),
            Text(info.contenu, style: const TextStyle(height: 1.5)),
          ],
        ),
      ),
    );
  }
}
