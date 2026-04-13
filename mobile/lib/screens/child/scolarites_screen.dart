import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/eleve.dart';
import '../../models/scolarite.dart';
import '../../services/api_service.dart';
import '../../widgets/loading_error_widget.dart';

class ScolaritesScreen extends StatefulWidget {
  final Eleve eleve;
  const ScolaritesScreen({super.key, required this.eleve});

  @override
  State<ScolaritesScreen> createState() => _ScolaritesScreenState();
}

class _ScolaritesScreenState extends State<ScolaritesScreen> {
  final _api = ApiService();
  List<Scolarite> _echeances = [];
  String? _niveau;
  bool _loading = true;
  String? _error;
  int? _paiementEnCours; // scolarite_id en cours de paiement

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.getScolarites(widget.eleve.id);
      final list = data['echeances'] as List<dynamic>;
      setState(() {
        _niveau    = data['niveau'] as String?;
        _echeances = list
            .map((s) => Scolarite.fromJson(s as Map<String, dynamic>))
            .toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _payerEnLigne(Scolarite echeance) async {
    setState(() => _paiementEnCours = echeance.id);
    try {
      final result = await _api.initierPaiement(
        eleveId:      widget.eleve.id,
        scolariteId:  echeance.id,
        montant:      echeance.montant,
        returnUrl:    'https://scolaire.local/payment/return',
      );

      final paymentUrl    = result['payment_url'] as String;
      final transactionId = result['transaction_id'] as String;

      await launchUrl(Uri.parse(paymentUrl), mode: LaunchMode.externalApplication);

      if (mounted) _afficherVerification(transactionId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Erreur : ${e.toString()}'),
          backgroundColor: Colors.red,
        ));
      }
    } finally {
      if (mounted) setState(() => _paiementEnCours = null);
    }
  }

  void _afficherVerification(String transactionId) {
    showModalBottomSheet(
      context: context,
      isDismissible: false,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _VerificationSheet(
        transactionId: transactionId,
        api: _api,
        onTermine: () {
          Navigator.pop(ctx);
          _load();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final total = _echeances.fold<num>(0, (s, e) => s + e.montant);

    return Scaffold(
      appBar: AppBar(title: const Text('Scolarités')),
      body: _loading
          ? const LoadingWidget()
          : _error != null
              ? ErrorRetryWidget(message: _error!, onRetry: _load)
              : Column(
                  children: [
                    if (_niveau != null)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.all(16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00897B).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF00897B).withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Niveau : $_niveau',
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                            const SizedBox(height: 4),
                            Text(
                              'Total annuel : ${total.toStringAsFixed(0)} FCFA',
                              style: const TextStyle(
                                  color: Color(0xFF00897B),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16),
                            ),
                          ],
                        ),
                      ),

                    Expanded(
                      child: _echeances.isEmpty
                          ? const EmptyWidget(message: 'Aucune échéance trouvée.', icon: Icons.payment_outlined)
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                              itemCount: _echeances.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 8),
                              itemBuilder: (_, i) => _EcheanceCard(
                                echeance: _echeances[i],
                                paiementEnCours: _paiementEnCours == _echeances[i].id,
                                onPayer: () => _payerEnLigne(_echeances[i]),
                              ),
                            ),
                    ),
                  ],
                ),
    );
  }
}

// ── Carte échéance ────────────────────────────────────────────────────────────

class _EcheanceCard extends StatelessWidget {
  final Scolarite echeance;
  final bool paiementEnCours;
  final VoidCallback onPayer;

  const _EcheanceCard({
    required this.echeance,
    required this.paiementEnCours,
    required this.onPayer,
  });

  bool get _estEchu {
    try {
      return DateTime.parse(echeance.dateEcheance).isBefore(DateTime.now());
    } catch (_) { return false; }
  }

  @override
  Widget build(BuildContext context) {
    final echu = _estEchu;

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: (echu ? Colors.orange : Colors.green).withValues(alpha: 0.12),
              child: Icon(
                echu ? Icons.warning_amber_outlined : Icons.check_circle_outline,
                color: echu ? Colors.orange : Colors.green,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(echeance.libelle,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text('Échéance : ${echeance.dateEcheance}',
                      style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  Text(
                    '${echeance.montant.toStringAsFixed(0)} FCFA',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: Color(0xFF00897B)),
                  ),
                ],
              ),
            ),
            // Bouton payer
            SizedBox(
              width: 110,
              child: ElevatedButton.icon(
                onPressed: paiementEnCours ? null : onPayer,
                icon: paiementEnCours
                    ? const SizedBox(width: 14, height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.credit_card, size: 16),
                label: Text(paiementEnCours ? '...' : 'Payer',
                    style: const TextStyle(fontSize: 13)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00897B),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Feuille de vérification ───────────────────────────────────────────────────

class _VerificationSheet extends StatefulWidget {
  final String transactionId;
  final ApiService api;
  final VoidCallback onTermine;

  const _VerificationSheet({
    required this.transactionId,
    required this.api,
    required this.onTermine,
  });

  @override
  State<_VerificationSheet> createState() => _VerificationSheetState();
}

class _VerificationSheetState extends State<_VerificationSheet> {
  String _statut = 'pending'; // pending | paid | failed
  bool _checking = false;

  Future<void> _verifier() async {
    setState(() => _checking = true);
    try {
      final data = await widget.api.statutPaiement(widget.transactionId);
      setState(() => _statut = data['statut_cinetpay'] as String? ?? 'pending');
    } catch (_) {
      // Laisser en pending
    } finally {
      setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 24, 24,
          24 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(width: 40, height: 4,
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 20),

          if (_statut == 'pending') ...[
            const Icon(Icons.payment, size: 56, color: Color(0xFF00897B)),
            const SizedBox(height: 12),
            const Text('Paiement en cours',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text(
              'Complétez le paiement dans le navigateur, puis revenez ici et appuyez sur "Vérifier".',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _checking ? null : _verifier,
                icon: _checking
                    ? const SizedBox(width: 18, height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.refresh),
                label: const Text('Vérifier le paiement'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00897B),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: widget.onTermine,
              child: const Text('Annuler', style: TextStyle(color: Colors.grey)),
            ),
          ],

          if (_statut == 'paid') ...[
            const Icon(Icons.check_circle, size: 64, color: Colors.green),
            const SizedBox(height: 12),
            const Text('Paiement accepté !',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green)),
            const SizedBox(height: 8),
            Text('Référence : ${widget.transactionId}',
                style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: widget.onTermine,
                child: const Text('Fermer'),
              ),
            ),
          ],

          if (_statut == 'failed') ...[
            const Icon(Icons.cancel, size: 64, color: Colors.red),
            const SizedBox(height: 12),
            const Text('Paiement échoué',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.red)),
            const SizedBox(height: 8),
            const Text('Le paiement a été refusé ou annulé.',
                style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: widget.onTermine,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                child: const Text('Fermer', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
