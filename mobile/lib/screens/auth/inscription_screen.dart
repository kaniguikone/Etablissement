import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import 'suivi_inscription_screen.dart';

class InscriptionScreen extends StatefulWidget {
  const InscriptionScreen({super.key});

  @override
  State<InscriptionScreen> createState() => _InscriptionScreenState();
}

class _InscriptionScreenState extends State<InscriptionScreen> {
  final _api      = ApiService();
  final _pageCtrl = PageController();
  int _page       = 0; // 0 = élève, 1 = parent
  bool _saving    = false;
  String? _erreur;

  // Niveaux
  List<Map<String, dynamic>> _niveaux = [];
  int? _niveauId;

  // Champs élève
  final _nomEleve        = TextEditingController();
  final _prenomsEleve    = TextEditingController();
  final _dateNaissance   = TextEditingController();
  String _genre          = 'M';
  final _lieuNaissance   = TextEditingController();
  final _nationalite     = TextEditingController();

  // Champs parent
  final _nomParent       = TextEditingController();
  final _prenomParent    = TextEditingController();
  final _numeroParent    = TextEditingController();
  final _emailParent     = TextEditingController();
  String _relation       = 'Père';
  final _profParent      = TextEditingController();

  final _formKeyEleve  = GlobalKey<FormState>();
  final _formKeyParent = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _nationalite.text = 'Ivoirienne';
    _chargerNiveaux();
  }

  @override
  void dispose() {
    for (final c in [_nomEleve, _prenomsEleve, _dateNaissance, _lieuNaissance,
                     _nationalite, _nomParent, _prenomParent, _numeroParent,
                     _emailParent, _profParent]) {
      c.dispose();
    }
    _pageCtrl.dispose();
    super.dispose();
  }

  Future<void> _chargerNiveaux() async {
    try {
      final data = await _api.getNiveaux();
      setState(() => _niveaux = data.cast<Map<String, dynamic>>());
    } catch (_) {}
  }

  void _allerPage(int page) {
    if (page == 1 && !_formKeyEleve.currentState!.validate()) return;
    setState(() => _page = page);
    _pageCtrl.animateToPage(page,
        duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
  }

  Future<void> _soumettre() async {
    if (!_formKeyParent.currentState!.validate()) return;
    setState(() { _saving = true; _erreur = null; });

    try {
      final result = await _api.soumettreInscription({
        'nom_eleve':            _nomEleve.text.trim(),
        'prenoms_eleve':        _prenomsEleve.text.trim(),
        'date_naissance_eleve': _dateNaissance.text.trim(),
        'genre_eleve':          _genre,
        'lieu_naissance_eleve': _lieuNaissance.text.trim(),
        'nationalite_eleve':    _nationalite.text.trim(),
        'niveau_id':            _niveauId,
        'nom_parent':           _nomParent.text.trim(),
        'prenom_parent':        _prenomParent.text.trim(),
        'numero_parent':        _numeroParent.text.trim(),
        'email_parent':         _emailParent.text.trim(),
        'relation_parent':      _relation,
        'profession_parent':    _profParent.text.trim(),
      });

      final token = result['token'] as String;
      if (mounted) {
        Navigator.pushReplacement(context, MaterialPageRoute(
          builder: (_) => SuiviInscriptionScreen(token: token),
        ));
      }
    } catch (e) {
      setState(() => _erreur = 'Erreur : ${e.toString()}');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primary,
      appBar: AppBar(
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        title: const Text('Inscription en ligne'),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Indicateur d'étape
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            child: Row(
              children: [
                _StepDot(numero: 1, label: 'Élève', actif: _page == 0),
                Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.4))),
                _StepDot(numero: 2, label: 'Parent', actif: _page == 1),
              ],
            ),
          ),

          // Formulaire
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: PageView(
                controller: _pageCtrl,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _PageEleve(
                    formKey:      _formKeyEleve,
                    nomCtrl:      _nomEleve,
                    prenomsCtrl:  _prenomsEleve,
                    dateCtrl:     _dateNaissance,
                    lieuCtrl:     _lieuNaissance,
                    natiCtrl:     _nationalite,
                    genre:        _genre,
                    onGenre:      (v) => setState(() => _genre = v),
                    niveaux:      _niveaux,
                    niveauId:     _niveauId,
                    onNiveau:     (v) => setState(() => _niveauId = v),
                    onSuivant:    () => _allerPage(1),
                  ),
                  _PageParent(
                    formKey:    _formKeyParent,
                    nomCtrl:    _nomParent,
                    prenomCtrl: _prenomParent,
                    numCtrl:    _numeroParent,
                    emailCtrl:  _emailParent,
                    profCtrl:   _profParent,
                    relation:   _relation,
                    onRelation: (v) => setState(() => _relation = v),
                    erreur:     _erreur,
                    saving:     _saving,
                    onRetour:   () => _allerPage(0),
                    onSoumettre: _soumettre,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Page 1 : Élève ────────────────────────────────────────────────────────────

class _PageEleve extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController nomCtrl, prenomsCtrl, dateCtrl, lieuCtrl, natiCtrl;
  final String genre;
  final ValueChanged<String> onGenre;
  final List<Map<String, dynamic>> niveaux;
  final int? niveauId;
  final ValueChanged<int?> onNiveau;
  final VoidCallback onSuivant;

  const _PageEleve({
    required this.formKey, required this.nomCtrl, required this.prenomsCtrl,
    required this.dateCtrl, required this.lieuCtrl, required this.natiCtrl,
    required this.genre, required this.onGenre, required this.niveaux,
    required this.niveauId, required this.onNiveau, required this.onSuivant,
  });

  @override
  Widget build(BuildContext context) => Form(
    key: formKey,
    child: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const Text('Informations de l\'élève',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 20),
        _Champ(ctrl: nomCtrl, label: 'Nom', requis: true),
        _Champ(ctrl: prenomsCtrl, label: 'Prénoms', requis: true),
        // Date de naissance
        TextFormField(
          controller: dateCtrl,
          readOnly: true,
          decoration: const InputDecoration(
            labelText: 'Date de naissance *',
            prefixIcon: Icon(Icons.calendar_today),
          ),
          validator: (v) => v == null || v.isEmpty ? 'Requis' : null,
          onTap: () async {
            final d = await showDatePicker(
              context: context,
              initialDate: DateTime(2010),
              firstDate: DateTime(1990),
              lastDate: DateTime.now(),
            );
            if (d != null) dateCtrl.text = d.toIso8601String().substring(0, 10);
          },
        ),
        const SizedBox(height: 12),
        // Genre
        Row(children: [
          const Text('Genre * : ', style: TextStyle(fontSize: 14)),
          const SizedBox(width: 12),
          ChoiceChip(label: const Text('Masculin'), selected: genre == 'M',
              onSelected: (_) => onGenre('M')),
          const SizedBox(width: 8),
          ChoiceChip(label: const Text('Féminin'), selected: genre == 'F',
              onSelected: (_) => onGenre('F')),
        ]),
        const SizedBox(height: 12),
        _Champ(ctrl: lieuCtrl, label: 'Lieu de naissance'),
        _Champ(ctrl: natiCtrl, label: 'Nationalité'),
        // Niveau
        DropdownButtonFormField<int>(
          initialValue: niveauId,
          decoration: const InputDecoration(
            labelText: 'Niveau souhaité',
            prefixIcon: Icon(Icons.school_outlined),
          ),
          items: niveaux.map((n) => DropdownMenuItem<int>(
            value: n['id'] as int,
            child: Text(n['nom_niveau'] as String),
          )).toList(),
          onChanged: onNiveau,
        ),
        const SizedBox(height: 28),
        ElevatedButton(
          onPressed: onSuivant,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: const Text('Suivant — Informations parent'),
        ),
      ],
    ),
  );
}

// ── Page 2 : Parent ───────────────────────────────────────────────────────────

class _PageParent extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController nomCtrl, prenomCtrl, numCtrl, emailCtrl, profCtrl;
  final String relation;
  final ValueChanged<String> onRelation;
  final String? erreur;
  final bool saving;
  final VoidCallback onRetour, onSoumettre;

  const _PageParent({
    required this.formKey, required this.nomCtrl, required this.prenomCtrl,
    required this.numCtrl, required this.emailCtrl, required this.profCtrl,
    required this.relation, required this.onRelation,
    required this.erreur, required this.saving,
    required this.onRetour, required this.onSoumettre,
  });

  @override
  Widget build(BuildContext context) => Form(
    key: formKey,
    child: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const Text('Informations du parent / tuteur',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 20),
        _Champ(ctrl: nomCtrl, label: 'Nom', requis: true),
        _Champ(ctrl: prenomCtrl, label: 'Prénom', requis: true),
        _Champ(ctrl: numCtrl, label: 'Numéro de téléphone', requis: true,
            type: TextInputType.phone),
        _Champ(ctrl: emailCtrl, label: 'Email', type: TextInputType.emailAddress),
        _Champ(ctrl: profCtrl, label: 'Profession'),
        // Relation
        DropdownButtonFormField<String>(
          initialValue: relation,
          decoration: const InputDecoration(
            labelText: 'Relation avec l\'élève',
            prefixIcon: Icon(Icons.people_outline),
          ),
          items: ['Père', 'Mère', 'Tuteur', 'Autre'].map((r) =>
              DropdownMenuItem(value: r, child: Text(r))).toList(),
          onChanged: (v) { if (v != null) onRelation(v); },
        ),
        const SizedBox(height: 16),
        if (erreur != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.red[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red[200]!),
            ),
            child: Text(erreur!, style: const TextStyle(color: Colors.red)),
          ),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: onRetour,
              child: const Text('Retour'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: saving ? null : onSoumettre,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: saving
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Soumettre la demande'),
            ),
          ),
        ]),
      ],
    ),
  );
}

// ── Widgets communs ───────────────────────────────────────────────────────────

class _Champ extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final bool requis;
  final TextInputType type;

  const _Champ({
    required this.ctrl, required this.label,
    this.requis = false, this.type = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextFormField(
      controller: ctrl,
      keyboardType: type,
      decoration: InputDecoration(labelText: requis ? '$label *' : label),
      validator: requis ? (v) => v == null || v.trim().isEmpty ? 'Requis' : null : null,
    ),
  );
}

class _StepDot extends StatelessWidget {
  final int numero;
  final String label;
  final bool actif;

  const _StepDot({required this.numero, required this.label, required this.actif});

  @override
  Widget build(BuildContext context) => Column(
    children: [
      CircleAvatar(
        radius: 16,
        backgroundColor: actif ? Colors.white : Colors.white.withValues(alpha: 0.4),
        child: Text('$numero',
            style: TextStyle(
              color: actif ? AppTheme.primary : Colors.white,
              fontWeight: FontWeight.bold,
            )),
      ),
      const SizedBox(height: 4),
      Text(label, style: TextStyle(
        color: actif ? Colors.white : Colors.white70,
        fontSize: 11,
      )),
    ],
  );
}
