import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../models/devoir.dart';
import '../../models/periode.dart';
import '../../theme/app_theme.dart';
import '../../widgets/loading_error_widget.dart';
import 'devoir_form_screen.dart';
import 'notes_saisie_screen.dart';

class DevoirsScreen extends StatefulWidget {
  final bool standalone;
  const DevoirsScreen({super.key, this.standalone = false});

  @override
  State<DevoirsScreen> createState() => DevoirsScreenState();
}

// public pour pouvoir rafraîchir depuis l'extérieur si besoin

class DevoirsScreenState extends State<DevoirsScreen> {
  final _api = ApiService();
  List<Devoir> _devoirs = [];
  List<Periode> _periodes = [];
  Periode? _periodeSelectionnee;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPeriodes();
  }

  Future<void> _loadPeriodes() async {
    try {
      final data = await _api.getPeriodesEnseignant();
      setState(() {
        _periodes = data.map((e) => Periode.fromJson(e)).toList();
      });
    } catch (_) {}
    load();
  }

  Future<void> load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.getDevoirsEnseignant(
        periodeId: _periodeSelectionnee?.id,
      );
      setState(() {
        _devoirs = data.map((e) => Devoir.fromJson(e)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Widget _body() => Column(
      children: [
        // ── Filtre période ──
        if (_periodes.isNotEmpty)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: DropdownButtonFormField<Periode>(
              initialValue: _periodeSelectionnee,
              decoration: const InputDecoration(
                labelText: 'Filtrer par période',
                prefixIcon: Icon(Icons.filter_list),
                isDense: true,
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              items: [
                const DropdownMenuItem(value: null, child: Text('Toutes les périodes')),
                ..._periodes.map((p) => DropdownMenuItem(value: p, child: Text(p.label))),
              ],
              onChanged: (p) {
                setState(() => _periodeSelectionnee = p);
                load();
              },
            ),
          ),

        // ── Liste ──
        Expanded(
          child: _loading
              ? const LoadingWidget(message: 'Chargement...')
              : _error != null
                  ? ErrorRetryWidget(message: _error!, onRetry: load)
                  : _devoirs.isEmpty
                      ? const EmptyWidget(
                          message: 'Aucun devoir trouvé',
                          icon: Icons.assignment_outlined)
                      : RefreshIndicator(
                          onRefresh: load,
                          child: ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _devoirs.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (_, i) => _DevoirCard(
                              devoir: _devoirs[i],
                              onEdit: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => DevoirFormScreen(devoir: _devoirs[i]),
                                  ),
                                );
                                load();
                              },
                              onNotes: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => NotesSaisieScreen(devoir: _devoirs[i]),
                                ),
                              ),
                            ),
                          ),
                        ),
        ),
      ],
    );

  @override
  Widget build(BuildContext context) {
    if (!widget.standalone) return _body();
    return Scaffold(
      appBar: AppBar(title: const Text('Devoirs')),
      body: _body(),
    );
  }
}

// ── Widget carte devoir ──────────────────────────────────────────────────────

class _DevoirCard extends StatelessWidget {
  final Devoir devoir;
  final VoidCallback onEdit;
  final VoidCallback onNotes;

  const _DevoirCard({required this.devoir, required this.onEdit, required this.onNotes});

  static const _palette = [
    Color(0xFF1565C0), Color(0xFF2E7D32), Color(0xFFC62828),
    Color(0xFFF57F17), Color(0xFF00838F), Color(0xFF6A1B9A),
  ];

  Color get _couleur => _palette[(devoir.matiereId ?? 0) % _palette.length];

  @override
  Widget build(BuildContext context) {
    return Card(
      child: IntrinsicHeight(
        child: Row(
          children: [
            // Bande colorée
            Container(
              width: 5,
              decoration: BoxDecoration(
                color: _couleur,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                ),
              ),
            ),
            // Badge type
            Container(
              width: 56,
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
                decoration: BoxDecoration(
                  color: _couleur.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  devoir.typeCode ?? '?',
                  style: TextStyle(fontWeight: FontWeight.bold, color: _couleur, fontSize: 11),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            // Infos
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(devoir.code,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    const SizedBox(height: 2),
                    Text(devoir.matiere ?? '—',
                        style: const TextStyle(fontSize: 12, color: Colors.black87)),
                    Text('${devoir.cible} · coeff ${devoir.coeff}',
                        style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    if (devoir.periode != null)
                      Text(devoir.periode!,
                          style: TextStyle(fontSize: 11, color: _couleur)),
                  ],
                ),
              ),
            ),
            // Date + actions
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(devoir.date,
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: _couleur)),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _ActionBtn(icon: Icons.edit_outlined, onTap: onEdit, color: Colors.grey),
                      const SizedBox(width: 4),
                      _ActionBtn(icon: Icons.grading, onTap: onNotes, color: AppTheme.primary),
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
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color color;
  const _ActionBtn({required this.icon, required this.onTap, required this.color});

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: color),
        ),
      );
}
