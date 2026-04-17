import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/etablissement_provider.dart';
import 'providers/notification_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/children_list_screen.dart';
import 'screens/enseignant/enseignant_home_screen.dart';
import 'screens/onboarding/onboarding_screen.dart';
import 'services/api_service.dart';
import 'services/storage_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Charge l'URL serveur depuis le stockage sécurisé avant de démarrer l'app
  await StorageService.loadServerUrl();
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

class SuiviScolaireApp extends StatelessWidget {
  const SuiviScolaireApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
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
    if (host.isEmpty) return;
    await StorageService.saveServerUrl(host);
    ApiService().resetBaseUrl();
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
      AuthStatus.unauthenticated => const LoginScreen(),
      AuthStatus.authenticated   => auth.isEnseignant
          ? const EnseignantHomeScreen()
          : const ChildrenListScreen(),
    };
  }
}
