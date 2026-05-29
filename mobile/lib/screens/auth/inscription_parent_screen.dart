import 'package:dio/dio.dart' show DioException;
import 'package:flutter/material.dart';
import '../../services/api_service.dart';

const _headerColor = Color(0xFF1A237E);

class InscriptionParentScreen extends StatefulWidget {
  const InscriptionParentScreen({super.key});

  @override
  State<InscriptionParentScreen> createState() =>
      _InscriptionParentScreenState();
}

class _InscriptionParentScreenState extends State<InscriptionParentScreen> {
  int _etape = 1; // 1: matricule  2: infos  3: succès

  // Étape 1
  final _matriculeCtrl = TextEditingController();
  bool _verifEnCours = false;
  String? _errMatricule;
  Map<String, dynamic>? _eleve;

  // Étape 2
  final _formKey     = GlobalKey<FormState>();
  final _nomCtrl     = TextEditingController();
  final _prenomCtrl  = TextEditingController();
  final _numeroCtrl  = TextEditingController();
  final _passwordCtrl = TextEditingController();
  String _relation   = '';
  bool _obscure      = true;
  bool _chargement   = false;
  String? _errGlobal;

  // Étape 3
  Map<String, dynamic>? _resultat;

  @override
  void dispose() {
    _matriculeCtrl.dispose();
    _nomCtrl.dispose();
    _prenomCtrl.dispose();
    _numeroCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _verifierMatricule() async {
    final m = _matriculeCtrl.text.trim();
    if (m.isEmpty) return;
    setState(() { _verifEnCours = true; _errMatricule = null; });
    try {
      final data = await ApiService().validerMatricule(m);
      setState(() {
        _eleve = data['eleve'] as Map<String, dynamic>;
        _etape = 2;
      });
    } catch (e) {
      final msg = _extraireMessage(e);
      setState(() => _errMatricule = msg);
    } finally {
      setState(() => _verifEnCours = false);
    }
  }

  Future<void> _soumettre() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _chargement = true; _errGlobal = null; });
    try {
      final data = await ApiService().inscrireParent({
        'nom_parent':      _nomCtrl.text.trim(),
        'prenom_parent':   _prenomCtrl.text.trim(),
        'numero_parent':   _numeroCtrl.text.trim(),
        'password':        _passwordCtrl.text,
        'matricule_eleve': _matriculeCtrl.text.trim(),
        if (_relation.isNotEmpty) 'relation': _relation,
      });
      setState(() {
        _resultat = data;
        _etape = 3;
      });
    } catch (e) {
      setState(() => _errGlobal = _extraireMessage(e));
    } finally {
      setState(() => _chargement = false);
    }
  }

  String _extraireMessage(Object e) {
    if (e is DioException) {
      final msg = e.response?.data?['message'];
      if (msg is String) return msg;
      return e.message ?? 'Une erreur est survenue.';
    }
    return 'Une erreur est survenue.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _headerColor,
      body: SafeArea(
        child: Column(
          children: [
            // En-tête
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 24, 20),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const Expanded(
                    child: Text(
                      'Créer un compte parent',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(width: 40),
                ],
              ),
            ),

            // Corps
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Indicateur d'étapes
                      if (_etape < 3) _indicateurEtapes(),
                      const SizedBox(height: 28),

                      if (_etape == 1) _etapeMatricule(),
                      if (_etape == 2) _etapeInfos(),
                      if (_etape == 3) _etapeSucces(),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _indicateurEtapes() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(2, (i) {
        final n = i + 1;
        final actif = _etape >= n;
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6),
          child: Container(
            width: 32, height: 32,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: actif ? _headerColor : Colors.grey[200],
            ),
            child: Center(
              child: Text(
                '$n',
                style: TextStyle(
                  color: actif ? Colors.white : Colors.grey[600],
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  // ── Étape 1 : saisie du matricule ─────────────────────────────────────────

  Widget _etapeMatricule() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Matricule de votre enfant',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(
          'Saisissez le matricule indiqué sur le bulletin ou la carte scolaire de votre enfant.',
          style: TextStyle(fontSize: 13, color: Colors.grey[600]),
        ),
        const SizedBox(height: 24),

        if (_errMatricule != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.red[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red[200]!),
            ),
            child: Text(_errMatricule!,
                style: const TextStyle(color: Colors.red, fontSize: 13)),
          ),

        TextFormField(
          controller: _matriculeCtrl,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(
            labelText: 'Matricule',
            hintText: 'ex : LY-2024-0123',
            prefixIcon: Icon(Icons.badge_outlined),
          ),
        ),
        const SizedBox(height: 24),

        SizedBox(
          height: 52,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _headerColor,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _verifEnCours ? null : _verifierMatricule,
            child: _verifEnCours
                ? const SizedBox(
                    width: 22, height: 22,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Continuer',
                    style: TextStyle(
                        fontSize: 16,
                        color: Colors.white,
                        fontWeight: FontWeight.w600)),
          ),
        ),
      ],
    );
  }

  // ── Étape 2 : informations personnelles ───────────────────────────────────

  Widget _etapeInfos() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Vos informations',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),

          // Récap élève
          if (_eleve != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Row(
                children: [
                  const Icon(Icons.school, color: Colors.blue, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${_eleve!['nom']} ${_eleve!['prenoms']} — ${_eleve!['classe'] ?? ''}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),

          if (_errGlobal != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red[200]!),
              ),
              child: Text(_errGlobal!,
                  style: const TextStyle(color: Colors.red, fontSize: 13)),
            ),

          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _nomCtrl,
                  decoration: const InputDecoration(labelText: 'Nom'),
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Requis' : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _prenomCtrl,
                  decoration: const InputDecoration(labelText: 'Prénom'),
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Requis' : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          TextFormField(
            controller: _numeroCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Numéro de téléphone',
              hintText: '0701234567',
              prefixIcon: Icon(Icons.phone_outlined),
            ),
            validator: (v) =>
                v == null || v.trim().isEmpty ? 'Requis' : null,
          ),
          const SizedBox(height: 12),

          TextFormField(
            controller: _passwordCtrl,
            obscureText: _obscure,
            decoration: InputDecoration(
              labelText: 'Mot de passe',
              hintText: 'Minimum 6 caractères',
              prefixIcon: const Icon(Icons.lock_outline),
              suffixIcon: IconButton(
                icon: Icon(_obscure
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
            validator: (v) => v == null || v.length < 6
                ? 'Minimum 6 caractères'
                : null,
          ),
          const SizedBox(height: 12),

          DropdownButtonFormField<String>(
            initialValue: _relation.isEmpty ? null : _relation,
            decoration: const InputDecoration(
              labelText: 'Lien avec l\'élève',
              prefixIcon: Icon(Icons.people_outline),
            ),
            items: const [
              DropdownMenuItem(value: 'Père',   child: Text('Père')),
              DropdownMenuItem(value: 'Mère',   child: Text('Mère')),
              DropdownMenuItem(value: 'Tuteur', child: Text('Tuteur')),
              DropdownMenuItem(value: 'Autre',  child: Text('Autre')),
            ],
            onChanged: (v) => setState(() => _relation = v ?? ''),
          ),
          const SizedBox(height: 28),

          Row(
            children: [
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  minimumSize: const Size(52, 52),
                ),
                onPressed: () => setState(() => _etape = 1),
                child: const Icon(Icons.arrow_back),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _headerColor,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: _chargement ? null : _soumettre,
                    child: _chargement
                        ? const SizedBox(
                            width: 22, height: 22,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('S\'inscrire',
                            style: TextStyle(
                                fontSize: 16,
                                color: Colors.white,
                                fontWeight: FontWeight.w600)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Étape 3 : confirmation ────────────────────────────────────────────────

  Widget _etapeSucces() {
    final actif = _resultat?['statut'] == 'actif';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 16),
        Center(
          child: Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: actif ? Colors.green[600] : Colors.orange[600],
            ),
            child: Icon(
              actif ? Icons.check : Icons.access_time,
              color: Colors.white,
              size: 32,
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          actif ? 'Compte activé !' : 'Inscription reçue',
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
        Text(
          _resultat?['message'] ?? '',
          style: TextStyle(fontSize: 14, color: Colors.grey[600], height: 1.5),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        SizedBox(
          height: 52,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _headerColor,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => Navigator.pop(context),
            child: Text(
              actif ? 'Se connecter' : 'Retour',
              style: const TextStyle(
                  fontSize: 16,
                  color: Colors.white,
                  fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ],
    );
  }
}
