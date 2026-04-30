class Paiement {
  final int    id;
  final num    montantPaye;
  final String datePaiement;
  final String modePaiement;
  final String? reference;
  final String? scolariteLibelle;

  const Paiement({
    required this.id,
    required this.montantPaye,
    required this.datePaiement,
    required this.modePaiement,
    this.reference,
    this.scolariteLibelle,
  });

  factory Paiement.fromJson(Map<String, dynamic> json) => Paiement(
        id:               int.parse(json['id'].toString()),
        montantPaye:      num.parse(json['montant_paye'].toString()),
        datePaiement:     json['date_paiement'] as String? ?? '',
        modePaiement:     json['mode_paiement'] as String? ?? 'Espèces',
        reference:        json['reference_paiement'] as String?,
        scolariteLibelle: (json['scolarite'] as Map<String, dynamic>?)?['libelle_echeance'] as String?,
      );
}
