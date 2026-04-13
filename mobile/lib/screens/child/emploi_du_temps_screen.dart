import 'package:flutter/material.dart';
import '../../models/eleve.dart';
import '../../models/emploi_du_temps.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/loading_error_widget.dart';

const _jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

class EmploiDuTempsScreen extends StatefulWidget {
  final Eleve eleve;
  const EmploiDuTempsScreen({super.key, required this.eleve});

  @override
  State<EmploiDuTempsScreen> createState() => _EmploiDuTempsScreenState();
}

class _EmploiDuTempsScreenState extends State<EmploiDuTempsScreen>
    with SingleTickerProviderStateMixin {
  final _api = ApiService();
  Map<String, List<Creneau>> _emploi = {};
  Map<String, Color> _palette = {};
  bool _loading = true;
  String? _error;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _jours.length, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.getEmploiDuTemps(widget.eleve.id);
      final Map<String, List<Creneau>> result = {};
      data.forEach((jour, liste) {
        result[jour] = (liste as List<dynamic>)
            .map((c) => Creneau.fromJson(c as Map<String, dynamic>))
            .toList()
          ..sort((a, b) => a.heureDebut.compareTo(b.heureDebut));
      });

      // Palette couleurs par matière
      final Map<String, Color> pal = {};
      int idx = 0;
      for (final creneaux in result.values) {
        for (final c in creneaux) {
          if (c.matiereAbbr != null && !pal.containsKey(c.matiereAbbr)) {
            pal[c.matiereAbbr!] = _couleursPalette[idx % _couleursPalette.length];
            idx++;
          }
        }
      }

      setState(() { _emploi = result; _palette = pal; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  static const _couleursPalette = [
    Color(0xFF1565C0), Color(0xFF2E7D32), Color(0xFFC62828),
    Color(0xFFF57F17), Color(0xFF00838F), Color(0xFF6A1B9A),
    Color(0xFF37474F),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Emploi du temps — ${widget.eleve.nom}'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          tabs: _jours.map((j) {
            final aCreneaux = _emploi.containsKey(j) && _emploi[j]!.isNotEmpty;
            return Tab(
              child: Row(
                children: [
                  Text(j[0].toUpperCase() + j.substring(1, 3)),
                  if (aCreneaux) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${_emploi[j]!.length}',
                        style: const TextStyle(fontSize: 10),
                      ),
                    ),
                  ],
                ],
              ),
            );
          }).toList(),
        ),
      ),
      body: _loading
          ? const LoadingWidget(message: 'Chargement...')
          : _error != null
              ? ErrorRetryWidget(message: _error!, onRetry: _load)
              : TabBarView(
                  controller: _tabController,
                  children: _jours.map((jour) {
                    final creneaux = _emploi[jour] ?? [];
                    if (creneaux.isEmpty) {
                      return const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.weekend_outlined, size: 48, color: Colors.grey),
                            SizedBox(height: 12),
                            Text('Pas de cours ce jour', style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                      );
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: creneaux.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => _CreneauCard(
                        creneau: creneaux[i],
                        couleur: _palette[creneaux[i].matiereAbbr] ?? AppTheme.primary,
                      ),
                    );
                  }).toList(),
                ),
    );
  }
}

class _CreneauCard extends StatelessWidget {
  final Creneau creneau;
  final Color couleur;

  const _CreneauCard({required this.creneau, required this.couleur});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: IntrinsicHeight(
        child: Row(
          children: [
            // Bande colorée gauche
            Container(
              width: 6,
              decoration: BoxDecoration(
                color: couleur,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                ),
              ),
            ),
            // Badge abréviation
            Container(
              width: 64,
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: BoxDecoration(
                  color: couleur.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  creneau.matiereAbbr ?? '—',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: couleur,
                    fontSize: 13,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            // Infos matière + enseignant
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      creneau.matiere ?? '—',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    if (creneau.enseignant != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        creneau.enseignant!,
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            // Horaires
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    creneau.heureDebut,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: couleur,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    creneau.heureFin,
                    style: TextStyle(fontSize: 12, color: Colors.grey[500]),
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
