import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../models/devoir.dart';
import '../../models/classe_matiere.dart';
import '../../models/periode.dart';
class DevoirFormScreen extends StatefulWidget {
  final Devoir? devoir; // null = création
  const DevoirFormScreen({super.key, this.devoir});

  @override
  State<DevoirFormScreen> createState() => _DevoirFormScreenState();
}

class _DevoirFormScreenState extends State<DevoirFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _api = ApiService();

  final _codeCtrl  = TextEditingController();
  final _dateCtrl  = TextEditingController();
  final _coeffCtrl = TextEditingController();

  List<ClasseMatiere> _classes = [];
  List<Periode> _periodes = [];
  List<Map<String, dynamic>> _typeDevoirs = [];

  ClasseMatiere? _classeMatiere;
  Periode? _periode;
  int? _typeDevoirId;

  bool _loading = false;
  bool _loadingData = true;
  String? _error;

  bool get _estModification => widget.devoir != null;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    _dateCtrl.dispose();
    _coeffCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        _api.getClassesEnseignant(),
        _api.getPeriodesEnseignant(),
        _api.getTypeDevoirs(),
      ]);
      setState(() {
        _classes     = results[0].map((e) => ClasseMatiere.fromJson(e)).toList();
        _periodes    = results[1].map((e) => Periode.fromJson(e)).toList();
        _typeDevoirs = results[2].map((e) => e as Map<String, dynamic>).toList();
        _loadingData = false;
      });

      // Pré-remplir si modification
      if (_estModification) {
        final d = widget.devoir!;
        _codeCtrl.text  = d.code;
        _dateCtrl.text  = d.date;
        _coeffCtrl.text = d.coeff.toString();
        _typeDevoirId   = d.typeDevoirId;
        _classeMatiere  = _classes.firstWhere(
          (cm) => cm.classeId == d.classeId && cm.matiereId == d.matiereId,
          orElse: () => _classes.first,
        );
        _periode = _periodes.firstWhere(
          (p) => p.id == d.periodeId,
          orElse: () => _periodes.first,
        );
        // En modification on conserve le code existant
      }
    } catch (e) {
      setState(() { _error = e.toString(); _loadingData = false; });
    }
  }

  Future<void> _generateCode() async {
    if (_classeMatiere == null || _typeDevoirId == null) return;

    final type = _typeDevoirs.firstWhere(
      (t) => t['id'] == _typeDevoirId,
      orElse: () => <String, dynamic>{},
    );
    final typeCode = (type['code_type_devoir'] as String? ?? '').toUpperCase();
    final abbr  = _classeMatiere!.abbrMatiere.toUpperCase();
    final cible = _classeMatiere!.abbrClasse.toUpperCase();
    final per   = _periode?.code?.toUpperCase() ?? '';

    final parts = [typeCode, abbr, cible];
    if (per.isNotEmpty) parts.add(per);
    final base = parts.join('-');

    try {
      final code = await _api.getProchainCode(base);
      if (mounted) setState(() => _codeCtrl.text = code);
    } catch (_) {
      if (mounted) setState(() => _codeCtrl.text = base);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_classeMatiere == null) {
      setState(() => _error = 'Sélectionnez une classe et matière.');
      return;
    }
    setState(() { _loading = true; _error = null; });

    final data = {
      'code_devoir':    _codeCtrl.text.trim(),
      'date_devoir':    _dateCtrl.text.trim(),
      'coeff_devoir':   double.tryParse(_coeffCtrl.text) ?? 1,
      'type_devoir_id': _typeDevoirId,
      'matiere_id':     _classeMatiere!.matiereId,
      'classe_id':      _classeMatiere!.classeId,
      'periode_id':     _periode?.id,
    };

    try {
      if (_estModification) {
        await _api.modifierDevoir(widget.devoir!.id, data);
      } else {
        await _api.creerDevoir(data);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_estModification ? 'Modifier le devoir' : 'Nouveau devoir'),
      ),
      body: _loadingData
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red[200]!),
                      ),
                      child: Text(_error!, style: const TextStyle(color: Colors.red)),
                    ),

                  // Type de devoir
                  DropdownButtonFormField<int>(
                    initialValue: _typeDevoirId,
                    decoration: const InputDecoration(
                      labelText: 'Type de devoir',
                      prefixIcon: Icon(Icons.category),
                    ),
                    items: _typeDevoirs.map((t) => DropdownMenuItem<int>(
                      value: t['id'] as int,
                      child: Text(
                        '${t['code_type_devoir'] ?? ''}'
                        '${t['description_type_devoir'] != null ? ' – ${t['description_type_devoir']}' : ''}',
                        style: const TextStyle(fontSize: 14),
                      ),
                    )).toList(),
                    onChanged: (v) {
                      setState(() => _typeDevoirId = v);
                      _generateCode();
                    },
                    validator: (v) => v == null ? 'Requis' : null,
                  ),
                  const SizedBox(height: 12),

                  // Classe + Matière
                  DropdownButtonFormField<ClasseMatiere>(
                    initialValue: _classeMatiere,
                    decoration: const InputDecoration(
                      labelText: 'Classe · Matière',
                      prefixIcon: Icon(Icons.class_),
                    ),
                    items: _classes.map((cm) => DropdownMenuItem(
                      value: cm,
                      child: Text(cm.label, style: const TextStyle(fontSize: 14)),
                    )).toList(),
                    onChanged: (cm) {
                      setState(() => _classeMatiere = cm);
                      _generateCode();
                    },
                    validator: (v) => v == null ? 'Requis' : null,
                  ),
                  const SizedBox(height: 12),

                  // Période
                  DropdownButtonFormField<Periode>(
                    initialValue: _periode,
                    decoration: const InputDecoration(
                      labelText: 'Période',
                      prefixIcon: Icon(Icons.calendar_view_month),
                    ),
                    items: _periodes.map((p) => DropdownMenuItem(
                      value: p,
                      child: Text(p.label),
                    )).toList(),
                    onChanged: (p) {
                      setState(() => _periode = p);
                      _generateCode();
                    },
                  ),
                  const SizedBox(height: 12),

                  // Code
                  TextFormField(
                    controller: _codeCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Code du devoir',
                      prefixIcon: Icon(Icons.tag),
                      helperText: 'Généré automatiquement, modifiable',
                    ),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
                  ),
                  const SizedBox(height: 12),

                  // Date
                  TextFormField(
                    controller: _dateCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Date',
                      prefixIcon: Icon(Icons.event),
                    ),
                    readOnly: true,
                    onTap: () async {
                      final d = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime(2020),
                        lastDate: DateTime(2030),
                      );
                      if (d != null) {
                        _dateCtrl.text = d.toIso8601String().substring(0, 10);
                      }
                    },
                    validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
                  ),
                  const SizedBox(height: 12),

                  // Coefficient
                  TextFormField(
                    controller: _coeffCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Coefficient',
                      prefixIcon: Icon(Icons.functions),
                    ),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
                  ),
                  const SizedBox(height: 24),

                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      child: _loading
                          ? const SizedBox(width: 22, height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text(_estModification ? 'Enregistrer les modifications' : 'Créer le devoir'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
