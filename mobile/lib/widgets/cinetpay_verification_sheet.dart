import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Feuille de vérification manuelle d'un paiement CinetPay : l'utilisateur
/// complète le paiement dans le navigateur externe puis revient taper
/// "Vérifier" (pas de retour automatique dans l'app — voir return_url).
void afficherVerificationCinetPay(
  BuildContext context, {
  required String transactionId,
  required ApiService api,
  required VoidCallback onTermine,
}) {
  showModalBottomSheet(
    context: context,
    isDismissible: false,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (ctx) => _VerificationSheet(
      transactionId: transactionId,
      api: api,
      onTermine: onTermine,
    ),
  );
}

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
  String _statut   = 'pending';
  bool   _checking = false;

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
      padding: EdgeInsets.fromLTRB(
          24, 24, 24, 24 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40, height: 4,
            decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2)),
          ),
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
                    ? const SizedBox(
                        width: 18, height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.refresh),
                label: const Text('Vérifier le paiement'),
                style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00897B),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14)),
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
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.green)),
            const SizedBox(height: 8),
            Text('Référence : ${widget.transactionId}',
                style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                  onPressed: widget.onTermine,
                  child: const Text('Fermer')),
            ),
          ],

          if (_statut == 'failed') ...[
            const Icon(Icons.cancel, size: 64, color: Colors.red),
            const SizedBox(height: 12),
            const Text('Paiement échoué',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.red)),
            const SizedBox(height: 8),
            const Text('Le paiement a été refusé ou annulé.',
                style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: widget.onTermine,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                child:
                    const Text('Fermer', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
