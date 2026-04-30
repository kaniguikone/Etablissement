import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/etablissement_provider.dart';
import '../../theme/app_theme.dart';
// import 'inscription_screen.dart';
// import 'suivi_inscription_screen.dart';

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

  static const _colorParent     = AppTheme.primary;
  static const _colorEnseignant = Color(0xFF1565C0);

  @override
  void dispose() {
    _numeroCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
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

  void _switchRole(UserRole role) {
    if (_role == role) return;
    setState(() {
      _role  = role;
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isEnseignant  = _role == UserRole.enseignant;
    final accentColor   = isEnseignant ? _colorEnseignant : _colorParent;
    final etablissement = context.watch<EtablissementProvider>().info;

    return Scaffold(
      body: AnimatedContainer(
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeInOut,
        color: accentColor,
        child: SafeArea(
          child: Column(
            children: [
              // ── En-tête ──
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 36, 24, 32),
                child: Column(
                  children: [
                    if (etablissement?.logoUrl != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          etablissement!.logoUrl!,
                          height: 72,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => _RoleIcon(
                            isEnseignant: isEnseignant,
                          ),
                        ),
                      )
                    else
                      _RoleIcon(isEnseignant: isEnseignant),
                    const SizedBox(height: 14),
                    Text(
                      etablissement?.nom ?? 'Suivi Scolaire',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (etablissement?.slogan != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        etablissement!.slogan!,
                        style: const TextStyle(
                            color: Colors.white60, fontSize: 12),
                        textAlign: TextAlign.center,
                      ),
                    ],
                    const SizedBox(height: 8),
                    // Titre animé selon le rôle
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 250),
                      transitionBuilder: (child, animation) => FadeTransition(
                        opacity: animation,
                        child: SlideTransition(
                          position: Tween<Offset>(
                            begin: const Offset(0, 0.3),
                            end: Offset.zero,
                          ).animate(animation),
                          child: child,
                        ),
                      ),
                      child: Text(
                        isEnseignant ? 'Espace Enseignants' : 'Espace Parents',
                        key: ValueKey(_role),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
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
                    borderRadius:
                        BorderRadius.vertical(top: Radius.circular(28)),
                  ),
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                  child: SingleChildScrollView(
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // ── Sélecteur de rôle ──
                          Row(
                            children: [
                              _RoleCard(
                                label: 'Parent',
                                subtitle: 'Suivez vos enfants',
                                icon: Icons.family_restroom,
                                selected: _role == UserRole.parent,
                                color: _colorParent,
                                onTap: () => _switchRole(UserRole.parent),
                              ),
                              const SizedBox(width: 12),
                              _RoleCard(
                                label: 'Enseignant',
                                subtitle: 'Gérez vos classes',
                                icon: Icons.school,
                                selected: _role == UserRole.enseignant,
                                color: _colorEnseignant,
                                onTap: () =>
                                    _switchRole(UserRole.enseignant),
                              ),
                            ],
                          ),
                          const SizedBox(height: 28),

                          // ── Numéro ──
                          TextFormField(
                            controller: _numeroCtrl,
                            keyboardType: TextInputType.phone,
                            decoration: InputDecoration(
                              labelText: 'Numéro de téléphone',
                              hintText: isEnseignant
                                  ? 'Ex : 07 00 00 00 00'
                                  : 'Votre numéro enregistré',
                              prefixIcon: const Icon(Icons.phone_outlined),
                            ),
                            validator: (v) =>
                                v == null || v.trim().isEmpty
                                    ? 'Champ requis'
                                    : null,
                          ),
                          const SizedBox(height: 16),

                          // ── Mot de passe ──
                          TextFormField(
                            controller: _passwordCtrl,
                            obscureText: _obscure,
                            decoration: InputDecoration(
                              labelText: 'Mot de passe',
                              prefixIcon:
                                  const Icon(Icons.lock_outline),
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
                          if (_error != null) ...[
                            const SizedBox(height: 4),
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
                                      style: const TextStyle(
                                          color: Colors.red),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],

                          const SizedBox(height: 28),

                          // ── Bouton ──
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 320),
                            curve: Curves.easeInOut,
                            height: 52,
                            decoration: BoxDecoration(
                              color: _loading ? Colors.grey[300] : accentColor,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(12),
                                onTap: _loading ? null : _submit,
                                child: Center(
                                  child: _loading
                                      ? const SizedBox(
                                          width: 22,
                                          height: 22,
                                          child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.white),
                                        )
                                      : AnimatedSwitcher(
                                          duration: const Duration(
                                              milliseconds: 200),
                                          child: Text(
                                            isEnseignant
                                                ? 'Connexion Espace Enseignants'
                                                : 'Connexion Espace Parents',
                                            key: ValueKey(_role),
                                            style: const TextStyle(
                                              fontSize: 15,
                                              color: Colors.white,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                ),
                              ),
                            ),
                          ),

                          // ── Liens inscription (en attente) ──
                          // if (_role == UserRole.parent) ...[ ... ]
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Icône animée dans l'en-tête selon le rôle
class _RoleIcon extends StatelessWidget {
  final bool isEnseignant;
  const _RoleIcon({required this.isEnseignant});

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 250),
      child: Icon(
        isEnseignant ? Icons.school : Icons.family_restroom,
        key: ValueKey(isEnseignant),
        size: 68,
        color: Colors.white,
      ),
    );
  }
}

// Carte de sélection de rôle
class _RoleCard extends StatelessWidget {
  final String label;
  final String subtitle;
  final IconData icon;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _RoleCard({
    required this.label,
    required this.subtitle,
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
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeInOut,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          decoration: BoxDecoration(
            color: selected ? color : Colors.grey[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? color : Colors.grey[300]!,
              width: selected ? 0 : 1,
            ),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: color.withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    )
                  ]
                : [],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 26,
                color: selected ? Colors.white : color,
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: selected ? Colors.white : Colors.grey[800],
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 11,
                  color: selected
                      ? Colors.white.withValues(alpha: 0.8)
                      : Colors.grey[500],
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
