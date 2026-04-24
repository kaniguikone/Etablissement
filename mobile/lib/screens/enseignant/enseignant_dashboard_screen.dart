import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../models/classe_matiere.dart';
import '../../models/devoir.dart';
import '../../theme/app_theme.dart';
import '../../widgets/loading_error_widget.dart';
import 'notes_saisie_screen.dart';
import 'devoirs_screen.dart';

class EnseignantDashboardScreen extends StatefulWidget {
  const EnseignantDashboardScreen({super.key});

  @override
  State<EnseignantDashboardScreen> createState() =>
      _EnseignantDashboardScreenState();
}

class _EnseignantDashboardScreenState extends State<EnseignantDashboardScreen> {
  final _api = ApiService();
  List<ClasseMatiere> _classes = [];
  List<Devoir> _devoirs = [];
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
      final results = await Future.wait([
        _api.getClassesEnseignant(),
        _api.getDevoirsEnseignant(),
      ]);
      setState(() {
        _classes = results[0].map((e) => ClasseMatiere.fromJson(e)).toList();
        _devoirs = results[1].map((e) => Devoir.fromJson(e)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  // Classes uniques
  List<Map<String, dynamic>> get _classesUniques {
    final seen = <int>{};
    final result = <Map<String, dynamic>>[];
    for (final cm in _classes) {
      if (seen.add(cm.classeId)) {
        result.add({'id': cm.classeId, 'nom': cm.nomClasse, 'abbr': cm.abbrClasse, 'niveau': cm.niveau});
      }
    }
    return result;
  }

  // Devoirs sans notes (approximation : récents)
  List<Devoir> get _devoirsRecents => _devoirs.take(5).toList();

  @override
  Widget build(BuildContext context) {
    if (_loading) return const LoadingWidget(message: 'Chargement...');
    if (_error != null) return ErrorRetryWidget(message: _error!, onRetry: _load);

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── KPIs ──
          Row(
            children: [
              _KpiCard(
                icon: Icons.class_,
                label: 'Classes',
                value: _classesUniques.length.toString(),
                color: AppTheme.primary,
              ),
              const SizedBox(width: 12),
              _KpiCard(
                icon: Icons.assignment,
                label: 'Devoirs',
                value: _devoirs.length.toString(),
                color: const Color(0xFF2E7D32),
              ),
              const SizedBox(width: 12),
              _KpiCard(
                icon: Icons.book,
                label: 'Matières',
                value: _classes.map((c) => c.matiereId).toSet().length.toString(),
                color: const Color(0xFFF57F17),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // ── Mes classes ──
          const _SectionHeader(title: 'Mes classes', icon: Icons.school),
          const SizedBox(height: 8),
          if (_classesUniques.isEmpty)
            const EmptyWidget(message: 'Aucune classe assignée', icon: Icons.class_)
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _classesUniques.map((c) => _ClasseChip(
                abbr: c['abbr'] as String,
                nom: c['nom'] as String,
                niveau: c['niveau'] as String?,
              )).toList(),
            ),
          const SizedBox(height: 20),

          // ── Mes matières par classe ──
          const _SectionHeader(title: 'Mes matières', icon: Icons.menu_book),
          const SizedBox(height: 8),
          ..._classesUniques.map((cl) {
            final matieres = _classes
                .where((cm) => cm.classeId == cl['id'])
                .map((cm) => cm.libelleMatiere)
                .toList();
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                dense: true,
                leading: CircleAvatar(
                  radius: 18,
                  backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                  child: Text(cl['abbr'] as String,
                      style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primary)),
                ),
                title: Text(cl['nom'] as String,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: Text(matieres.join(', '),
                    style: const TextStyle(fontSize: 12)),
              ),
            );
          }),
          const SizedBox(height: 20),

          // ── Devoirs récents ──
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const _SectionHeader(title: 'Devoirs récents', icon: Icons.assignment_outlined),
              TextButton(
                onPressed: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const DevoirsScreen(standalone: true))),
                child: const Text('Voir tout'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_devoirsRecents.isEmpty)
            const EmptyWidget(message: 'Aucun devoir', icon: Icons.assignment_outlined)
          else
            ..._devoirsRecents.map((d) => _DevoirTile(
              devoir: d,
              onSaisirNotes: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => NotesSaisieScreen(devoir: d)),
              ),
            )),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _KpiCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 6, offset: const Offset(0, 2))],
            border: Border(left: BorderSide(color: color, width: 4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(height: 6),
              Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
              Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      );
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  const _SectionHeader({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.primary),
          const SizedBox(width: 6),
          Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        ],
      );
}

class _ClasseChip extends StatelessWidget {
  final String abbr;
  final String nom;
  final String? niveau;
  const _ClasseChip({required this.abbr, required this.nom, this.niveau});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Text(abbr, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary, fontSize: 14)),
            if (niveau != null)
              Text(niveau!, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ],
        ),
      );
}

class _DevoirTile extends StatelessWidget {
  final Devoir devoir;
  final VoidCallback onSaisirNotes;
  const _DevoirTile({required this.devoir, required this.onSaisirNotes});

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
            child: Text(devoir.typeCode ?? '?',
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primary)),
          ),
          title: Text(devoir.code, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text('${devoir.matiere ?? '—'} · ${devoir.cible} · ${devoir.date}',
              style: const TextStyle(fontSize: 12)),
          trailing: TextButton(
            onPressed: onSaisirNotes,
            child: const Text('Notes', style: TextStyle(fontSize: 12)),
          ),
        ),
      );
}
