// Smoke test : l'écran d'accueil (onboarding) doit s'afficher sans lever
// d'exception, avec les providers minimaux dont il dépend (AuthProvider,
// EtablissementProvider). Il ne nécessite ni stockage sécurisé ni réseau au
// premier rendu (EtablissementProvider ne charge que si un serveur est déjà
// configuré), ce qui le rend testable sans mock de plateforme.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:suivi_scolaire_parent/providers/auth_provider.dart';
import 'package:suivi_scolaire_parent/providers/etablissement_provider.dart';
import 'package:suivi_scolaire_parent/screens/onboarding/onboarding_screen.dart';

void main() {
  testWidgets('OnboardingScreen s\'affiche sans erreur', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => EtablissementProvider()),
        ],
        child: MaterialApp(
          home: OnboardingScreen(onSetupComplete: () {}),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.byType(OnboardingScreen), findsOneWidget);
    expect(find.byType(TabBar), findsOneWidget);
    expect(find.text('Code école'), findsWidgets);
  });
}
