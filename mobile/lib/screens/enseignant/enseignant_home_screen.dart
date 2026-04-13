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

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      const EnseignantDashboardScreen(),
      DevoirsScreen(key: _devoirsKey),
      PresenceScreen(key: _presenceKey),
      const ProgrammeScreen(),
      const EnseignantEmploiScreen(),
      const RemplacementsScreen(),
      const ConversationsScreen(prefix: 'enseignant'),
      const RdvEnseignantScreen(),
      const EnseignantInformationsScreen(),
    ];
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
            Text(etablissement?.nom ?? 'Espace Enseignant'),
            if (auth.nom != null)
              Text(
                '${auth.prenom ?? ''} ${auth.nom ?? ''}'.trim(),
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400),
              ),
          ],
        ),
        actions: [
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
      body: IndexedStack(index: _index, children: _screens),
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
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        backgroundColor: Colors.white,
        indicatorColor: AppTheme.primary.withValues(alpha: 0.15),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: AppTheme.primary),
            label: 'Accueil',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment, color: AppTheme.primary),
            label: 'Devoirs',
          ),
          NavigationDestination(
            icon: Icon(Icons.fact_check_outlined),
            selectedIcon: Icon(Icons.fact_check, color: AppTheme.primary),
            label: 'Présence',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book, color: AppTheme.primary),
            label: 'Programme',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon: Icon(Icons.calendar_today, color: AppTheme.primary),
            label: 'Emploi',
          ),
          NavigationDestination(
            icon: Icon(Icons.swap_horiz_outlined),
            selectedIcon: Icon(Icons.swap_horiz, color: AppTheme.primary),
            label: 'Remplaç.',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_outlined),
            selectedIcon: Icon(Icons.chat, color: AppTheme.primary),
            label: 'Messages',
          ),
          NavigationDestination(
            icon: Icon(Icons.event_available_outlined),
            selectedIcon: Icon(Icons.event_available, color: AppTheme.primary),
            label: 'RDV',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications, color: AppTheme.primary),
            label: 'Infos',
          ),
        ],
      ),
    );
  }
}
