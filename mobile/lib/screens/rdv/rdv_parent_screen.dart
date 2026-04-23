import 'package:flutter/material.dart';
import '../../models/eleve.dart';
import '../../services/api_service.dart';
import '../../widgets/loading_error_widget.dart';
import '../../theme/app_theme.dart';

class RdvParentScreen extends StatefulWidget {
  final Eleve eleve;
  const RdvParentScreen({super.key, required this.eleve});

  @override
  State<RdvParentScreen> createState() => _RdvParentScreenState();
}

class _RdvParentScreenState extends State<RdvParentScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rendez-vous'),
        bottom: TabBar(
          controller: _tabCtrl,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Prendre un RDV'),
            Tab(text: 'Mes réservations'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _PrendreRdvTab(eleve: widget.eleve),
          _MesReservationsTab(eleve: widget.eleve),
        ],
      ),
    );
  }
}

// ─── Tab : Prendre un RDV ────────────────────────────────────────────────────

class _PrendreRdvTab extends StatefulWidget {
  final Eleve eleve;
  const _PrendreRdvTab({required this.eleve});

  @override
  State<_PrendreRdvTab> createState() => _PrendreRdvTabState();
}

class _PrendreRdvTabState extends State<_PrendreRdvTab> {
  final _api = ApiService();
  List<Map<String, dynamic>> _enseignants = [];
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
      final data = await _api.getEnseignants(widget.eleve.id);
      setState(() {
        _enseignants = data.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const LoadingWidget(message: 'Chargement...');
    if (_error != null) return ErrorRetryWidget(message: _error!, onRetry: _load);
    if (_enseignants.isEmpty) {
      return const EmptyWidget(
        message: 'Aucun enseignant disponible',
        icon: Icons.people_outline,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _enseignants.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final e = _enseignants[i];
        final nom = '${e['prenoms_enseignant'] ?? ''} ${e['nom_enseignant'] ?? ''}'.trim();
        final initiale = nom.isNotEmpty ? nom[0].toUpperCase() : null;
        return Card(
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: AppTheme.primary.withValues(alpha: 0.12),
              child: initiale != null
                  ? Text(initiale,
                      style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold))
                  : const Icon(Icons.person, color: AppTheme.primary),
            ),
            title: Text(nom.isNotEmpty ? nom : '—', style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: e['libelle_matiere'] != null
                ? Text(e['libelle_matiere'] as String)
                : null,
            trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => _CreneauxEnseignantScreen(
                  enseignantId:   e['id'] as int,
                  enseignantNom:  nom.isNotEmpty ? nom : (e['nom_enseignant'] as String? ?? '—'),
                  eleve:          widget.eleve,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

// ─── Écran créneaux d'un enseignant ─────────────────────────────────────────

class _CreneauxEnseignantScreen extends StatefulWidget {
  final int enseignantId;
  final String enseignantNom;
  final Eleve eleve;
  const _CreneauxEnseignantScreen({
    required this.enseignantId,
    required this.enseignantNom,
    required this.eleve,
  });

  @override
  State<_CreneauxEnseignantScreen> createState() => _CreneauxEnseignantScreenState();
}

class _CreneauxEnseignantScreenState extends State<_CreneauxEnseignantScreen> {
  final _api = ApiService();
  List<Map<String, dynamic>> _creneaux = [];
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
      final data = await _api.getCreneauxRdvEnseignant(widget.enseignantId);
      setState(() {
        _creneaux = data.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _reserver(Map<String, dynamic> creneau) async {
    final motifCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('RDV avec ${widget.enseignantNom}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${creneau['date_creneau'] ?? ''}  '
              '${(creneau['heure_debut'] as String?)?.substring(0, 5) ?? ''}–'
              '${(creneau['heure_fin'] as String?)?.substring(0, 5) ?? ''}',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: motifCtrl,
              decoration: const InputDecoration(
                labelText: 'Motif (optionnel)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Annuler')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.primary),
            child: const Text('Réserver'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _api.reserverRdv({
        'creneau_id': creneau['id'],
        'eleve_id':   widget.eleve.id,
        if (motifCtrl.text.trim().isNotEmpty) 'motif': motifCtrl.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Réservation envoyée !'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.enseignantNom)),
      body: _loading
          ? const LoadingWidget(message: 'Chargement...')
          : _error != null
              ? ErrorRetryWidget(message: _error!, onRetry: _load)
              : _creneaux.isEmpty
                  ? const EmptyWidget(
                      message: 'Aucun créneau disponible',
                      icon: Icons.event_busy_outlined,
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: _creneaux.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) {
                        final c = _creneaux[i];
                        return Card(
                          child: ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: Color(0xFFE3F2FD),
                              child: Icon(Icons.event_available, color: Color(0xFF1565C0)),
                            ),
                            title: Text(c['date_creneau'] as String? ?? '—',
                                style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text(
                              '${(c['heure_debut'] as String?)?.substring(0, 5) ?? ''}–'
                              '${(c['heure_fin'] as String?)?.substring(0, 5) ?? ''}',
                            ),
                            trailing: FilledButton(
                              onPressed: () => _reserver(c),
                              style: FilledButton.styleFrom(
                                  backgroundColor: AppTheme.primary),
                              child: const Text('Réserver'),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}

// ─── Tab : Mes réservations ──────────────────────────────────────────────────

class _MesReservationsTab extends StatefulWidget {
  final Eleve eleve;
  const _MesReservationsTab({required this.eleve});

  @override
  State<_MesReservationsTab> createState() => _MesReservationsTabState();
}

class _MesReservationsTabState extends State<_MesReservationsTab> {
  final _api = ApiService();
  List<Map<String, dynamic>> _reservations = [];
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
      final data = await _api.getMesReservationsRdv();
      setState(() {
        _reservations = data.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _annuler(int id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Annuler la réservation'),
        content: const Text('Confirmer l\'annulation de ce rendez-vous ?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Non')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Oui', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _api.annulerReservationRdv(id);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Color _statutColor(String s) => switch (s) {
    'confirme' => Colors.green,
    'annule'   => Colors.red,
    _          => Colors.orange,
  };

  String _statutLabel(String s) => switch (s) {
    'confirme' => 'Confirmé',
    'annule'   => 'Annulé',
    _          => 'En attente',
  };

  @override
  Widget build(BuildContext context) {
    if (_loading) return const LoadingWidget(message: 'Chargement...');
    if (_error != null) return ErrorRetryWidget(message: _error!, onRetry: _load);
    if (_reservations.isEmpty) {
      return const EmptyWidget(
        message: 'Aucune réservation',
        icon: Icons.event_available_outlined,
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _reservations.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final r       = _reservations[i];
          final creneau = r['creneau'] as Map<String, dynamic>?;
          final ens     = creneau?['enseignant'] as Map<String, dynamic>?;
          final statut  = r['statut'] as String? ?? 'en_attente';
          final color   = _statutColor(statut);
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${ens?['prenoms'] ?? ens?['prenom'] ?? ''} ${ens?['nom'] ?? ''}'.trim(),
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(_statutLabel(statut),
                            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(creneau?['date_creneau'] as String? ?? '—',
                          style: const TextStyle(fontSize: 13)),
                      const SizedBox(width: 12),
                      const Icon(Icons.access_time, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        '${(creneau?['heure_debut'] as String?)?.substring(0, 5) ?? ''}–'
                        '${(creneau?['heure_fin'] as String?)?.substring(0, 5) ?? ''}',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ],
                  ),
                  if (r['note_enseignant'] != null) ...[
                    const SizedBox(height: 4),
                    Text('Note : ${r['note_enseignant']}',
                        style: const TextStyle(fontSize: 12, color: Colors.black54)),
                  ],
                  if (statut == 'en_attente') ...[
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => _annuler(r['id'] as int),
                        child: const Text('Annuler', style: TextStyle(color: Colors.red)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
