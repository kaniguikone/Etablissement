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
import '../parent/profil_screen.dart';

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
    final auth = context.read<AuthProvider>();

    // Mode central : enfants déjà disponibles depuis le login
    if (auth.isCentral) {
      setState(() {
        _enfants = auth.tousLesEnfants
            .map((e) => Eleve.fromJson(e))
            .toList();
        _loading = false;
      });
      return;
    }

    // Mode mono-école classique
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

  Future<void> _ouvrirEnfant(Eleve eleve, Map<String, dynamic> raw) async {
    final auth = context.read<AuthProvider>();

    if (auth.isCentral) {
      // Pointer l'API vers l'école de cet enfant avant navigation
      final ecoleIndex = raw['_ecole_index'] as int? ?? 0;
      await auth.switchEcole(ecoleIndex);
    }

    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ChildDashboardScreen(eleve: eleve)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth          = context.watch<AuthProvider>();
    final etablissement = context.watch<EtablissementProvider>().info;

    final titre = auth.isCentral
        ? 'Mes enfants'
        : (etablissement?.nom ?? 'Suivi Scolaire');

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(titre),
            if (auth.nom != null)
              Text(
                '${auth.prenom ?? ''} ${auth.nom ?? ''}'.trim(),
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400),
              ),
          ],
        ),
        actions: [
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
                      decoration: const BoxDecoration(
                          color: Colors.red, shape: BoxShape.circle),
                      child: Text(
                        notifProvider.nonLues > 99
                            ? '99+'
                            : '${notifProvider.nonLues}',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined),
            tooltip: 'Mon profil',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ProfilScreen()),
            ),
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
                  : auth.isCentral
                      ? _listeCentrale(auth)
                      : _listeSimple(),
    );
  }

  // Liste groupée par école (mode central)
  Widget _listeCentrale(AuthProvider auth) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: auth.ecoles.length,
      itemBuilder: (_, ecoleIndex) {
        final ecole   = auth.ecoles[ecoleIndex];
        final enfants = ecole.enfants;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (ecoleIndex > 0) const SizedBox(height: 16),
            // En-tête école
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.school_outlined, size: 16),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      ecole.nom,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            // Enfants de cette école
            ...enfants.map((raw) {
              final eleve = Eleve.fromJson({...raw, '_ecole_index': ecoleIndex});
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _EleveCard(
                  eleve: eleve,
                  ecoleNom: null, // déjà dans l'en-tête
                  onTap: () => _ouvrirEnfant(eleve, {...raw, '_ecole_index': ecoleIndex}),
                ),
              );
            }),
          ],
        );
      },
    );
  }

  // Liste simple mono-école (mode classique)
  Widget _listeSimple() {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _enfants.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _EleveCard(
        eleve: _enfants[i],
        onTap: () => _ouvrirEnfant(_enfants[i], {}),
      ),
    );
  }
}

class _EleveCard extends StatelessWidget {
  final Eleve       eleve;
  final String?     ecoleNom;
  final VoidCallback onTap;

  const _EleveCard({required this.eleve, required this.onTap, this.ecoleNom});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor:
              Theme.of(context).colorScheme.primaryContainer,
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
            if (ecoleNom != null)
              Text(
                ecoleNom!,
                style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontSize: 12),
              ),
          ],
        ),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}
