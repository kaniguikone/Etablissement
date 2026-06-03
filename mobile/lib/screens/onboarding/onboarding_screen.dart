import 'dart:async';
import 'package:dio/dio.dart';
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

class _OnboardingScreenState extends State<OnboardingScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;

  // ── Onglet Recherche ──────────────────────────────────────────────────────
  final _rechercheFormKey = GlobalKey<FormState>();
  final _urlCtrl          = TextEditingController();
  final _focusNode        = FocusNode();
  bool    _rechercheLoading  = false;
  String? _rechercheError;
  List<Map<String, dynamic>> _suggestions = [];
  bool    _showSuggestions = false;
  Timer?  _debounce;

  // ── Onglet Code ───────────────────────────────────────────────────────────
  final _codeFormKey  = GlobalKey<FormState>();
  final _codeCtrl     = TextEditingController();
  final _serveurCtrl  = TextEditingController();
  bool    _codeLoading      = false;
  String? _codeError;
  bool    _showServeurField = false;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _focusNode.addListener(() {
      if (!_focusNode.hasFocus) {
        setState(() => _showSuggestions = false);
      }
    });
    // Pré-remplir avec la valeur sauvegardée ou la valeur dart-define
    final saved = StorageService.getCachedCentralUrl();
    if (saved != null) _serveurCtrl.text = saved;
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _debounce?.cancel();
    _urlCtrl.dispose();
    _codeCtrl.dispose();
    _serveurCtrl.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  // ── Logique Recherche ─────────────────────────────────────────────────────

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    if (value.trim().length < 2) {
      setState(() { _suggestions = []; _showSuggestions = false; });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () async {
      try {
        final results = await ApiService().rechercherEtablissements(value.trim());
        if (mounted) {
          setState(() {
            _suggestions     = results;
            _showSuggestions = results.isNotEmpty;
          });
        }
      } catch (_) {}
    });
  }

  void _selectSuggestion(Map<String, dynamic> suggestion) {
    _urlCtrl.text = suggestion['domaine'] as String;
    setState(() { _suggestions = []; _showSuggestions = false; });
    _focusNode.unfocus();
  }

  String _normaliser(String raw) {
    return raw
        .trim()
        .replaceAll(RegExp(r'^https?://'), '')
        .replaceAll(RegExp(r'/.*$'), '');
  }

  Future<void> _validerRecherche() async {
    if (!_rechercheFormKey.currentState!.validate()) return;
    setState(() { _rechercheLoading = true; _rechercheError = null; });

    final host = _normaliser(_urlCtrl.text);
    await _connecterAvecDomaine(host, onError: (msg) {
      setState(() { _rechercheLoading = false; _rechercheError = msg; });
    });
  }

  // ── Logique Code ──────────────────────────────────────────────────────────

  Future<void> _validerCode() async {
    if (!_codeFormKey.currentState!.validate()) return;
    setState(() { _codeLoading = true; _codeError = null; });

    // Sauvegarder l'URL du serveur central si l'utilisateur l'a renseignée
    final serveurSaisi = _serveurCtrl.text.trim();
    if (serveurSaisi.isNotEmpty) {
      final host = serveurSaisi
          .replaceAll(RegExp(r'^https?://'), '')
          .replaceAll(RegExp(r'/.*$'), '');
      await StorageService.saveCentralUrl(host);
    }

    try {
      final result = await ApiService().rechercherParCode(_codeCtrl.text.trim());
      final domaine = result['domaine'] as String? ?? '';
      if (domaine.isEmpty) throw Exception('Domaine manquant');
      await _connecterAvecDomaine(domaine, onError: (msg) {
        setState(() { _codeLoading = false; _codeError = msg; });
      });
    } on DioException catch (e) {
      if (!mounted) return;
      final msg = e.response?.statusCode == 404
          ? 'Code introuvable. Vérifiez et réessayez.'
          : 'Erreur réseau. Vérifiez votre connexion.';
      setState(() { _codeLoading = false; _codeError = msg; });
    }
  }

  // ── Connexion commune ─────────────────────────────────────────────────────

  Future<void> _connecterAvecDomaine(
    String host, {
    required void Function(String message) onError,
  }) async {
    try {
      await StorageService.saveServerUrl(host);
      ApiService().resetBaseUrl();

      await ApiService().getEtablissement();

      if (!mounted) return;
      await context.read<EtablissementProvider>().reload();
      widget.onSetupComplete();
    } on DioException catch (e) {
      await StorageService.clearServerUrl();
      ApiService().resetBaseUrl();
      if (!mounted) return;
      final detail = e.response != null
          ? 'HTTP ${e.response!.statusCode}'
          : e.message ?? e.type.name;
      onError('Erreur connexion "$host" : $detail');
    } catch (e) {
      await StorageService.clearServerUrl();
      ApiService().resetBaseUrl();
      if (!mounted) return;
      onError('Erreur inattendue : $e');
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primary,
      body: SafeArea(
        child: Column(
          children: [
            // ── En-tête ──
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
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

            // ── Onglets ──
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 28),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                controller: _tabCtrl,
                indicator: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                labelColor: AppTheme.primary,
                unselectedLabelColor: Colors.white,
                tabs: const [
                  Tab(text: 'Code école'),
                  Tab(text: 'Rechercher'),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // ── Corps ──
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: TabBarView(
                  controller: _tabCtrl,
                  children: [
                    _buildCodeTab(),
                    _buildRechercheTab(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Onglet 1 : Recherche par nom / adresse ────────────────────────────────

  Widget _buildRechercheTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(28),
      child: Form(
        key: _rechercheFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 4),
            const Text(
              'Sélectionnez votre école',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Tapez le nom de votre établissement pour le retrouver, '
              'ou saisissez directement son adresse.',
              style: TextStyle(color: Colors.black54, height: 1.4),
            ),
            const SizedBox(height: 28),

            // ── Champ + suggestions ──
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _urlCtrl,
                  focusNode: _focusNode,
                  keyboardType: TextInputType.url,
                  autocorrect: false,
                  onChanged: _onSearchChanged,
                  decoration: const InputDecoration(
                    labelText: 'Nom ou adresse de l\'école',
                    hintText: 'ex : Lycée Moderne ou lycee-moderne.monapp.ci',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Champ requis' : null,
                ),

                if (_showSuggestions)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey[300]!),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _suggestions.length,
                      separatorBuilder: (_, __) =>
                          Divider(height: 1, color: Colors.grey[200]),
                      itemBuilder: (context, i) {
                        final s = _suggestions[i];
                        return ListTile(
                          dense: true,
                          leading: const Icon(
                            Icons.school_outlined,
                            size: 20,
                            color: AppTheme.primary,
                          ),
                          title: Text(
                            s['nom'] as String,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          subtitle: Text(
                            s['domaine'] as String,
                            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                          ),
                          onTap: () => _selectSuggestion(s),
                        );
                      },
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 12),
            if (_rechercheError != null) _buildErreur(_rechercheError!),
            const SizedBox(height: 28),

            _buildBouton(
              loading: _rechercheLoading,
              onPressed: _validerRecherche,
            ),
          ],
        ),
      ),
    );
  }

  // ── Onglet 2 : Code établissement ─────────────────────────────────────────

  Widget _buildCodeTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(28),
      child: Form(
        key: _codeFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 4),
            const Text(
              'Code MENET',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Saisissez le code officiel de votre établissement attribué par le Ministère de l\'Éducation Nationale.',
              style: TextStyle(color: Colors.black54, height: 1.4),
            ),
            const SizedBox(height: 28),

            TextFormField(
              controller: _codeCtrl,
              keyboardType: TextInputType.text,
              textCapitalization: TextCapitalization.characters,
              autocorrect: false,
              maxLength: 20,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                letterSpacing: 8,
              ),
              textAlign: TextAlign.center,
              decoration: const InputDecoration(
                labelText: 'Code école',
                hintText: 'ABC123',
                prefixIcon: Icon(Icons.vpn_key_rounded),
                counterText: '',
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Champ requis';
                if (v.trim().length < 6) return 'Le code doit contenir 6 caractères';
                return null;
              },
            ),

            const SizedBox(height: 12),
            if (_codeError != null) _buildErreur(_codeError!),

            // ── Paramètres réseau (collapsible) ──
            const SizedBox(height: 8),
            InkWell(
              onTap: () => setState(() => _showServeurField = !_showServeurField),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.settings_ethernet,
                      size: 16,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Paramètres réseau',
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      _showServeurField
                          ? Icons.keyboard_arrow_up
                          : Icons.keyboard_arrow_down,
                      size: 16,
                      color: Colors.grey[600],
                    ),
                  ],
                ),
              ),
            ),
            if (_showServeurField) ...[
              const SizedBox(height: 8),
              TextFormField(
                controller: _serveurCtrl,
                keyboardType: TextInputType.url,
                autocorrect: false,
                decoration: const InputDecoration(
                  labelText: 'Adresse du serveur',
                  hintText: 'ex: 192.168.1.45:8000 ou monapp.ci',
                  prefixIcon: Icon(Icons.dns_outlined),
                  helperText: 'À renseigner uniquement si demandé par votre école.',
                  helperMaxLines: 2,
                ),
              ),
            ],

            const SizedBox(height: 28),
            _buildBouton(
              loading: _codeLoading,
              onPressed: _validerCode,
            ),
          ],
        ),
      ),
    );
  }

  // ── Widgets communs ───────────────────────────────────────────────────────

  Widget _buildErreur(String message) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red[200]!),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message, style: const TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Widget _buildBouton({
    required bool loading,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      height: 52,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        onPressed: loading ? null : onPressed,
        child: loading
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
                style: TextStyle(fontSize: 16, color: Colors.white),
              ),
      ),
    );
  }
}
