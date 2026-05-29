import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/etablissement_provider.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../theme/app_theme.dart';
import '../onboarding/onboarding_screen.dart';
import 'inscription_parent_screen.dart';

const _headerColor = Color(0xFF1A237E);

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey      = GlobalKey<FormState>();
  final _numeroCtrl   = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (auth.sessionExpiree) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Votre session a expiré. Veuillez vous reconnecter.'),
            backgroundColor: Color(0xFFB71C1C),
            duration: Duration(seconds: 4),
          ),
        );
        auth.acquitterSessionExpiree();
      }
    });
  }

  @override
  void dispose() {
    _numeroCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    final auth   = context.read<AuthProvider>();
    final result = await auth.loginUnifie(
      _numeroCtrl.text.trim(),
      _passwordCtrl.text,
    );

    if (!mounted) return;
    setState(() => _loading = false);

    switch (result) {
      case LoginSuccess():
        Navigator.of(context).popUntil((route) => route.isFirst);

      case LoginChoix(:final dataParent, :final dataEnseignant):
        await showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          isDismissible: false,
          enableDrag: false,
          builder: (_) => _RoleChoiceSheet(
            dataParent:     dataParent,
            dataEnseignant: dataEnseignant,
          ),
        );

      case LoginErreur(:final message):
        setState(() => _error = message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final etablissement = context.watch<EtablissementProvider>().info;

    return Scaffold(
      backgroundColor: _headerColor,
      body: SafeArea(
        child: Column(
          children: [
            // ── En-tête établissement ──
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 24, 28),
              child: Column(
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      icon: const Icon(Icons.swap_horiz,
                          size: 18, color: Colors.white70),
                      label: const Text(
                        'Changer d\'établissement',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      onPressed: _changerEtablissement,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (etablissement?.logoUrl != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        etablissement!.logoUrl!,
                        height: 64,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.school_outlined, size: 60, color: Colors.white,
                        ),
                      ),
                    )
                  else
                    const Icon(Icons.school_outlined,
                        size: 60, color: Colors.white),
                  const SizedBox(height: 12),
                  Text(
                    etablissement?.nom ?? 'Suivi Scolaire',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  if (etablissement?.slogan != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      etablissement!.slogan!,
                      style: const TextStyle(color: Colors.white60, fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                  ],
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
                padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                child: SingleChildScrollView(
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Connexion',
                          style: TextStyle(
                              fontSize: 22, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Entrez votre numéro et mot de passe pour accéder à votre espace.',
                          style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                        ),
                        const SizedBox(height: 28),

                        TextFormField(
                          controller: _numeroCtrl,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Numéro de téléphone',
                            hintText: 'Votre numéro enregistré',
                            prefixIcon: Icon(Icons.phone_outlined),
                          ),
                          validator: (v) => v == null || v.trim().isEmpty
                              ? 'Champ requis'
                              : null,
                        ),
                        const SizedBox(height: 16),

                        TextFormField(
                          controller: _passwordCtrl,
                          obscureText: _obscure,
                          decoration: InputDecoration(
                            labelText: 'Mot de passe',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              icon: Icon(_obscure
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined),
                              onPressed: () =>
                                  setState(() => _obscure = !_obscure),
                            ),
                          ),
                          validator: (v) =>
                              v == null || v.isEmpty ? 'Champ requis' : null,
                        ),

                        if (_error != null) ...[
                          const SizedBox(height: 16),
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
                                  child: Text(_error!,
                                      style:
                                          const TextStyle(color: Colors.red)),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 32),

                        SizedBox(
                          height: 52,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _headerColor,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _loading ? null : _submit,
                            child: _loading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white),
                                  )
                                : const Text(
                                    'Se connecter',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: Colors.white,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                          ),
                        ),

                        const SizedBox(height: 16),
                        Center(
                          child: TextButton(
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const InscriptionParentScreen(),
                              ),
                            ),
                            child: RichText(
                              text: TextSpan(
                                style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                                children: const [
                                  TextSpan(text: 'Pas encore de compte ? '),
                                  TextSpan(
                                    text: 'S\'inscrire',
                                    style: TextStyle(
                                      color: _headerColor,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
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

  void _changerEtablissement() async {
    await StorageService.clearServerUrl();
    ApiService().resetBaseUrl();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (ctx) => OnboardingScreen(
          onSetupComplete: () => Navigator.pushReplacement(
            ctx,
            MaterialPageRoute(builder: (_) => const LoginScreen()),
          ),
        ),
      ),
    );
  }
}

// ── Bottom sheet : choix du rôle quand le user est parent ET enseignant ────────

class _RoleChoiceSheet extends StatefulWidget {
  final Map<String, dynamic> dataParent;
  final Map<String, dynamic> dataEnseignant;

  const _RoleChoiceSheet({
    required this.dataParent,
    required this.dataEnseignant,
  });

  @override
  State<_RoleChoiceSheet> createState() => _RoleChoiceSheetState();
}

class _RoleChoiceSheetState extends State<_RoleChoiceSheet> {
  bool _loading = false;

  Future<void> _choisir(String role) async {
    setState(() => _loading = true);
    final data = role == 'enseignant' ? widget.dataEnseignant : widget.dataParent;
    await context.read<AuthProvider>().choisirRole(role, data);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      constraints: BoxConstraints(
        minHeight: MediaQuery.sizeOf(context).height * 0.55,
      ),
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 40, height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Choisissez votre espace',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Votre compte est associé à deux espaces. Dans lequel souhaitez-vous entrer ?',
            style: TextStyle(fontSize: 13, color: Colors.grey[600]),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),

          _RoleCard(
            icon: Icons.family_restroom,
            label: 'Espace Parents',
            description:
                'Consultez les notes, bulletins et absences de vos enfants.',
            color: const Color(0xFF2E7D32),
            loading: _loading,
            onTap: () => _choisir('parent'),
          ),
          const SizedBox(height: 12),
          _RoleCard(
            icon: Icons.school,
            label: 'Espace Enseignants',
            description: 'Gérez vos classes, devoirs et présences.',
            color: AppTheme.primary,
            loading: _loading,
            onTap: () => _choisir('enseignant'),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String description;
  final Color color;
  final bool loading;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.label,
    required this.description,
    required this.color,
    required this.loading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: loading ? null : onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                width: 52, height: 52,
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
