import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/eleve.dart';
import '../../providers/auth_provider.dart';
import '../../providers/etablissement_provider.dart';
import '../../providers/notification_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/loading_error_widget.dart';
import '../child/child_dashboard_screen.dart';
import '../notifications/notifications_screen.dart';

class ChildrenListScreen extends StatefulWidget {
  const ChildrenListScreen({super.key});

  @override
  State<ChildrenListScreen> createState() => _ChildrenListScreenState();
}

class _ChildrenListScreenState extends State<ChildrenListScreen> {
  final _api = ApiService();
  List<Eleve> _enfants = [];
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
      final data = await _api.getEnfants();
      setState(() {
        _enfants = data.map((e) => Eleve.fromJson(e as Map<String, dynamic>)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth          = context.watch<AuthProvider>();
    final etablissement = context.watch<EtablissementProvider>().info;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(etablissement?.nom ?? 'Suivi Scolaire'),
            if (auth.nom != null)
              Text(
                '${auth.prenom ?? ''} ${auth.nom ?? ''}'.trim(),
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400),
              ),
          ],
        ),
        actions: [
          // Cloche notifications
          Consumer<NotificationProvider>(
            builder: (_, notifProvider, __) => Stack(
              children: [
                IconButton(
                  icon: const Icon(Icons.notifications_outlined),
                  tooltip: 'Notifications',
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                  ),
                ),
                if (notifProvider.nonLues > 0)
                  Positioned(
                    right: 8, top: 8,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                      child: Text(
                        notifProvider.nonLues > 99 ? '99+' : '${notifProvider.nonLues}',
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Déconnexion',
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Déconnexion'),
                  content: const Text('Voulez-vous vous déconnecter ?'),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Annuler')),
                    TextButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Oui',
                            style: TextStyle(color: Colors.red))),
                  ],
                ),
              );
              if (confirm == true && context.mounted) {
                await context.read<AuthProvider>().logout();
              }
            },
          ),
        ],
      ),
      body: _loading
          ? const LoadingWidget(message: 'Chargement des enfants...')
          : _error != null
              ? ErrorRetryWidget(message: _error!, onRetry: _load)
              : _enfants.isEmpty
                  ? const EmptyWidget(
                      message: 'Aucun enfant associé à ce compte.',
                      icon: Icons.child_care,
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _enfants.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => _EleveCard(
                        eleve: _enfants[i],
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                ChildDashboardScreen(eleve: _enfants[i]),
                          ),
                        ),
                      ),
                    ),
    );
  }
}

class _EleveCard extends StatelessWidget {
  final Eleve eleve;
  final VoidCallback onTap;

  const _EleveCard({required this.eleve, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          radius: 26,
          backgroundImage: eleve.photoUrl != null
              ? NetworkImage(eleve.photoUrl!)
              : null,
          child: eleve.photoUrl == null
              ? Text(
                  eleve.nom.isNotEmpty ? eleve.nom[0].toUpperCase() : '?',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                )
              : null,
        ),
        title: Text(
          '${eleve.nom} ${eleve.prenoms}',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Matricule : ${eleve.matricule}'),
            if (eleve.classe != null) Text('Classe : ${eleve.classe}'),
            if (eleve.niveau != null) Text('Niveau : ${eleve.niveau}'),
          ],
        ),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}
