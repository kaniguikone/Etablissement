import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/etablissement_provider.dart';
import 'providers/notification_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/children_list_screen.dart';
import 'screens/enseignant/enseignant_home_screen.dart';
import 'theme/app_theme.dart';

void main() {
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
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await context.read<AuthProvider>().checkAuth();
      _initNotifications();
    });
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
