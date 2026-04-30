import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'providers/auth_provider.dart';
import 'providers/etablissement_provider.dart';
import 'providers/notification_provider.dart';
import 'screens/auth/role_selection_screen.dart';
import 'screens/home/children_list_screen.dart';
import 'screens/enseignant/enseignant_home_screen.dart';
import 'screens/onboarding/onboarding_screen.dart';
import 'services/api_service.dart';
import 'services/storage_service.dart';
import 'services/update_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugPrint('=== FLUTTER ERROR ===');
    debugPrint(details.exceptionAsString());
    debugPrint(details.stack.toString());
  };

  // Charge les URLs depuis le stockage sécurisé avant de démarrer l'app
  try {
    await StorageService.loadServerUrl();
    await StorageService.loadCentralUrl();
  } catch (e) {
    // Stockage corrompu → réinitialisation
    debugPrint('=== STORAGE ERROR: $e ===');
    await StorageService.clearAll();
  }
  ApiService().resetBaseUrl();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => EtablissementProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
      ],
      child: const SuiviScolaireApp(),
    ),
  );
}

final navigatorKey = GlobalKey<NavigatorState>();

class SuiviScolaireApp extends StatelessWidget {
  const SuiviScolaireApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'Suivi Scolaire',
      theme: AppTheme.theme,
      debugShowCheckedModeBanner: false,
      home: const _AuthGate(),
    );
  }
}

class _AuthGate extends StatefulWidget {
  const _AuthGate();

  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  late final AppLinks _appLinks;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _handleDeepLinkAtLaunch();
      if (!mounted) return;
      final auth = context.read<AuthProvider>();
      await auth.checkAuth();
      if (!mounted) return;
      _initNotifications();
      _listenDeepLinks();
      _checkForUpdate();
    });
  }

  // ── Deep link reçu au lancement (app était fermée) ───────────────────────

  Future<void> _handleDeepLinkAtLaunch() async {
    _appLinks = AppLinks();
    final uri = await _appLinks.getInitialLink();
    if (uri != null) await _applyTenantFromUri(uri);
  }

  // ── Deep link reçu pendant que l'app tourne en arrière-plan ─────────────

  void _listenDeepLinks() {
    _appLinks.uriLinkStream.listen((uri) async {
      await _applyTenantFromUri(uri);
      if (!mounted) return;
      final auth   = context.read<AuthProvider>();
      final etab   = context.read<EtablissementProvider>();
      await auth.checkAuth();
      await etab.reload();
      if (!mounted) return;
      setState(() {});
    });
  }

  // ── Extraction du tenant depuis l'URL et sauvegarde ──────────────────────
  //
  // Exemple : https://lycee-test.monapp.ci/dl  →  host = "lycee-test.monapp.ci"
  //
  Future<void> _applyTenantFromUri(Uri uri) async {
    final host = uri.host;
    // Ignorer les URLs sans chemin de deep link valide (ex: URL de l'app Flutter Web elle-même)
    if (host.isEmpty || !uri.path.startsWith('/dl')) return;
    await StorageService.saveServerUrl(host);
    ApiService().resetBaseUrl();
  }

  Future<void> _checkForUpdate() async {
    final update = await UpdateService.checkForUpdate();
    if (update == null || !mounted) return;
    _showUpdateDialog(update);
  }

  void _showUpdateDialog(UpdateInfo update) {
    showDialog(
      context: context,
      barrierDismissible: !update.forceUpdate,
      builder: (_) => PopScope(
        canPop: !update.forceUpdate,
        child: AlertDialog(
          title: const Text('Mise à jour disponible'),
          content: Text(
            update.forceUpdate
                ? 'La version ${update.versionName} est disponible.\nCette mise à jour est obligatoire pour continuer à utiliser l\'application.'
                : 'La version ${update.versionName} est disponible.\nNous vous recommandons de mettre à jour l\'application.',
          ),
          actions: [
            if (!update.forceUpdate)
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Plus tard'),
              ),
            FilledButton(
              onPressed: () async {
                final uri = Uri.parse(update.downloadUrl);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              child: const Text('Mettre à jour'),
            ),
          ],
        ),
      ),
    );
  }

  void _initNotifications() {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) return;
    final prefix = auth.isEnseignant ? 'enseignant' : 'parent';
    context.read<NotificationProvider>().init(prefix);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    // Aucun serveur configuré → écran d'onboarding
    if (StorageService.getCachedServerUrl() == null) {
      return OnboardingScreen(
        onSetupComplete: () async {
          final auth = context.read<AuthProvider>();
          await auth.checkAuth();
          if (!mounted) return;
          _initNotifications();
          setState(() {});
        },
      );
    }

    return switch (auth.status) {
      AuthStatus.unknown => const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      AuthStatus.unauthenticated => const RoleSelectionScreen(),
      AuthStatus.authenticated   => auth.isEnseignant
          ? const EnseignantHomeScreen()
          : const ChildrenListScreen(),
    };
  }
}
