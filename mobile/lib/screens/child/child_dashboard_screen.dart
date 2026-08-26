import 'package:flutter/material.dart';
import '../../models/eleve.dart';
import '../../theme/app_theme.dart';
import '../../widgets/dashboard_card.dart';
import 'notes_screen.dart';
import 'assiduites_screen.dart';
import 'scolarites_screen.dart';
import 'frais_annexes_screen.dart';
import 'enseignants_screen.dart';
import 'informations_screen.dart';
import 'emploi_du_temps_screen.dart';
import '../messagerie/conversations_screen.dart';
import '../rdv/rdv_parent_screen.dart';

class ChildDashboardScreen extends StatelessWidget {
  final Eleve eleve;

  const ChildDashboardScreen({super.key, required this.eleve});

  @override
  Widget build(BuildContext context) {
    final items = [
      _DashItem(
        icon: Icons.announcement_outlined,
        label: 'Informations',
        color: const Color(0xFF5C6BC0),
        screen: InformationsScreen(eleve: eleve),
      ),
      _DashItem(
        icon: Icons.grade_outlined,
        label: 'Notes & Bulletin',
        color: AppTheme.noteGood,
        screen: NotesScreen(eleve: eleve),
      ),
      _DashItem(
        icon: Icons.event_busy_outlined,
        label: 'Assiduité',
        color: AppTheme.absent,
        screen: AssiduitesScreen(eleve: eleve),
      ),
      _DashItem(
        icon: Icons.payment_outlined,
        label: 'Scolarités',
        color: const Color(0xFF00897B),
        screen: ScolaritesScreen(eleve: eleve),
      ),
      _DashItem(
        icon: Icons.checklist_outlined,
        label: 'Frais annexes',
        color: const Color(0xFF6D4C41),
        screen: FraisAnnexesScreen(eleve: eleve),
      ),
      _DashItem(
        icon: Icons.calendar_today_outlined,
        label: 'Emploi du temps',
        color: const Color(0xFF7B1FA2),
        screen: EmploiDuTempsScreen(eleve: eleve),
      ),
      _DashItem(
        icon: Icons.people_outline,
        label: 'Mes Professeurs',
        color: const Color(0xFF0277BD),
        screen: EnseignantsScreen(eleve: eleve),
      ),
      const _DashItem(
        icon: Icons.chat_outlined,
        label: 'Messages',
        color: Color(0xFF00796B),
        screen: ConversationsScreen(prefix: 'parent'),
      ),
      _DashItem(
        icon: Icons.event_available_outlined,
        label: 'Rendez-vous',
        color: const Color(0xFFE65100),
        screen: RdvParentScreen(eleve: eleve),
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text('${eleve.nom} ${eleve.prenoms}'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(40),
          child: Container(
            alignment: Alignment.centerLeft,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Row(
              children: [
                if (eleve.classe != null)
                  _Chip(label: eleve.classe!),
                if (eleve.niveau != null) ...[
                  const SizedBox(width: 8),
                  _Chip(label: eleve.niveau!),
                ],
                const SizedBox(width: 8),
                _Chip(label: eleve.matricule),
              ],
            ),
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: GridView.builder(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.1,
          ),
          itemCount: items.length,
          itemBuilder: (ctx, i) => DashboardCard(
            icon: items[i].icon,
            label: items[i].label,
            color: items[i].color,
            onTap: () => Navigator.push(
              ctx,
              MaterialPageRoute(builder: (_) => items[i].screen),
            ),
          ),
        ),
      ),
    );
  }
}

class _DashItem {
  final IconData icon;
  final String label;
  final Color color;
  final Widget screen;

  const _DashItem({
    required this.icon,
    required this.label,
    required this.color,
    required this.screen,
  });
}

class _Chip extends StatelessWidget {
  final String label;
  const _Chip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.25),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
    );
  }
}
