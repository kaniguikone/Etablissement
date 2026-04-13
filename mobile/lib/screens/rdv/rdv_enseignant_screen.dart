import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../widgets/loading_error_widget.dart';
import '../../theme/app_theme.dart';

class RdvEnseignantScreen extends StatefulWidget {
  const RdvEnseignantScreen({super.key});

  @override
  State<RdvEnseignantScreen> createState() => _RdvEnseignantScreenState();
}

class _RdvEnseignantScreenState extends State<RdvEnseignantScreen>
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
    return Column(
      children: [
        TabBar(
          controller: _tabCtrl,
          labelColor: AppTheme.primary,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppTheme.primary,
          tabs: const [
            Tab(text: 'Réservations'),
            Tab(text: 'Mes créneaux'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabCtrl,
            children: const [
              _ReservationsTab(),
              _CreneauxTab(),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Tab Réservations ────────────────────────────────────────────────────────

class _ReservationsTab extends StatefulWidget {
  const _ReservationsTab();

  @override
  State<_ReservationsTab> createState() => _ReservationsTabState();
}

class _ReservationsTabState extends State<_ReservationsTab> {
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
      final data = await _api.getMesReservationsEnseignant();
      setState(() {
        _reservations = data.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _confirmer(int id) async {
    try {
      await _api.confirmerRdv(id);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _annuler(int id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Annuler le RDV'),
        content: const Text('Confirmer l\'annulation de ce rendez-vous ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Non')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Oui', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _api.annulerRdvEnseignant(id);
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
    'confirme'    => Colors.green,
    'annule'      => Colors.red,
    _             => Colors.orange,
  };

  String _statutLabel(String s) => switch (s) {
    'confirme'    => 'Confirmé',
    'annule'      => 'Annulé',
    _             => 'En attente',
  };

  @override
  Widget build(BuildContext context) {
    if (_loading) return const LoadingWidget(message: 'Chargement...');
    if (_error != null) return ErrorRetryWidget(message: _error!, onRetry: _load);
    if (_reservations.isEmpty) {
      return const EmptyWidget(message: 'Aucune réservation', icon: Icons.event_available_outlined);
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _reservations.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final r = _reservations[i];
          final creneau = r['creneau'] as Map<String, dynamic>?;
          final parent  = r['parent']  as Map<String, dynamic>?;
          final eleve   = r['eleve']   as Map<String, dynamic>?;
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
                          '${parent?['prenom'] ?? ''} ${parent?['nom'] ?? ''}'.trim(),
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
                  if (eleve != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        '${eleve['nom'] ?? ''} ${eleve['prenoms'] ?? ''}'.trim(),
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
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
                  if (r['motif'] != null) ...[
                    const SizedBox(height: 4),
                    Text(r['motif'] as String,
                        style: const TextStyle(fontSize: 12, color: Colors.black54)),
                  ],
                  if (statut == 'en_attente') ...[
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () => _annuler(r['id'] as int),
                          child: const Text('Annuler', style: TextStyle(color: Colors.red)),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(
                          onPressed: () => _confirmer(r['id'] as int),
                          style: FilledButton.styleFrom(backgroundColor: AppTheme.primary),
                          child: const Text('Confirmer'),
                        ),
                      ],
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

// ─── Tab Créneaux ────────────────────────────────────────────────────────────

class _CreneauxTab extends StatefulWidget {
  const _CreneauxTab();

  @override
  State<_CreneauxTab> createState() => _CreneauxTabState();
}

class _CreneauxTabState extends State<_CreneauxTab> {
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
      final data = await _api.getMesCreneauxRdv();
      setState(() {
        _creneaux = data.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _creerCreneau() async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => const _CreneauDialog(),
    );
    if (result == null) return;
    try {
      await _api.creerCreneauRdv(result);
      await _load();
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
    if (_loading) return const LoadingWidget(message: 'Chargement...');
    if (_error != null) return ErrorRetryWidget(message: _error!, onRetry: _load);
    return Stack(
      children: [
        _creneaux.isEmpty
            ? const EmptyWidget(
                message: 'Aucun créneau disponible',
                icon: Icons.event_outlined,
              )
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 80),
                  itemCount: _creneaux.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final c = _creneaux[i];
                    final actif = (c['actif'] as bool?) ?? true;
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: (actif ? AppTheme.primary : Colors.grey)
                              .withValues(alpha: 0.15),
                          child: Icon(Icons.event,
                              color: actif ? AppTheme.primary : Colors.grey),
                        ),
                        title: Text(c['date_creneau'] as String? ?? '—',
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text(
                          '${(c['heure_debut'] as String?)?.substring(0, 5) ?? ''}–'
                          '${(c['heure_fin'] as String?)?.substring(0, 5) ?? ''}',
                        ),
                        trailing: actif
                            ? const Icon(Icons.check_circle, color: Colors.green, size: 20)
                            : const Icon(Icons.cancel, color: Colors.grey, size: 20),
                      ),
                    );
                  },
                ),
              ),
        Positioned(
          bottom: 16,
          right: 16,
          child: FloatingActionButton.extended(
            heroTag: 'fab_rdv',
            onPressed: _creerCreneau,
            backgroundColor: AppTheme.primary,
            icon: const Icon(Icons.add, color: Colors.white),
            label: const Text('Nouveau créneau', style: TextStyle(color: Colors.white)),
          ),
        ),
      ],
    );
  }
}

// ─── Dialog Créer créneau ────────────────────────────────────────────────────

class _CreneauDialog extends StatefulWidget {
  const _CreneauDialog();

  @override
  State<_CreneauDialog> createState() => _CreneauDialogState();
}

class _CreneauDialogState extends State<_CreneauDialog> {
  DateTime? _date;
  TimeOfDay? _debut;
  TimeOfDay? _fin;

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}:00';

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Nouveau créneau RDV'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            dense: true,
            leading: const Icon(Icons.calendar_today),
            title: Text(_date == null
                ? 'Choisir une date'
                : '${_date!.day.toString().padLeft(2, '0')}/${_date!.month.toString().padLeft(2, '0')}/${_date!.year}'),
            onTap: () async {
              final d = await showDatePicker(
                context: context,
                initialDate: DateTime.now().add(const Duration(days: 1)),
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 90)),
              );
              if (d != null) setState(() => _date = d);
            },
          ),
          ListTile(
            dense: true,
            leading: const Icon(Icons.access_time),
            title: Text(_debut == null ? 'Heure de début' : _debut!.format(context)),
            onTap: () async {
              final t = await showTimePicker(
                context: context,
                initialTime: const TimeOfDay(hour: 8, minute: 0),
              );
              if (t != null) setState(() => _debut = t);
            },
          ),
          ListTile(
            dense: true,
            leading: const Icon(Icons.access_time_filled),
            title: Text(_fin == null ? 'Heure de fin' : _fin!.format(context)),
            onTap: () async {
              final t = await showTimePicker(
                context: context,
                initialTime: const TimeOfDay(hour: 8, minute: 30),
              );
              if (t != null) setState(() => _fin = t);
            },
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: (_date == null || _debut == null || _fin == null)
              ? null
              : () {
                  Navigator.pop(context, {
                    'date_creneau': '${_date!.year}-${_date!.month.toString().padLeft(2, '0')}-${_date!.day.toString().padLeft(2, '0')}',
                    'heure_debut': _fmt(_debut!),
                    'heure_fin':   _fmt(_fin!),
                  });
                },
          style: FilledButton.styleFrom(backgroundColor: AppTheme.primary),
          child: const Text('Créer'),
        ),
      ],
    );
  }
}
