import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/etablissement_provider.dart';
import '../../theme/app_theme.dart';
import 'enseignant_dashboard_screen.dart';
import 'devoirs_screen.dart';
import 'devoir_form_screen.dart';
import 'presence_screen.dart';
import 'enseignant_emploi_screen.dart';
import 'enseignant_informations_screen.dart';
import 'programme_screen.dart';
import 'remplacements_screen.dart';
import '../messagerie/conversations_screen.dart';
import '../rdv/rdv_enseignant_screen.dart';

class EnseignantHomeScreen extends StatefulWidget {
  const EnseignantHomeScreen({super.key});

  @override
  State<EnseignantHomeScreen> createState() => _EnseignantHomeScreenState();
}

class _EnseignantHomeScreenState extends State<EnseignantHomeScreen> {
  int _index = 0;
  final _devoirsKey  = GlobalKey<DevoirsScreenState>();
  final _presenceKey = GlobalKey<PresenceScreenState>();

  // Onglets principaux (bottom bar) : 0-Accueil 1-Devoirs 2-Présence 3-Messages
  // Onglets secondaires (tiroir)    : 4-Programme 5-Emploi 6-Remplacements 7-RDV 8-Infos
  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      const EnseignantDashboardScreen(),
      DevoirsScreen(key: _devoirsKey),
      PresenceScreen(key: _presenceKey),
      const ConversationsScreen(prefix: 'enseignant'),
      const ProgrammeScreen(),
      const EnseignantEmploiScreen(),
      const RemplacementsScreen(),
      const RdvEnseignantScreen(),
      const EnseignantInformationsScreen(),
    ];
  }

  void _changerEcole(BuildContext context, AuthProvider auth) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text(
                'Choisir un établissement',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
            ...auth.ecoles.asMap().entries.map((entry) {
              final i     = entry.key;
              final ecole = entry.value;
              final isActive = i == auth.ecoles.indexOf(auth.ecoleActive!);
              return ListTile(
                leading: Icon(
                  Icons.school,
                  color: isActive ? AppTheme.primary : Colors.grey,
                ),
                title: Text(ecole.nom),
                trailing: isActive
                    ? const Icon(Icons.check, color: AppTheme.primary)
                    : null,
                onTap: () async {
                  Navigator.pop(context);
                  await auth.switchEcole(i);
                  setState(() => _index = 0);
                },
              );
            }),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _openMore(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        final items = [
          (4, Icons.menu_book_outlined,       'Programme'),
          (5, Icons.calendar_today_outlined,   'Emploi du temps'),
          (6, Icons.swap_horiz_outlined,       'Remplacements'),
          (7, Icons.event_available_outlined,  'RDV'),
          (8, Icons.notifications_outlined,    'Informations'),
        ];
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Container(width: 40, height: 4,
                  decoration: BoxDecoration(color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 8),
              ...items.map((item) => ListTile(
                leading: Icon(item.$2, color: AppTheme.primary),
                title: Text(item.$3),
                selected: _index == item.$1,
                selectedTileColor: AppTheme.primary.withValues(alpha: 0.08),
                onTap: () {
                  Navigator.pop(context);
                  setState(() => _index = item.$1);
                },
              )),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth          = context.watch<AuthProvider>();
    final etablissement = context.watch<EtablissementProvider>().info;

    // Indice dans la NavigationBar (0-3 = onglets principaux, 4 = "Plus")
    final barIndex = _index < 4 ? _index : 4;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(auth.isCentral
                ? (auth.ecoleActive?.nom ?? 'Espace Enseignant')
                : (etablissement?.nom ?? 'Espace Enseignant')),
            if (auth.nom != null)
              Text(
                '${auth.prenom ?? ''} ${auth.nom ?? ''}'.trim(),
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400),
              ),
          ],
        ),
        actions: [
          if (auth.isCentral && auth.ecoles.length > 1)
            IconButton(
              icon: const Icon(Icons.swap_horiz),
              tooltip: 'Changer d\'établissement',
              onPressed: () => _changerEcole(context, auth),
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
      // Reclé sur l'établissement actif : force la reconstruction complète des
      // onglets (et leur rechargement de données) au changement d'école.
      body: IndexedStack(
        key: ValueKey(auth.ecoleActive?.tenantId),
        index: _index,
        children: _screens,
      ),
      floatingActionButton: _index == 1
          ? FloatingActionButton(
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const DevoirFormScreen()),
                );
                if (result == true) _devoirsKey.currentState?.load();
              },
              backgroundColor: AppTheme.primary,
              child: const Icon(Icons.add, color: Colors.white),
            )
          : _index == 2
              ? FloatingActionButton.extended(
                  onPressed: () => _presenceKey.currentState?.sauvegarder(),
                  backgroundColor: AppTheme.primary,
                  icon: const Icon(Icons.save, color: Colors.white),
                  label: const Text('Enregistrer', style: TextStyle(color: Colors.white)),
                )
              : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: barIndex,
        onDestinationSelected: (i) {
          if (i == 4) {
            _openMore(context);
          } else {
            setState(() => _index = i);
          }
        },
        backgroundColor: Colors.white,
        indicatorColor: AppTheme.primary.withValues(alpha: 0.15),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: AppTheme.primary),
            label: 'Accueil',
          ),
          const NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment, color: AppTheme.primary),
            label: 'Devoirs',
          ),
          const NavigationDestination(
            icon: Icon(Icons.fact_check_outlined),
            selectedIcon: Icon(Icons.fact_check, color: AppTheme.primary),
            label: 'Présence',
          ),
          const NavigationDestination(
            icon: Icon(Icons.chat_outlined),
            selectedIcon: Icon(Icons.chat, color: AppTheme.primary),
            label: 'Messages',
          ),
          NavigationDestination(
            icon: Icon(_index >= 4 ? Icons.more_horiz : Icons.more_horiz_outlined,
                color: _index >= 4 ? AppTheme.primary : null),
            selectedIcon: const Icon(Icons.more_horiz, color: AppTheme.primary),
            label: 'Plus',
          ),
        ],
      ),
    );
  }
}
