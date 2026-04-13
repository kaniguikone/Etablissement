import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../models/classe_matiere.dart';
import '../../models/periode.dart';
import '../../theme/app_theme.dart';

// ── Statuts possibles ─────────────────────────────────────────────────────────

enum Statut { fait, enCours, reporte }

extension StatutExt on Statut {
  String get key => switch (this) {
    Statut.fait    => 'fait',
    Statut.enCours => 'en_cours',
    Statut.reporte => 'reporte',
  };

  String get label => switch (this) {
    Statut.fait    => 'Fait',
    Statut.enCours => 'En cours',
    Statut.reporte => 'Reporté',
  };

  Color get color => switch (this) {
    Statut.fait    => const Color(0xFF10b981),
    Statut.enCours => const Color(0xFFf59e0b),
    Statut.reporte => const Color(0xFFef4444),
  };

  IconData get icon => switch (this) {
    Statut.fait    => Icons.check_circle,
    Statut.enCours => Icons.timelapse,
    Statut.reporte => Icons.pause_circle,
  };

  static Statut? fromKey(String? key) => switch (key) {
    'fait'     => Statut.fait,
    'en_cours' => Statut.enCours,
    'reporte'  => Statut.reporte,
    _          => null,
  };
}

// ── Écran principal ───────────────────────────────────────────────────────────

class ProgrammeScreen extends StatefulWidget {
  const ProgrammeScreen({super.key});

  @override
  State<ProgrammeScreen> createState() => _ProgrammeScreenState();
}

class _ProgrammeScreenState extends State<ProgrammeScreen> {
  final _api = ApiService();

  List<ClasseMatiere> _classes = [];
  ClasseMatiere? _selection;
  Periode? _periode;

  List<Map<String, dynamic>> _chapitres = [];
  // progressions keyed by chapitre_id (String key from JSON)
  Map<String, Map<String, dynamic>> _progressions = {};

  bool _loadingData = true;
  bool _loadingChapitres = false;
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
      final classes  = results[0].map((e) => ClasseMatiere.fromJson(e)).toList();
      final periodes = results[1].map((e) => Periode.fromJson(e)).toList();

      setState(() {
        _classes  = classes;
        _periode  = periodes.isNotEmpty ? periodes.first : null;
        _loadingData = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loadingData = false; });
    }
  }

  Future<void> _loadChapitres() async {
    if (_selection == null || _periode == null) return;
    setState(() { _loadingChapitres = true; _error = null; });
    try {
      final list = await _api.getProgression(
        classeId:  _selection!.classeId,
        matiereId: _selection!.matiereId,
        periodeId: _periode!.id,
      );
      // L'API retourne une liste : [{ chapitre_id, titre, ordre, note_direction, progression }]
      final chapitres = <Map<String, dynamic>>[];
      final progressions = <String, Map<String, dynamic>>{};

      for (final item in list) {
        final m = Map<String, dynamic>.from(item as Map);
        // Reconstruire un objet chapitre compatible avec le reste du code
        chapitres.add({
          'id':             m['chapitre_id'],
          'titre':          m['titre'],
          'ordre':          m['ordre'],
          'note_direction': m['note_direction'],
        });
        if (m['progression'] != null) {
          progressions[m['chapitre_id'].toString()] =
              Map<String, dynamic>.from(m['progression'] as Map);
        }
      }

      setState(() {
        _chapitres    = chapitres;
        _progressions = progressions;
        _loadingChapitres = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loadingChapitres = false; });
    }
  }

  void _onSelectionChange() {
    if (_selection != null && _periode != null) _loadChapitres();
  }

  void _ouvrirFormulaire(Map<String, dynamic> chapitre) async {
    final chapitreId = chapitre['id'] as int;
    final prog = _progressions[chapitreId.toString()];

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProgressionForm(
        chapitre:  chapitre,
        classeId:  _selection!.classeId,
        matiereId: _selection!.matiereId,
        periodeId: _periode!.id,
        progression: prog,
        api: _api,
      ),
    );

    if (result == true) _loadChapitres();
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingData) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        // ── Filtres ─────────────────────────────────────────────────────────
        Container(
          color: Colors.grey.shade50,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Column(
            children: [
              DropdownButtonFormField<ClasseMatiere>(
                initialValue: _selection,
                decoration: const InputDecoration(
                  labelText: 'Classe / Matière',
                  isDense: true,
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                items: _classes.map((c) => DropdownMenuItem(
                  value: c,
                  child: Text(
                    '${c.nomClasse} — ${c.libelleMatiere}',
                    overflow: TextOverflow.ellipsis,
                  ),
                )).toList(),
                onChanged: (v) {
                  setState(() { _selection = v; _chapitres = []; _progressions = {}; });
                  _onSelectionChange();
                },
              ),
            ],
          ),
        ),

        // ── Corps ────────────────────────────────────────────────────────────
        Expanded(
          child: _buildBody(),
        ),
      ],
    );
  }

  Widget _buildBody() {
    if (_selection == null || _periode == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text(
            'Sélectionnez une classe/matière pour voir le programme.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
        ),
      );
    }

    if (_loadingChapitres) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 40),
            const SizedBox(height: 8),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: _loadChapitres, child: const Text('Réessayer')),
          ],
        ),
      );
    }

    if (_chapitres.isEmpty) {
      return const Center(
        child: Text(
          'Aucun chapitre défini pour cette matière.',
          style: TextStyle(color: Colors.grey),
        ),
      );
    }

    // Statistiques rapides
    final faits    = _progressions.values.where((p) => p['statut'] == 'fait').length;
    final enCours  = _progressions.values.where((p) => p['statut'] == 'en_cours').length;
    final reportes = _progressions.values.where((p) => p['statut'] == 'reporte').length;
    final total    = _chapitres.length;
    final taux     = total > 0 ? (faits / total * 100).round() : 0;

    return Column(
      children: [
        // Barre de progression
        _ProgressBar(faits: faits, enCours: enCours, reportes: reportes, total: total, taux: taux),

        // Liste des chapitres
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: _chapitres.length,
            separatorBuilder: (_, __) => const SizedBox(height: 6),
            itemBuilder: (_, i) {
              final ch  = _chapitres[i];
              final key = ch['id'].toString();
              final prog = _progressions[key];
              final statut = StatutExt.fromKey(prog?['statut'] as String?);
              return _ChapitreCard(
                chapitre: ch,
                statut: statut,
                observations: prog?['observations'] as String?,
                dateSeance: prog?['date_seance'] as String?,
                onTap: () => _ouvrirFormulaire(ch),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ── Barre de stats ────────────────────────────────────────────────────────────

class _ProgressBar extends StatelessWidget {
  final int faits, enCours, reportes, total, taux;
  const _ProgressBar({
    required this.faits, required this.enCours, required this.reportes,
    required this.total, required this.taux,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _StatBadge(count: faits,    label: 'Faits',    color: const Color(0xFF10b981)),
              _StatBadge(count: enCours,  label: 'En cours', color: const Color(0xFFf59e0b)),
              _StatBadge(count: reportes, label: 'Reportés', color: const Color(0xFFef4444)),
              _StatBadge(count: total - faits - enCours - reportes, label: 'À faire', color: Colors.grey),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: total > 0 ? faits / total : 0,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: AlwaysStoppedAnimation(
                      taux >= 80 ? const Color(0xFF10b981)
                        : taux >= 50 ? const Color(0xFFf59e0b)
                        : const Color(0xFFef4444),
                    ),
                    minHeight: 8,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text('$taux%', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatBadge extends StatelessWidget {
  final int count;
  final String label;
  final Color color;
  const _StatBadge({required this.count, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$count', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }
}

// ── Carte chapitre ────────────────────────────────────────────────────────────

class _ChapitreCard extends StatelessWidget {
  final Map<String, dynamic> chapitre;
  final Statut? statut;
  final String? observations;
  final String? dateSeance;
  final VoidCallback onTap;

  const _ChapitreCard({
    required this.chapitre,
    required this.statut,
    required this.observations,
    required this.dateSeance,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = statut?.color ?? Colors.grey.shade400;
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      elevation: 1,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Numéro
              Container(
                width: 30, height: 30,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                alignment: Alignment.center,
                child: Text(
                  '${chapitre['ordre']}',
                  style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 13),
                ),
              ),
              const SizedBox(width: 10),
              // Titre + observations
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      chapitre['titre'] as String,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    if (chapitre['note_direction'] != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        '📌 ${chapitre['note_direction']}',
                        style: const TextStyle(fontSize: 11, color: Colors.blueGrey),
                      ),
                    ],
                    if (observations != null && observations!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        observations!,
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (dateSeance != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        dateSeance!,
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Badge statut
              Column(
                children: [
                  Icon(statut?.icon ?? Icons.radio_button_unchecked, color: color, size: 22),
                  const SizedBox(height: 2),
                  Text(
                    statut?.label ?? 'À faire',
                    style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Formulaire (bottom sheet) ─────────────────────────────────────────────────

class _ProgressionForm extends StatefulWidget {
  final Map<String, dynamic> chapitre;
  final int classeId, matiereId, periodeId;
  final Map<String, dynamic>? progression;
  final ApiService api;

  const _ProgressionForm({
    required this.chapitre,
    required this.classeId,
    required this.matiereId,
    required this.periodeId,
    required this.progression,
    required this.api,
  });

  @override
  State<_ProgressionForm> createState() => _ProgressionFormState();
}

class _ProgressionFormState extends State<_ProgressionForm> {
  late Statut? _statut;
  late TextEditingController _obsCtrl;
  late TextEditingController _dateCtrl;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _statut  = StatutExt.fromKey(widget.progression?['statut'] as String?);
    _obsCtrl = TextEditingController(text: widget.progression?['observations'] as String? ?? '');
    _dateCtrl = TextEditingController(text: widget.progression?['date_seance'] as String? ?? '');
  }

  @override
  void dispose() {
    _obsCtrl.dispose();
    _dateCtrl.dispose();
    super.dispose();
  }

  bool get _obsRequise =>
      _statut == Statut.enCours || _statut == Statut.reporte;

  Future<void> _sauvegarder() async {
    if (_statut == null) return;
    if (_obsRequise && _obsCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Les observations sont obligatoires pour ce statut.');
      return;
    }
    if (_dateCtrl.text.trim().isEmpty) {
      setState(() => _error = 'La date de séance est obligatoire.');
      return;
    }

    setState(() { _saving = true; _error = null; });
    try {
      await widget.api.sauvegarderProgression({
        'chapitre_id':  widget.chapitre['id'],
        'classe_id':    widget.classeId,
        'matiere_id':   widget.matiereId,
        'periode_id':   widget.periodeId,
        'statut':       _statut!.key,
        'observations': _obsCtrl.text.trim(),
        'date_seance':  _dateCtrl.text.trim(),
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() { _error = e.toString(); _saving = false; });
    }
  }

  Future<void> _supprimer() async {
    final progId = widget.progression?['id'] as int?;
    if (progId == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer'),
        content: const Text('Effacer la progression pour ce chapitre ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Supprimer', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() { _saving = true; _error = null; });
    try {
      await widget.api.supprimerProgression(progId);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() { _error = e.toString(); _saving = false; });
    }
  }

  Future<void> _choisirDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: DateTime(now.year - 1),
      lastDate: now,
      locale: const Locale('fr'),
    );
    if (picked != null) {
      _dateCtrl.text = picked.toIso8601String().substring(0, 10);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Poignée
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 14),

            // Titre chapitre
            Text(
              'Ch. ${widget.chapitre['ordre']} — ${widget.chapitre['titre']}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            if (widget.chapitre['note_direction'] != null) ...[
              const SizedBox(height: 4),
              Text(
                '📌 ${widget.chapitre['note_direction']}',
                style: const TextStyle(fontSize: 12, color: Colors.blueGrey),
              ),
            ],
            const SizedBox(height: 16),

            // Statuts
            const Text('Statut *', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            Row(
              children: Statut.values.map((s) => Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: _StatutButton(
                    statut: s,
                    selected: _statut == s,
                    onTap: () => setState(() { _statut = s; _error = null; }),
                  ),
                ),
              )).toList(),
            ),
            const SizedBox(height: 14),

            // Date de séance
            TextFormField(
              controller: _dateCtrl,
              readOnly: true,
              decoration: InputDecoration(
                labelText: 'Date de séance *',
                border: const OutlineInputBorder(),
                isDense: true,
                suffixIcon: IconButton(
                  icon: const Icon(Icons.calendar_today, size: 18),
                  onPressed: _choisirDate,
                ),
              ),
              onTap: _choisirDate,
            ),
            const SizedBox(height: 12),

            // Observations
            TextFormField(
              controller: _obsCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: _obsRequise
                    ? 'Observations * (obligatoire)'
                    : 'Observations (optionnel)',
                border: const OutlineInputBorder(),
                isDense: true,
              ),
            ),
            if (_obsRequise)
              const Padding(
                padding: EdgeInsets.only(top: 4),
                child: Text(
                  'Expliquez pourquoi le chapitre est en cours ou reporté.',
                  style: TextStyle(fontSize: 11, color: Colors.orange),
                ),
              ),

            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
            ],

            const SizedBox(height: 18),

            // Boutons
            Row(
              children: [
                if (widget.progression != null)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _saving ? null : _supprimer,
                      icon: const Icon(Icons.delete_outline, size: 18),
                      label: const Text('Effacer'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                      ),
                    ),
                  ),
                if (widget.progression != null) const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: (_saving || _statut == null) ? null : _sauvegarder,
                    icon: _saving
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.save, size: 18),
                    label: const Text('Enregistrer'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatutButton extends StatelessWidget {
  final Statut statut;
  final bool selected;
  final VoidCallback onTap;
  const _StatutButton({required this.statut, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: selected ? statut.color : statut.color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: statut.color, width: selected ? 0 : 1),
        ),
        child: Column(
          children: [
            Icon(statut.icon, color: selected ? Colors.white : statut.color, size: 20),
            const SizedBox(height: 2),
            Text(
              statut.label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : statut.color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
