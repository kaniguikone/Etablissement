import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/api_config.dart';
import '../../models/eleve.dart';
import '../../models/frais_annexe.dart';
import '../../services/api_service.dart';
import '../../utils/pdf_downloader.dart';
import '../../widgets/cinetpay_verification_sheet.dart';
import '../../widgets/loading_error_widget.dart';

class FraisAnnexesScreen extends StatelessWidget {
  final Eleve eleve;
  const FraisAnnexesScreen({super.key, required this.eleve});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Frais annexes')),
        body: FraisAnnexesBody(eleve: eleve),
      );
}

/// Contenu de l'écran Frais annexes, sans Scaffold/AppBar propre —
/// réutilisable tel quel (voir [FraisAnnexesScreen]) ou intégré dans un
/// onglet plus large (voir ScolaritesFraisScreen).
class FraisAnnexesBody extends StatefulWidget {
  final Eleve eleve;
  const FraisAnnexesBody({super.key, required this.eleve});

  @override
  State<FraisAnnexesBody> createState() => _FraisAnnexesBodyState();
}

class _FraisAnnexesBodyState extends State<FraisAnnexesBody> {
  final _api = ApiService();

  List<FraisAnnexeRecap>       _recap     = [];
  List<PaiementFraisAnnexe>    _paiements = [];
  bool    _loading = true;
  String? _error;
  int?    _paiementEnCours;
  int?    _recuEnCours;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.getFraisAnnexes(widget.eleve.id);
      final recapList     = data['recap'] as List<dynamic>;
      final paiementsList = data['paiements'] as List<dynamic>;
      setState(() {
        _recap     = recapList.map((r) => FraisAnnexeRecap.fromJson(r as Map<String, dynamic>)).toList();
        _paiements = paiementsList.map((p) => PaiementFraisAnnexe.fromJson(p as Map<String, dynamic>)).toList();
        _loading   = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _payerEnLigne(FraisAnnexeRecap frais) async {
    setState(() => _paiementEnCours = frais.fraisId);
    try {
      final result = await _api.initierPaiementFrais(
        eleveId:       widget.eleve.id,
        fraisAnnexeId: frais.fraisId,
        montant:       frais.solde,
        returnUrl:     '${ApiConfig.storageBaseUrl}/PaiementRetour',
      );
      final paymentUrl    = result['payment_url'] as String;
      final transactionId = result['transaction_id'] as String;
      await launchUrl(Uri.parse(paymentUrl), mode: LaunchMode.externalApplication);
      if (mounted) {
        afficherVerificationCinetPay(
          context,
          transactionId: transactionId,
          api: _api,
          onTermine: () {
            Navigator.pop(context);
            _load();
          },
        );
      }
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

  Future<void> _ouvrirRecu(int paiementId) async {
    setState(() => _recuEnCours = paiementId);
    try {
      final bytes = await _api.getFraisAnnexeRecuPdf(paiementId);
      await ouvrirPdf(bytes, 'recu_frais_$paiementId.pdf');
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
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          const Material(
            color: Colors.white,
            elevation: 1,
            child: TabBar(
              labelColor: Color(0xFF6D4C41),
              unselectedLabelColor: Colors.grey,
              indicatorColor: Color(0xFF6D4C41),
              tabs: [
                Tab(icon: Icon(Icons.checklist_outlined), text: 'Frais'),
                Tab(icon: Icon(Icons.receipt_long_outlined), text: 'Paiements'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [_buildRecap(), _buildPaiements()],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecap() {
    if (_loading) return const LoadingWidget();
    if (_error != null) return ErrorRetryWidget(message: _error!, onRetry: _load);
    if (_recap.isEmpty) {
      return const EmptyWidget(message: 'Aucun frais annexe.', icon: Icons.checklist_outlined);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _recap.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) => _FraisCard(
        frais: _recap[i],
        paiementEnCours: _paiementEnCours == _recap[i].fraisId,
        onPayer: () => _payerEnLigne(_recap[i]),
      ),
    );
  }

  Widget _buildPaiements() {
    if (_loading) return const LoadingWidget();
    if (_error != null) return ErrorRetryWidget(message: _error!, onRetry: _load);
    if (_paiements.isEmpty) {
      return const EmptyWidget(message: 'Aucun paiement enregistré.', icon: Icons.receipt_long_outlined);
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

class _FraisCard extends StatelessWidget {
  final FraisAnnexeRecap frais;
  final bool paiementEnCours;
  final VoidCallback onPayer;

  const _FraisCard({required this.frais, required this.paiementEnCours, required this.onPayer});

  static const _statutColor = {
    'soldé':   Colors.green,
    'partiel': Colors.orange,
    'impayé':  Colors.red,
  };

  @override
  Widget build(BuildContext context) {
    final couleur   = _statutColor[frais.statut] ?? Colors.grey;
    final estSolde  = frais.statut == 'soldé';

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: couleur.withValues(alpha: 0.12),
              child: Icon(
                estSolde ? Icons.check_circle_outline : Icons.pending_outlined,
                color: couleur,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Expanded(child: Text(frais.nom, style: const TextStyle(fontWeight: FontWeight.w600))),
                    if (frais.obligatoire)
                      const Padding(
                        padding: EdgeInsets.only(left: 4),
                        child: Text('obligatoire', style: TextStyle(fontSize: 10, color: Colors.red)),
                      ),
                  ]),
                  Text(
                    estSolde
                        ? '${frais.montantDu.toStringAsFixed(0)} FCFA payé'
                        : 'Solde : ${frais.solde.toStringAsFixed(0)} FCFA',
                    style: TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15, color: couleur),
                  ),
                ],
              ),
            ),
            if (!estSolde)
              SizedBox(
                width: 110,
                child: ElevatedButton.icon(
                  onPressed: paiementEnCours ? null : onPayer,
                  icon: paiementEnCours
                      ? const SizedBox(
                          width: 14, height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.credit_card, size: 16),
                  label: Text(paiementEnCours ? '...' : 'Payer', style: const TextStyle(fontSize: 13)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6D4C41),
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

class _PaiementCard extends StatelessWidget {
  final PaiementFraisAnnexe paiement;
  final bool recuEnCours;
  final VoidCallback onRecu;

  const _PaiementCard({required this.paiement, required this.recuEnCours, required this.onRecu});

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
                  Text(paiement.fraisNom ?? 'Paiement', style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(paiement.datePaiement, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  Text(
                    '${paiement.montantPaye.toStringAsFixed(0)} FCFA',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.green),
                  ),
                ],
              ),
            ),
            SizedBox(
              width: 90,
              child: OutlinedButton.icon(
                onPressed: recuEnCours ? null : onRecu,
                icon: recuEnCours
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.picture_as_pdf_outlined, size: 16),
                label: Text(recuEnCours ? '...' : 'Reçu', style: const TextStyle(fontSize: 13)),
                style: OutlinedButton.styleFrom(
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
