import 'package:flutter/material.dart';
import '../../models/eleve.dart';
import '../../models/assiduite.dart';
import '../../models/periode.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/loading_error_widget.dart';

class AssiduitesScreen extends StatefulWidget {
  final Eleve eleve;
  const AssiduitesScreen({super.key, required this.eleve});

  @override
  State<AssiduitesScreen> createState() => _AssiduitesScreenState();
}

class _AssiduitesScreenState extends State<AssiduitesScreen> {
  final _api = ApiService();

  List<Periode>   _periodes    = [];
  Periode?        _periode;
  List<Assiduite> _assiduites  = [];
  bool _loadingPeriodes = true;
  bool _loadingData     = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPeriodes();
  }

  Future<void> _loadPeriodes() async {
    try {
      final data = await _api.getPeriodes();
      setState(() {
        _periodes = data
            .map((p) => Periode.fromJson(p as Map<String, dynamic>))
            .toList();
        _loadingPeriodes = false;
        if (_periodes.isNotEmpty) {
          _periode = _periodes.first;
          _loadData();
        }
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loadingPeriodes = false; });
    }
  }

  Future<void> _loadData() async {
    if (_periode == null) return;
    setState(() { _loadingData = true; _error = null; });
    try {
      final data = await _api.getAssiduites(widget.eleve.id, _periode!.id);
      setState(() {
        _assiduites = data
            .map((a) => Assiduite.fromJson(a as Map<String, dynamic>))
            .toList();
        _loadingData = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loadingData = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final absences = _assiduites.where((a) => a.isAbsent).length;
    final retards  = _assiduites.where((a) => !a.isAbsent).length;

    return Scaffold(
      appBar: AppBar(title: const Text('Absences & Retards')),
      body: _loadingPeriodes
          ? const LoadingWidget()
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: DropdownButtonFormField<Periode>(
                    initialValue: _periode,
                    decoration: const InputDecoration(
                      labelText: 'Période',
                      prefixIcon: Icon(Icons.calendar_month),
                    ),
                    items: _periodes
                        .map((p) => DropdownMenuItem(
                            value: p, child: Text(p.libelle)))
                        .toList(),
                    onChanged: (p) {
                      setState(() => _periode = p);
                      _loadData();
                    },
                  ),
                ),

                // Compteurs
                if (!_loadingData && _assiduites.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Row(
                      children: [
                        _CountBadge(
                            count: absences,
                            label: 'Absence${absences > 1 ? 's' : ''}',
                            color: AppTheme.absent),
                        const SizedBox(width: 12),
                        _CountBadge(
                            count: retards,
                            label: 'Retard${retards > 1 ? 's' : ''}',
                            color: AppTheme.retard),
                      ],
                    ),
                  ),
                const SizedBox(height: 8),

                Expanded(
                  child: _loadingData
                      ? const LoadingWidget()
                      : _error != null
                          ? ErrorRetryWidget(
                              message: _error!, onRetry: _loadData)
                          : _assiduites.isEmpty
                              ? const EmptyWidget(
                                  message:
                                      'Aucune absence ni retard pour cette période.',
                                  icon: Icons.check_circle_outline,
                                )
                              : ListView.separated(
                                  padding: const EdgeInsets.all(16),
                                  itemCount: _assiduites.length,
                                  separatorBuilder: (_, __) =>
                                      const SizedBox(height: 6),
                                  itemBuilder: (_, i) =>
                                      _AssiduiteTile(a: _assiduites[i]),
                                ),
                ),
              ],
            ),
    );
  }
}

class _AssiduiteTile extends StatelessWidget {
  final Assiduite a;
  const _AssiduiteTile({required this.a});

  @override
  Widget build(BuildContext context) {
    final color  = a.isAbsent ? AppTheme.absent : AppTheme.retard;
    final label  = a.isAbsent ? 'Absence' : 'Retard';
    final icon   = a.isAbsent ? Icons.cancel_outlined : Icons.schedule;

    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.12),
          child: Icon(icon, color: color),
        ),
        title: Text(a.date,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(a.matiere ?? '—'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(label,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600)),
            ),
            if (a.remarque != null && a.remarque!.isNotEmpty)
              Text(a.remarque!,
                  style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  final int count;
  final String label;
  final Color color;
  const _CountBadge(
      {required this.count, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Text('$count',
              style: TextStyle(
                  fontSize: 22, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(color: color, fontSize: 13)),
        ],
      ),
    );
  }
}
