import 'package:flutter/material.dart';
import '../../models/annee_scolaire.dart';
import '../../models/eleve.dart';
import '../../utils/pdf_downloader.dart';
import '../../models/note_matiere.dart';
import '../../models/periode.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/loading_error_widget.dart';

class NotesScreen extends StatefulWidget {
  final Eleve eleve;
  const NotesScreen({super.key, required this.eleve});

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  final _api = ApiService();

  List<AnneeScolaire> _annees   = [];
  AnneeScolaire?      _anneeSelectionnee;
  List<Periode>       _periodes = [];
  Periode?            _periodeSelectionnee;
  List<NoteMatiere>   _matieres = [];

  bool _loadingAnnees  = true;
  bool _loadingPeriodes = false;
  bool _loadingNotes   = false;
  bool _loadingPdf     = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAnnees();
  }

  Future<void> _loadAnnees() async {
    setState(() { _loadingAnnees = true; _error = null; });
    try {
      final data = await _api.getAnneesScolaires();
      final annees = data
          .map((a) => AnneeScolaire.fromJson(a as Map<String, dynamic>))
          .toList();
      setState(() {
        _annees = annees;
        _loadingAnnees = false;
        // Sélectionner l'année en cours par défaut, sinon la plus récente
        _anneeSelectionnee = annees.isEmpty
            ? null
            : annees.firstWhere((a) => a.estEnCours, orElse: () => annees.first);
      });
      if (annees.isNotEmpty) _loadPeriodes();
    } catch (e) {
      // Fallback : charger les périodes sans filtre d'année
      await _loadPeriodesSansAnnee();
    }
  }

  Future<void> _loadPeriodes() async {
    if (_anneeSelectionnee == null) return;
    setState(() { _loadingPeriodes = true; _periodes = []; _periodeSelectionnee = null; _matieres = []; });
    try {
      final data = await _api.getPeriodesParAnnee(_anneeSelectionnee!.id);
      final periodes = data
          .map((p) => Periode.fromJson(p as Map<String, dynamic>))
          .toList();
      // Fallback : périodes non liées à une année (données antérieures à l'archivage)
      if (periodes.isEmpty) {
        await _loadPeriodesSansAnnee();
        return;
      }
      setState(() {
        _periodes             = periodes;
        _loadingPeriodes      = false;
        _periodeSelectionnee  = periodes.first;
      });
      _loadNotes();
    } catch (e) {
      setState(() { _error = e.toString(); _loadingPeriodes = false; });
    }
  }

  Future<void> _loadPeriodesSansAnnee() async {
    setState(() { _loadingAnnees = false; _loadingPeriodes = true; });
    try {
      final data = await _api.getPeriodes();
      setState(() {
        _periodes = data
            .map((p) => Periode.fromJson(p as Map<String, dynamic>))
            .toList();
        _loadingPeriodes = false;
        if (_periodes.isNotEmpty) {
          _periodeSelectionnee = _periodes.first;
          _loadNotes();
        }
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loadingPeriodes = false; });
    }
  }

  Future<void> _loadNotes() async {
    if (_periodeSelectionnee == null) return;
    setState(() { _loadingNotes = true; _error = null; });
    try {
      final data = await _api.getBulletin(
          widget.eleve.id, _periodeSelectionnee!.id);
      final raw = data['matieres'] as List<dynamic>? ?? [];
      setState(() {
        _matieres = raw
            .map<NoteMatiere>((m) => NoteMatiere.fromJson(m as Map<String, dynamic>))
            .toList();
        _loadingNotes = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loadingNotes = false; });
    }
  }

  Future<void> _telechargerPdf() async {
    if (_periodeSelectionnee == null) return;
    setState(() { _loadingPdf = true; });
    try {
      final bytes = await _api.getBulletinPdf(
          widget.eleve.id, _periodeSelectionnee!.id);
      await ouvrirPdf(
        bytes,
        'bulletin_${widget.eleve.id}_${_periodeSelectionnee!.id}.pdf',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : ${e.toString()}'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() { _loadingPdf = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isArchive = _anneeSelectionnee?.estCloturee ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notes & Bulletin'),
            if (isArchive) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.grey,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text('Archivé', style: TextStyle(color: Colors.white, fontSize: 11)),
              ),
            ],
          ],
        ),
        actions: [
          if (_matieres.isNotEmpty)
            _loadingPdf
                ? const Padding(
                    padding: EdgeInsets.all(14),
                    child: SizedBox(
                      width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    ),
                  )
                : IconButton(
                    icon: const Icon(Icons.picture_as_pdf),
                    tooltip: 'Télécharger le bulletin PDF',
                    onPressed: _telechargerPdf,
                  ),
        ],
      ),
      body: _loadingAnnees
          ? const LoadingWidget()
          : Column(
              children: [
                // ── Sélecteur Année ──────────────────────────────────────────
                if (_annees.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Année scolaire',
                        prefixIcon: Icon(Icons.school_outlined),
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      ),
                      child: DropdownButton<AnneeScolaire>(
                        value: _anneeSelectionnee,
                        isExpanded: true,
                        underline: const SizedBox(),
                        items: _annees.map((a) => DropdownMenuItem(
                          value: a,
                          child: Row(
                            children: [
                              Text(a.libelle),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                decoration: BoxDecoration(
                                  color: a.estEnCours ? Colors.green : Colors.grey,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  a.estEnCours ? 'En cours' : 'Archivée',
                                  style: const TextStyle(color: Colors.white, fontSize: 10),
                                ),
                              ),
                            ],
                          ),
                        )).toList(),
                        onChanged: (a) {
                          setState(() { _anneeSelectionnee = a; });
                          _loadPeriodes();
                        },
                      ),
                    ),
                  ),

                // ── Sélecteur Période ────────────────────────────────────────
                if (_loadingPeriodes)
                  const Padding(
                    padding: EdgeInsets.all(12),
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                else if (_periodes.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Période (Trimestre)',
                        prefixIcon: Icon(Icons.calendar_month),
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      ),
                      child: DropdownButton<Periode>(
                        value: _periodeSelectionnee,
                        isExpanded: true,
                        underline: const SizedBox(),
                        items: _periodes
                            .map((p) => DropdownMenuItem(
                                  value: p,
                                  child: Text(p.libelle),
                                ))
                            .toList(),
                        onChanged: (p) {
                          setState(() => _periodeSelectionnee = p);
                          _loadNotes();
                        },
                      ),
                    ),
                  ),

                const SizedBox(height: 8),

                // ── Notes ────────────────────────────────────────────────────
                Expanded(
                  child: _loadingNotes
                      ? const LoadingWidget(message: 'Chargement du bulletin...')
                      : _error != null
                          ? ErrorRetryWidget(message: _error!, onRetry: _loadNotes)
                          : _periodes.isEmpty && !_loadingPeriodes
                              ? const EmptyWidget(
                                  message: 'Aucune période configurée pour cette année scolaire.',
                                  icon: Icons.calendar_today_outlined,
                                )
                              : _periodeSelectionnee == null
                                  ? const EmptyWidget(
                                      message: 'Sélectionnez une période pour voir les notes.',
                                      icon: Icons.touch_app_outlined,
                                    )
                                  : _matieres.isEmpty
                                      ? const EmptyWidget(
                                          message: 'Aucune note pour cette période.',
                                          icon: Icons.grade_outlined,
                                        )
                                      : ListView.separated(
                                  padding: const EdgeInsets.all(16),
                                  itemCount: _matieres.length,
                                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                                  itemBuilder: (_, i) => _MatiereCard(matiere: _matieres[i]),
                                ),
                ),
              ],
            ),
    );
  }
}

// ── Card matière ──────────────────────────────────────────────────────────────

class _MatiereCard extends StatelessWidget {
  final NoteMatiere matiere;
  const _MatiereCard({required this.matiere});

  @override
  Widget build(BuildContext context) {
    final moyenne = matiere.moyenne;
    final color = moyenne != null ? AppTheme.noteColor(moyenne) : Colors.grey;

    return Card(
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.15),
          child: Text(
            matiere.abbr ?? '?',
            style: TextStyle(
                color: color, fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ),
        title: Text(
          matiere.matiere ?? 'Matière',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        trailing: moyenne != null
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  moyenne.toStringAsFixed(2),
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold),
                ),
              )
            : const Text('—'),
        children: matiere.notes.map((n) {
          return ListTile(
            dense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 20),
            leading: Text(n.type ?? '—',
                style: const TextStyle(fontWeight: FontWeight.w500)),
            title: Text(n.date),
            subtitle: Text('Coeff. ${n.coeff}'),
            trailing: Text(
              n.note.toStringAsFixed(2),
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: AppTheme.noteColor(n.note)),
            ),
          );
        }).toList(),
      ),
    );
  }
}
