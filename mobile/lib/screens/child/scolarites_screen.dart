import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/eleve.dart';
import '../../models/paiement.dart';
import '../../models/scolarite.dart';
import '../../services/api_service.dart';
import '../../utils/pdf_downloader.dart';
import '../../widgets/loading_error_widget.dart';

class ScolaritesScreen extends StatefulWidget {
  final Eleve eleve;
  const ScolaritesScreen({super.key, required this.eleve});

  @override
  State<ScolaritesScreen> createState() => _ScolaritesScreenState();
}

class _ScolaritesScreenState extends State<ScolaritesScreen> {
  final _api = ApiService();

  // ── Échéances ──
  List<Scolarite> _echeances        = [];
  bool            _loadingEcheances = true;
  String?         _errorEcheances;
  String?         _niveau;
  int?            _paiementEnCours;

  // ── Paiements effectués ──
  List<Paiement> _paiements        = [];
  bool           _loadingPaiements = true;
  String?        _errorPaiements;
  int?           _recuEnCours;

  @override
  void initState() {
    super.initState();
    _loadEcheances();
    _loadPaiements();
  }

  Future<void> _loadEcheances() async {
    setState(() { _loadingEcheances = true; _errorEcheances = null; });
    try {
      final data = await _api.getScolarites(widget.eleve.id);
      final list = data['echeances'] as List<dynamic>;
      setState(() {
        _niveau    = data['niveau'] as String?;
        _echeances = list.map((s) => Scolarite.fromJson(s as Map<String, dynamic>)).toList();
        _loadingEcheances = false;
      });
    } catch (e) {
      setState(() { _errorEcheances = e.toString(); _loadingEcheances = false; });
    }
  }

  Future<void> _loadPaiements() async {
    setState(() { _loadingPaiements = true; _errorPaiements = null; });
    try {
      final data = await _api.getPaiements(widget.eleve.id);
      setState(() {
        _paiements        = data.map((p) => Paiement.fromJson(p as Map<String, dynamic>)).toList();
        _loadingPaiements = false;
      });
    } catch (e) {
      setState(() { _errorPaiements = e.toString(); _loadingPaiements = false; });
    }
  }

  Future<void> _payerEnLigne(Scolarite echeance) async {
    setState(() => _paiementEnCours = echeance.id);
    try {
      final result = await _api.initierPaiement(
        eleveId:     widget.eleve.id,
        scolariteId: echeance.id,
        montant:     echeance.montant,
        returnUrl:   'https://scolaire.local/payment/return',
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
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _VerificationSheet(
        transactionId: transactionId,
        api: _api,
        onTermine: () {
          Navigator.pop(ctx);
          _loadEcheances();
          _loadPaiements();
        },
      ),
    );
  }

  Future<void> _ouvrirRecu(int paiementId) async {
    setState(() => _recuEnCours = paiementId);
    try {
      final bytes = await _api.getPaiementRecuPdf(paiementId);
      await ouvrirPdf(bytes, 'recu_$paiementId.pdf');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Impossible d\'ouvrir le reçu : ${e.toString()}'),
          backgroundColor: Colors.red,
        ));
      }
    } finally {
      if (mounted) setState(() => _recuEnCours = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = _echeances.fold<num>(0, (s, e) => s + e.montant);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(title: const Text('Scolarités')),
        body: Column(
          children: [
            const Material(
              color: Colors.white,
              elevation: 1,
              child: TabBar(
                labelColor: Color(0xFF00897B),
                unselectedLabelColor: Colors.grey,
                indicatorColor: Color(0xFF00897B),
                tabs: [
                  Tab(icon: Icon(Icons.schedule_outlined), text: 'Échéances'),
                  Tab(icon: Icon(Icons.receipt_long_outlined), text: 'Paiements'),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _buildEcheances(total),
                  _buildPaiements(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEcheances(num total) {
    if (_loadingEcheances) return const LoadingWidget();
    if (_errorEcheances != null) {
      return ErrorRetryWidget(message: _errorEcheances!, onRetry: _loadEcheances);
    }
    return Column(
      children: [
        if (_niveau != null)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF00897B).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: const Color(0xFF00897B).withValues(alpha: 0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Niveau : $_niveau',
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 15)),
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
              ? const EmptyWidget(
                  message: 'Aucune échéance trouvée.',
                  icon: Icons.payment_outlined)
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
    );
  }

  Widget _buildPaiements() {
    if (_loadingPaiements) return const LoadingWidget();
    if (_errorPaiements != null) {
      return ErrorRetryWidget(
          message: _errorPaiements!, onRetry: _loadPaiements);
    }
    if (_paiements.isEmpty) {
      return const EmptyWidget(
          message: 'Aucun paiement enregistré.',
          icon: Icons.receipt_long_outlined);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _paiements.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) => _PaiementCard(
        paiement: _paiements[i],
        recuEnCours: _recuEnCours == _paiements[i].id,
        onRecu: () => _ouvrirRecu(_paiements[i].id),
      ),
    );
  }
}

// ── Carte échéance ────────────────────────────────────────────────────────────

class _EcheanceCard extends StatelessWidget {
  final Scolarite  echeance;
  final bool       paiementEnCours;
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
              backgroundColor:
                  (echu ? Colors.orange : Colors.green).withValues(alpha: 0.12),
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
            SizedBox(
              width: 110,
              child: ElevatedButton.icon(
                onPressed: paiementEnCours ? null : onPayer,
                icon: paiementEnCours
                    ? const SizedBox(
                        width: 14, height: 14,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.credit_card, size: 16),
                label: Text(paiementEnCours ? '...' : 'Payer',
                    style: const TextStyle(fontSize: 13)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00897B),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 8),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Carte paiement effectué ───────────────────────────────────────────────────

class _PaiementCard extends StatelessWidget {
  final Paiement   paiement;
  final bool       recuEnCours;
  final VoidCallback onRecu;

  const _PaiementCard({
    required this.paiement,
    required this.recuEnCours,
    required this.onRecu,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: Colors.green.withValues(alpha: 0.12),
              child: const Icon(Icons.check_circle_outline, color: Colors.green),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    paiement.scolariteLibelle ?? 'Paiement',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  Text(
                    paiement.datePaiement,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  Text(
                    '${paiement.montantPaye.toStringAsFixed(0)} FCFA',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: Colors.green),
                  ),
                  Text(
                    paiement.modePaiement,
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                ],
              ),
            ),
            SizedBox(
              width: 90,
              child: OutlinedButton.icon(
                onPressed: recuEnCours ? null : onRecu,
                icon: recuEnCours
                    ? const SizedBox(
                        width: 14, height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.picture_as_pdf_outlined, size: 16),
                label: Text(recuEnCours ? '...' : 'Reçu',
                    style: const TextStyle(fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 8),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Feuille de vérification CinetPay ─────────────────────────────────────────

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
