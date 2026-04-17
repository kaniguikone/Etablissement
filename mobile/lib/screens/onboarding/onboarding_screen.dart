import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/etablissement_provider.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../theme/app_theme.dart';

class OnboardingScreen extends StatefulWidget {
  final VoidCallback onSetupComplete;

  const OnboardingScreen({super.key, required this.onSetupComplete});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _formKey  = GlobalKey<FormState>();
  final _urlCtrl  = TextEditingController();
  bool   _loading = false;
  String? _error;

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  /// Normalise la saisie en host pur (sans schème ni chemin).
  /// Ex : "https://lycee-test.monapp.ci/app" → "lycee-test.monapp.ci"
  String _normaliser(String raw) {
    return raw
        .trim()
        .replaceAll(RegExp(r'^https?://'), '')
        .replaceAll(RegExp(r'/.*$'), '');
  }

  Future<void> _valider() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    final host = _normaliser(_urlCtrl.text);

    try {
      await StorageService.saveServerUrl(host);
      ApiService().resetBaseUrl();

      // Vérification : teste la connexion en chargeant les infos établissement
      await ApiService().getEtablissement();

      if (!mounted) return;
      await context.read<EtablissementProvider>().reload();
      widget.onSetupComplete();
    } catch (_) {
      // Annuler si l'URL est invalide
      await StorageService.clearServerUrl();
      ApiService().resetBaseUrl();
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error   = 'Impossible de se connecter. Vérifiez l\'adresse saisie.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primary,
      body: SafeArea(
        child: Column(
          children: [
            // ── En-tête ──
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Column(
                children: [
                  Icon(Icons.school_rounded, size: 72, color: Colors.white),
                  SizedBox(height: 16),
                  Text(
                    'Suivi Scolaire',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Bienvenue !',
                    style: TextStyle(color: Colors.white70, fontSize: 16),
                  ),
                ],
              ),
            ),

            // ── Formulaire ──
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                ),
                padding: const EdgeInsets.all(28),
                child: SingleChildScrollView(
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 4),
                        const Text(
                          'Configurer votre école',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Entrez l\'adresse de votre établissement. '
                          'Vous la trouverez dans le lien fourni par votre école.',
                          style: TextStyle(color: Colors.black54, height: 1.4),
                        ),
                        const SizedBox(height: 28),

                        // ── Champ URL ──
                        TextFormField(
                          controller: _urlCtrl,
                          keyboardType: TextInputType.url,
                          autocorrect: false,
                          decoration: const InputDecoration(
                            labelText: 'Adresse de l\'école',
                            hintText: 'ex : lycee-moderne.monapp.ci',
                            prefixIcon: Icon(Icons.link_rounded),
                          ),
                          validator: (v) =>
                              v == null || v.trim().isEmpty ? 'Champ requis' : null,
                        ),
                        const SizedBox(height: 12),

                        // ── Erreur ──
                        if (_error != null)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red[50],
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red[200]!),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline,
                                    color: Colors.red, size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _error!,
                                    style: const TextStyle(color: Colors.red),
                                  ),
                                ),
                              ],
                            ),
                          ),

                        const SizedBox(height: 28),

                        // ── Bouton valider ──
                        SizedBox(
                          height: 52,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: _loading ? null : _valider,
                            child: _loading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text(
                                    'Continuer',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: Colors.white,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
