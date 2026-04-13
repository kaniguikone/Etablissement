import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class SuiviInscriptionScreen extends StatefulWidget {
  final String token;
  const SuiviInscriptionScreen({super.key, required this.token});

  @override
  State<SuiviInscriptionScreen> createState() => _SuiviInscriptionScreenState();
}

class _SuiviInscriptionScreenState extends State<SuiviInscriptionScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _erreur;

  @override
  void initState() {
    super.initState();
    _charger();
  }

  Future<void> _charger() async {
    setState(() { _loading = true; _erreur = null; });
    try {
      final data = await _api.statutInscription(widget.token);
      setState(() { _data = data; _loading = false; });
    } catch (e) {
      setState(() { _erreur = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final statut = _data?['statut'] as String? ?? '';

    return Scaffold(
      backgroundColor: AppTheme.primary,
      appBar: AppBar(
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        title: const Text('Suivi de ma demande'),
        elevation: 0,
      ),
      body: Column(
        children: [
          const SizedBox(height: 16),
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              padding: const EdgeInsets.all(24),
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _erreur != null
                      ? Center(child: Text(_erreur!, style: const TextStyle(color: Colors.red)))
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Token
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.grey[100],
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.key, size: 18, color: Colors.grey),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(widget.token,
                                        style: const TextStyle(
                                            fontFamily: 'monospace', fontSize: 13)),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.copy, size: 18),
                                    onPressed: () {
                                      Clipboard.setData(ClipboardData(text: widget.token));
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Token copié !')),
                                      );
                                    },
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text('Conservez ce token pour suivre votre demande.',
                                style: TextStyle(fontSize: 12, color: Colors.grey)),

                            const SizedBox(height: 32),

                            // Statut
                            Center(child: _StatutWidget(statut: statut)),

                            const SizedBox(height: 24),

                            // Infos
                            if (_data != null) ...[
                              _InfoLigne('Élève',   '${_data!['nom_eleve']} ${_data!['prenoms_eleve']}'),
                              _InfoLigne('Niveau',  _data!['niveau'] ?? '—'),
                              _InfoLigne('Demande soumise le',
                                  (_data!['created_at'] as String?)?.substring(0, 10) ?? '—'),
                              if (statut == 'rejetee' && _data!['motif_rejet'] != null)
                                _InfoLigne('Motif du rejet', _data!['motif_rejet']),
                            ],

                            const Spacer(),

                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: _charger,
                                icon: const Icon(Icons.refresh),
                                label: const Text('Actualiser'),
                              ),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text('Retour à la connexion'),
                              ),
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

class _StatutWidget extends StatelessWidget {
  final String statut;
  const _StatutWidget({required this.statut});

  @override
  Widget build(BuildContext context) {
    final (icone, couleur, titre, sousTitre) = switch (statut) {
      'en_attente' => (Icons.hourglass_top, Colors.orange,
          'En attente de validation',
          'Votre demande est en cours d\'examen par l\'établissement.'),
      'validee'    => (Icons.check_circle, Colors.green,
          'Inscription validée !',
          'Votre enfant a été inscrit. Vous pouvez maintenant vous connecter.'),
      'rejetee'    => (Icons.cancel, Colors.red,
          'Demande rejetée',
          'Votre demande n\'a pas été retenue. Consultez le motif ci-dessous.'),
      _            => (Icons.help_outline, Colors.grey, 'Statut inconnu', ''),
    };

    return Column(
      children: [
        Icon(icone, size: 72, color: couleur),
        const SizedBox(height: 12),
        Text(titre,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: couleur),
            textAlign: TextAlign.center),
        const SizedBox(height: 8),
        Text(sousTitre,
            style: const TextStyle(color: Colors.grey),
            textAlign: TextAlign.center),
      ],
    );
  }
}

class _InfoLigne extends StatelessWidget {
  final String label;
  final String valeur;
  const _InfoLigne(this.label, this.valeur);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 160,
          child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
        ),
        Expanded(
          child: Text(valeur,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ),
      ],
    ),
  );
}
