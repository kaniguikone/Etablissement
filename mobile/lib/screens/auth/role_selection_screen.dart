import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/etablissement_provider.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../onboarding/onboarding_screen.dart';
import 'parent_login_screen.dart';
import 'enseignant_login_screen.dart';

// Couleur neutre pour l'en-tête (pas liée à un rôle, écran de choix)
const _headerColor = Color(0xFF1A237E);

class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final etablissement = context.watch<EtablissementProvider>().info;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── En-tête établissement ──
              Container(
                width: double.infinity,
                color: _headerColor,
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
                child: Row(
                  children: [
                    // Logo
                    if (etablissement?.logoUrl != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.network(
                          etablissement!.logoUrl!,
                          height: 52,
                          width: 52,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.school_outlined,
                            size: 52, color: Colors.white,
                          ),
                        ),
                      )
                    else
                      const Icon(Icons.school_outlined,
                          size: 52, color: Colors.white),
                    const SizedBox(width: 16),
                    // Nom + slogan
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            etablissement?.nom ?? 'Suivi Scolaire',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (etablissement?.slogan != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              etablissement!.slogan!,
                              style: const TextStyle(
                                  color: Colors.white60, fontSize: 12),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // ── Corps ──
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Bienvenue !',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1A1A2E),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Choisissez votre espace pour vous connecter.',
                      style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 28),

                    _RoleCard(
                      icon: Icons.family_restroom,
                      label: 'Espace Parents',
                      description:
                          'Consultez les notes, bulletins, absences et actualités de vos enfants.',
                      color: const Color(0xFF2E7D32),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ParentLoginScreen()),
                      ),
                    ),
                    const SizedBox(height: 16),

                    _RoleCard(
                      icon: Icons.school,
                      label: 'Espace Enseignants',
                      description:
                          'Gérez vos classes, devoirs, présences et programmes.',
                      color: const Color(0xFF1565C0),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const EnseignantLoginScreen()),
                      ),
                    ),

                    const SizedBox(height: 32),
                    Center(
                      child: TextButton.icon(
                        icon: const Icon(Icons.swap_horiz, size: 18),
                        label: const Text('Changer d\'établissement'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.grey[600],
                        ),
                        onPressed: () async {
                          await StorageService.clearServerUrl();
                          ApiService().resetBaseUrl();
                          if (!context.mounted) return;
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(
                              builder: (ctx) => OnboardingScreen(
                                onSetupComplete: () =>
                                    Navigator.pushReplacement(
                                  ctx,
                                  MaterialPageRoute(
                                    builder: (_) =>
                                        const RoleSelectionScreen(),
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String description;
  final Color color;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.label,
    required this.description,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: Colors.white, size: 26),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 13,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.arrow_forward_ios,
                color: Colors.white.withValues(alpha: 0.6),
                size: 15,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
