import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/etablissement_provider.dart';
import '../../theme/app_theme.dart';
import 'inscription_screen.dart';
import 'suivi_inscription_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey      = GlobalKey<FormState>();
  final _numeroCtrl   = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading       = false;
  bool _obscure       = true;
  UserRole _role      = UserRole.parent;
  String? _error;

  @override
  void dispose() {
    _numeroCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  void _afficherSuivi(BuildContext context) {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Suivre ma demande'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            labelText: 'Token reçu lors de l\'inscription',
            hintText: 'Ex: aB3xK9...',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () {
              final token = ctrl.text.trim();
              if (token.isEmpty) return;
              Navigator.pop(ctx);
              Navigator.push(context, MaterialPageRoute(
                builder: (_) => SuiviInscriptionScreen(token: token),
              ));
            },
            child: const Text('Suivre'),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    final auth = context.read<AuthProvider>();
    final String? err;

    if (_role == UserRole.parent) {
      err = await auth.loginParent(_numeroCtrl.text.trim(), _passwordCtrl.text);
    } else {
      err = await auth.loginEnseignant(_numeroCtrl.text.trim(), _passwordCtrl.text);
    }

    if (mounted) {
      setState(() { _loading = false; _error = err; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEnseignant  = _role == UserRole.enseignant;
    final accentColor   = isEnseignant ? const Color(0xFF1565C0) : AppTheme.primary;
    final etablissement = context.watch<EtablissementProvider>().info;

    return Scaffold(
      backgroundColor: accentColor,
      body: SafeArea(
        child: Column(
          children: [
            // ── En-tête ──
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Column(
                children: [
                  // Logo établissement ou icône par défaut
                  if (etablissement?.logoUrl != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        etablissement!.logoUrl!,
                        height: 72,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => Icon(
                          isEnseignant ? Icons.school : Icons.family_restroom,
                          size: 64, color: Colors.white,
                        ),
                      ),
                    )
                  else
                    Icon(
                      isEnseignant ? Icons.school : Icons.family_restroom,
                      size: 64, color: Colors.white,
                    ),
                  const SizedBox(height: 12),
                  Text(
                    etablissement?.nom ?? 'Suivi Scolaire',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
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
                  const SizedBox(height: 4),
                  Text(
                    isEnseignant ? 'Espace Enseignants' : 'Espace Parents',
                    style: const TextStyle(color: Colors.white70, fontSize: 15),
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
                          'Connexion',
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 20),

                        // ── Sélecteur de rôle ──
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.all(4),
                          child: Row(
                            children: [
                              _RoleTab(
                                label: 'Parent',
                                icon: Icons.family_restroom,
                                selected: _role == UserRole.parent,
                                color: AppTheme.primary,
                                onTap: () => setState(() {
                                  _role = UserRole.parent;
                                  _error = null;
                                }),
                              ),
                              _RoleTab(
                                label: 'Enseignant',
                                icon: Icons.school,
                                selected: _role == UserRole.enseignant,
                                color: const Color(0xFF1565C0),
                                onTap: () => setState(() {
                                  _role = UserRole.enseignant;
                                  _error = null;
                                }),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // ── Numéro ──
                        TextFormField(
                          controller: _numeroCtrl,
                          keyboardType: TextInputType.phone,
                          decoration: InputDecoration(
                            labelText: isEnseignant
                                ? 'Numéro de téléphone'
                                : 'Numéro de téléphone',
                            prefixIcon: const Icon(Icons.phone),
                          ),
                          validator: (v) =>
                              v == null || v.trim().isEmpty ? 'Champ requis' : null,
                        ),
                        const SizedBox(height: 16),

                        // ── Mot de passe ──
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
                                  child: Text(_error!,
                                      style:
                                          const TextStyle(color: Colors.red)),
                                ),
                              ],
                            ),
                          ),

                        const SizedBox(height: 24),

                        // ── Liens inscription (visible uniquement pour les parents) ──
                        if (_role == UserRole.parent) ...[
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              TextButton(
                                onPressed: () => Navigator.push(context,
                                    MaterialPageRoute(builder: (_) => const InscriptionScreen())),
                                child: const Text('Inscrire mon enfant',
                                    style: TextStyle(fontSize: 13)),
                              ),
                              const Text('·', style: TextStyle(color: Colors.grey)),
                              TextButton(
                                onPressed: () => _afficherSuivi(context),
                                child: const Text('Suivre ma demande',
                                    style: TextStyle(fontSize: 13)),
                              ),
                            ],
                          ),
                        ],

                        const SizedBox(height: 8),

                        // ── Bouton ──
                        SizedBox(
                          height: 52,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: accentColor,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _loading ? null : _submit,
                            child: _loading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white),
                                  )
                                : const Text('Se connecter',
                                    style: TextStyle(
                                        fontSize: 16, color: Colors.white)),
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

class _RoleTab extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _RoleTab({
    required this.label,
    required this.icon,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? color : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 18,
                  color: selected ? Colors.white : Colors.grey[500]),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: selected ? Colors.white : Colors.grey[500],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
