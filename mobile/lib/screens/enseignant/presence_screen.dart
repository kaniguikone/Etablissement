import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../models/classe_matiere.dart';
import '../../models/periode.dart';
import '../../theme/app_theme.dart';
import '../../widgets/loading_error_widget.dart';

class PresenceScreen extends StatefulWidget {
  const PresenceScreen({super.key});

  @override
  State<PresenceScreen> createState() => PresenceScreenState();
}

class PresenceScreenState extends State<PresenceScreen> {
  final _api = ApiService();

  List<ClasseMatiere> _classes = [];
  List<Periode> _periodes = [];
  ClasseMatiere? _selection;
  Periode? _periode;
  DateTime _date = DateTime.now();
  List<Map<String, dynamic>> _eleves = [];
  Map<int, String> _statuts = {};

  bool _loadingData = true;
  bool _loadingEleves = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        _api.getClassesEnseignant(),
        _api.getPeriodesEnseignant(),
      ]);
      setState(() {
        _classes  = results[0].map((e) => ClasseMatiere.fromJson(e)).toList();
        _periodes = results[1].map((e) => Periode.fromJson(e)).toList();
        _loadingData = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loadingData = false; });
    }
  }

  Future<void> _loadEleves() async {
    if (_selection == null || _periode == null) return;
    setState(() { _loadingEleves = true; _error = null; });
    try {
      final data = await _api.getFeuillePresence(
        classeId:  _selection!.classeId,
        matiereId: _selection!.matiereId,
        periodeId: _periode!.id,
        date:      _date.toIso8601String().substring(0, 10),
      );
      final eleves = data.cast<Map<String, dynamic>>();
      final statuts = <int, String>{};
      for (final e in eleves) {
        statuts[int.parse(e['eleve_id'].toString())] = e['statut'] as String? ?? 'present';
      }
      setState(() {
        _eleves  = eleves;
        _statuts = statuts;
        _loadingEleves = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loadingEleves = false; });
    }
  }

  Future<void> sauvegarder() async {
    if (_selection == null || _periode == null || _eleves.isEmpty) return;
    setState(() { _saving = true; _error = null; });
    try {
      final assiduites = _eleves.map((e) {
        final id = int.parse(e['eleve_id'].toString());
        return {
          'eleve_id': id,
          'statut':   _statuts[id] ?? 'present',
          'remarque': '',
        };
      }).toList();

      await _api.sauvegarderPresences({
        'classe_id':  _selection!.classeId,
        'matiere_id': _selection!.matiereId,
        'periode_id': _periode!.id,
        'date':       _date.toIso8601String().substring(0, 10),
        'assiduites': assiduites,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Présences enregistrées avec succès'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _saving = false);
    }
  }

  String get _dateLabel {
    final jours = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
    final mois  = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
    return '${jours[_date.weekday - 1]}. ${_date.day} ${mois[_date.month - 1]}. ${_date.year}';
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingData) return const LoadingWidget(message: 'Chargement...');

    return Column(
      children: [
        // ── Filtres ──
        Container(
          color: Colors.white,
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              // Classe + Matière
              DropdownButtonFormField<ClasseMatiere>(
                initialValue: _selection,
                decoration: const InputDecoration(
                  labelText: 'Classe · Matière',
                  prefixIcon: Icon(Icons.class_),
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                items: _classes.map((cm) => DropdownMenuItem(
                  value: cm,
                  child: Text(cm.label, style: const TextStyle(fontSize: 13)),
                )).toList(),
                onChanged: (cm) {
                  setState(() => _selection = cm);
                  _loadEleves();
                },
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  // Période
                  Expanded(
                    child: DropdownButtonFormField<Periode>(
                      initialValue: _periode,
                      decoration: const InputDecoration(
                        labelText: 'Période',
                        prefixIcon: Icon(Icons.event_note),
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                      items: _periodes.map((p) => DropdownMenuItem(
                        value: p,
                        child: Text(p.abbr ?? p.libelle, style: const TextStyle(fontSize: 13)),
                      )).toList(),
                      onChanged: (p) {
                        setState(() => _periode = p);
                        _loadEleves();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Date
                  OutlinedButton.icon(
                    onPressed: () async {
                      final d = await showDatePicker(
                        context: context,
                        initialDate: _date,
                        firstDate: DateTime(2020),
                        lastDate: DateTime(2030),
                      );
                      if (d != null) {
                        setState(() => _date = d);
                        _loadEleves();
                      }
                    },
                    icon: const Icon(Icons.calendar_today, size: 16),
                    label: Text(_dateLabel, style: const TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        // ── Légende ──
        if (_eleves.isNotEmpty)
          Container(
            color: Colors.grey[50],
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                const _LegendChip(label: 'Présent', color: Colors.green),
                const SizedBox(width: 8),
                const _LegendChip(label: 'Absent', color: AppTheme.absent),
                const SizedBox(width: 8),
                const _LegendChip(label: 'Retard', color: AppTheme.retard),
                const Spacer(),
                Text('${_eleves.length} élèves', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),

        if (_error != null)
          Container(
            margin: const EdgeInsets.all(12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red[50], borderRadius: BorderRadius.circular(8)),
            child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
          ),

        if (_saving)
          const LinearProgressIndicator(),

        // ── Liste élèves ──
        Expanded(
          child: _loadingEleves
              ? const LoadingWidget(message: 'Chargement des élèves...')
              : _eleves.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.people_outline, size: 64, color: Colors.grey[300]),
                          const SizedBox(height: 12),
                          Text(
                            _selection == null
                                ? 'Sélectionnez une classe et une période'
                                : 'Aucun élève trouvé',
                            style: TextStyle(color: Colors.grey[500]),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 80),
                      itemCount: _eleves.length,
                      itemBuilder: (_, i) {
                        final e = _eleves[i];
                        final id = int.parse(e['eleve_id'].toString());
                        final statut = _statuts[id] ?? 'present';
                        return _ElevePresenceTile(
                          nom: '${e['nom']} ${e['prenoms']}',
                          matricule: e['matricule'] as String? ?? '',
                          photoUrl: e['photo_url'] as String?,
                          statut: statut,
                          onStatutChange: (s) => setState(() => _statuts[id] = s),
                        );
                      },
                    ),
        ),
      ],
    );
  }
}

// ── Widgets ──────────────────────────────────────────────────────────────────

class _LegendChip extends StatelessWidget {
  final String label;
  final Color color;
  const _LegendChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Container(width: 10, height: 10,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        ],
      );
}

class _ElevePresenceTile extends StatelessWidget {
  final String nom;
  final String matricule;
  final String? photoUrl;
  final String statut;
  final ValueChanged<String> onStatutChange;

  const _ElevePresenceTile({
    required this.nom,
    required this.matricule,
    this.photoUrl,
    required this.statut,
    required this.onStatutChange,
  });

  Color get _bgColor {
    return switch (statut) {
      'absent' => Colors.red[50]!,
      'retard' => Colors.orange[50]!,
      _ => Colors.green[50]!,
    };
  }

  Color get _borderColor {
    return switch (statut) {
      'absent' => AppTheme.absent,
      'retard' => AppTheme.retard,
      _ => Colors.green,
    };
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: _bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _borderColor.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: Colors.white,
            backgroundImage: photoUrl != null ? NetworkImage(photoUrl!) : null,
            child: photoUrl == null
                ? Text(nom.isNotEmpty ? nom[0].toUpperCase() : '?',
                    style: TextStyle(color: _borderColor, fontWeight: FontWeight.bold))
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(nom, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                Text(matricule, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ],
            ),
          ),
          // Boutons statut
          _StatutBtn(
            label: 'P',
            color: Colors.green,
            selected: statut == 'present',
            onTap: () => onStatutChange('present'),
          ),
          const SizedBox(width: 4),
          _StatutBtn(
            label: 'A',
            color: AppTheme.absent,
            selected: statut == 'absent',
            onTap: () => onStatutChange('absent'),
          ),
          const SizedBox(width: 4),
          _StatutBtn(
            label: 'R',
            color: AppTheme.retard,
            selected: statut == 'retard',
            onTap: () => onStatutChange('retard'),
          ),
        ],
      ),
    );
  }
}

class _StatutBtn extends StatelessWidget {
  final String label;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _StatutBtn({required this.label, required this.color, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: selected ? color : Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 2),
          ),
          child: Center(
            child: Text(label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: selected ? Colors.white : color,
                )),
          ),
        ),
      );
}
