import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../services/api_service.dart';
import '../../services/offline_notes_service.dart';
import '../../models/devoir.dart';
import '../../theme/app_theme.dart';
import '../../widgets/loading_error_widget.dart';

class NotesSaisieScreen extends StatefulWidget {
  final Devoir devoir;
  const NotesSaisieScreen({super.key, required this.devoir});

  @override
  State<NotesSaisieScreen> createState() => _NotesSaisieScreenState();
}

class _NotesSaisieScreenState extends State<NotesSaisieScreen> {
  final _api            = ApiService();
  final _offlineService = OfflineNotesService();

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  List<Map<String, dynamic>> _eleves = [];
  List<Map<String, dynamic>> _classesNiveau = [];
  Map<int, TextEditingController> _controllers = {};
  int? _classeSelectionneeId;
  bool _loading = true;
  bool _saving  = false;
  bool _syncing = false;
  int  _pendingCount = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
    _rafraichirPendingCount();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final connecte = results.any((r) => r != ConnectivityResult.none);
      if (connecte && _pendingCount > 0 && !_syncing) {
        _synchroniser();
      }
    });
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    for (final c in _controllers.values) { c.dispose(); }
    super.dispose();
  }

  Future<void> _rafraichirPendingCount() async {
    final n = await _offlineService.nombreEnAttente();
    if (mounted) setState(() => _pendingCount = n);
  }

  Future<void> _synchroniser() async {
    setState(() { _syncing = true; _error = null; });
    final enAttente = await _offlineService.enAttente();
    int ok = 0;
    for (final payload in enAttente) {
      try {
        final devoirId = int.parse(payload['devoir_id'].toString());
        final notes    = (payload['notes'] as List).cast<Map<String, dynamic>>();
        await _api.sauvegarderNotes(devoirId, notes);
        await _offlineService.supprimer(payload);
        ok++;
      } catch (_) {
        // garde les autres pour le prochain essai
      }
    }
    await _rafraichirPendingCount();
    setState(() => _syncing = false);
    if (mounted && ok > 0) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('$ok devoir(s) synchronisé(s) avec succès'),
        backgroundColor: Colors.green,
      ));
    }
  }

  Future<void> _load({int? classeId}) async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.getNotesDevoir(widget.devoir.id, classeId: classeId);
      final notes   = (data['notes'] as List? ?? []);
      final classes = (data['classes_niveau'] as List? ?? []);

      for (final c in _controllers.values) { c.dispose(); }
      _controllers = {};

      for (final e in notes) {
        final eleveId = int.parse(e['eleve_id'].toString());
        final ctrl = TextEditingController(
          text: e['note'] != null ? e['note'].toString() : '',
        );
        _controllers[eleveId] = ctrl;
      }

      setState(() {
        _eleves        = notes.cast<Map<String, dynamic>>();
        _classesNiveau = classes.cast<Map<String, dynamic>>();
        _loading       = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _sauvegarder() async {
    setState(() { _saving = true; _error = null; });

    final notes = _eleves.map((e) {
      final eleveId = int.parse(e['eleve_id'].toString());
      final val     = _controllers[eleveId]?.text.trim();
      return {
        'eleve_id': eleveId,
        'note': val != null && val.isNotEmpty ? double.tryParse(val) : null,
      };
    }).toList();

    try {
      await _api.sauvegarderNotes(widget.devoir.id, notes.cast<Map<String, dynamic>>());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Notes enregistrées avec succès'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (_) {
      // Pas de réseau : stockage local
      final payload = {
        'devoir_id': widget.devoir.id,
        if (_classeSelectionneeId != null) 'classe_id': _classeSelectionneeId,
        'notes': notes,
      };
      await _offlineService.sauvegarder(payload);
      await _rafraichirPendingCount();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sauvegardé hors ligne — sera synchronisé dès la reconnexion'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 4),
          ),
        );
      }
    } finally {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.devoir.code),
            Text(
              '${widget.devoir.matiere ?? ''} · ${widget.devoir.cible}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          if (_eleves.isNotEmpty)
            TextButton.icon(
              onPressed: _saving ? null : _sauvegarder,
              icon: _saving
                  ? const SizedBox(width: 16, height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.save, color: Colors.white),
              label: const Text('Sauver', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: _loading
          ? const LoadingWidget(message: 'Chargement...')
          : _error != null && _eleves.isEmpty
              ? ErrorRetryWidget(message: _error!, onRetry: _load)
              : Column(
                  children: [
                    // ── Bannière hors-ligne ──
                    if (_pendingCount > 0)
                      Material(
                        color: Colors.orange[700],
                        child: InkWell(
                          onTap: _syncing ? null : _synchroniser,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            child: Row(
                              children: [
                                _syncing
                                    ? const SizedBox(
                                        width: 16, height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2, color: Colors.white))
                                    : const Icon(Icons.cloud_upload_outlined,
                                        color: Colors.white, size: 18),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    _syncing
                                        ? 'Synchronisation en cours…'
                                        : '$_pendingCount devoir(s) en attente — Appuyez pour synchroniser',
                                    style: const TextStyle(color: Colors.white, fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                    // Sélecteur classe si devoir de niveau
                    if (_classesNiveau.isNotEmpty)
                      Container(
                        color: Colors.white,
                        padding: const EdgeInsets.all(12),
                        child: DropdownButtonFormField<int>(
                          initialValue: _classeSelectionneeId,
                          decoration: const InputDecoration(
                            labelText: 'Sélectionner une classe',
                            prefixIcon: Icon(Icons.class_),
                            isDense: true,
                          ),
                          items: _classesNiveau.map((c) => DropdownMenuItem(
                            value: int.parse(c['id'].toString()),
                            child: Text(c['nom_classe'] as String),
                          )).toList(),
                          onChanged: (id) {
                            setState(() => _classeSelectionneeId = id);
                            _load(classeId: id);
                          },
                        ),
                      ),

                    if (_error != null)
                      Container(
                        margin: const EdgeInsets.all(12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red[50],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(_error!, style: const TextStyle(color: Colors.red)),
                      ),

                    // En-tête info devoir
                    Container(
                      color: AppTheme.primary.withValues(alpha: 0.05),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline, size: 16, color: AppTheme.primary),
                          const SizedBox(width: 8),
                          Text(
                            'Coeff ${widget.devoir.coeff} · ${widget.devoir.date}',
                            style: const TextStyle(fontSize: 13, color: AppTheme.primary),
                          ),
                          const Spacer(),
                          Text(
                            '${_eleves.length} élèves',
                            style: const TextStyle(fontSize: 13, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),

                    if (_saving) const LinearProgressIndicator(),

                    if (_eleves.isEmpty && _classesNiveau.isEmpty)
                      const Expanded(
                        child: EmptyWidget(
                          message: 'Aucun élève trouvé',
                          icon: Icons.people_outline,
                        ),
                      )
                    else if (_eleves.isEmpty)
                      const Expanded(
                        child: Center(
                          child: Text('Sélectionnez une classe pour afficher les élèves',
                              style: TextStyle(color: Colors.grey)),
                        ),
                      )
                    else
                      Expanded(
                        child: ListView.builder(
                          padding: const EdgeInsets.only(bottom: 16),
                          itemCount: _eleves.length,
                          itemBuilder: (_, i) {
                            final e      = _eleves[i];
                            final eleveId = int.parse(e['eleve_id'].toString());
                            final ctrl   = _controllers[eleveId]!;
                            return _EleveNoteTile(
                              nom:        '${e['nom_eleve']} ${e['prenoms_eleve']}',
                              matricule:  e['matricule_eleve'] as String? ?? '',
                              controller: ctrl,
                            );
                          },
                        ),
                      ),
                  ],
                ),
    );
  }
}

class _EleveNoteTile extends StatefulWidget {
  final String nom;
  final String matricule;
  final TextEditingController controller;

  const _EleveNoteTile({
    required this.nom,
    required this.matricule,
    required this.controller,
  });

  @override
  State<_EleveNoteTile> createState() => _EleveNoteTileState();
}

class _EleveNoteTileState extends State<_EleveNoteTile> {
  Color _noteColor(String val) {
    final n = double.tryParse(val);
    if (n == null) return Colors.grey;
    return AppTheme.noteColor(n);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
              child: Text(
                widget.nom.isNotEmpty ? widget.nom[0].toUpperCase() : '?',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.nom,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  Text(widget.matricule,
                      style: const TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
            ),
            SizedBox(
              width: 80,
              child: ValueListenableBuilder<TextEditingValue>(
                valueListenable: widget.controller,
                builder: (_, val, __) => TextField(
                  controller: widget.controller,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: _noteColor(val.text),
                  ),
                  decoration: InputDecoration(
                    hintText: '—',
                    hintStyle: const TextStyle(color: Colors.grey),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: _noteColor(val.text).withValues(alpha: 0.5),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(left: 4),
              child: Text('/20', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ),
          ],
        ),
      ),
    );
  }
}
