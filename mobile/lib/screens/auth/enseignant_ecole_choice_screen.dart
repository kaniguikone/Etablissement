import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';

/// Affiché juste après la connexion d'un enseignant présent dans plusieurs
/// établissements : il doit choisir celui qu'il souhaite consulter avant
/// d'accéder à son espace (voir AuthProvider.choixEcoleRequis).
class EnseignantEcoleChoiceScreen extends StatefulWidget {
  const EnseignantEcoleChoiceScreen({super.key});

  @override
  State<EnseignantEcoleChoiceScreen> createState() =>
      _EnseignantEcoleChoiceScreenState();
}

class _EnseignantEcoleChoiceScreenState
    extends State<EnseignantEcoleChoiceScreen> {
  int? _chargementIndex;

  Future<void> _choisir(AuthProvider auth, int index) async {
    setState(() => _chargementIndex = index);
    await auth.switchEcole(index);
    auth.confirmerChoixEcole();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppTheme.primary,
      body: SafeArea(
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(24, 32, 24, 24),
              child: Column(
                children: [
                  Icon(Icons.school_rounded, size: 52, color: Colors.white),
                  SizedBox(height: 12),
                  Text(
                    'Choisissez votre établissement',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Vous enseignez dans plusieurs établissements. '
                    'Sélectionnez celui que vous souhaitez consulter.',
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                ),
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
                child: ListView.separated(
                  itemCount: auth.ecoles.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, i) {
                    final ecole   = auth.ecoles[i];
                    final loading = _chargementIndex == i;

                    return Material(
                      color: AppTheme.primary.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: _chargementIndex == null
                            ? () => _choisir(auth, i)
                            : null,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              const Icon(Icons.school, color: AppTheme.primary),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Text(
                                  ecole.nom,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 15,
                                  ),
                                ),
                              ),
                              if (loading)
                                const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              else
                                const Icon(Icons.arrow_forward_ios,
                                    size: 14, color: Colors.grey),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
