class FraisAnnexeRecap {
  final int    fraisId;
  final String nom;
  final String categorie;
  final num    montantDu;
  final bool   obligatoire;
  final num    montantPaye;
  final num    solde;
  final String statut;

  const FraisAnnexeRecap({
    required this.fraisId,
    required this.nom,
    required this.categorie,
    required this.montantDu,
    required this.obligatoire,
    required this.montantPaye,
    required this.solde,
    required this.statut,
  });

  factory FraisAnnexeRecap.fromJson(Map<String, dynamic> json) => FraisAnnexeRecap(
        fraisId:     int.parse(json['frais_id'].toString()),
        nom:         json['nom'] as String? ?? '',
        categorie:   json['categorie'] as String? ?? 'autre',
        montantDu:   num.parse(json['montant_du'].toString()),
        obligatoire: json['obligatoire'] as bool? ?? true,
        montantPaye: num.parse(json['montant_paye'].toString()),
        solde:       num.parse(json['solde'].toString()),
        statut:      json['statut'] as String? ?? 'impayé',
      );
}

class PaiementFraisAnnexe {
  final int    id;
  final num    montantPaye;
  final String datePaiement;
  final String modePaiement;
  final String? reference;
  final String? fraisNom;

  const PaiementFraisAnnexe({
    required this.id,
    required this.montantPaye,
    required this.datePaiement,
    required this.modePaiement,
    this.reference,
    this.fraisNom,
  });

  factory PaiementFraisAnnexe.fromJson(Map<String, dynamic> json) => PaiementFraisAnnexe(
        id:           int.parse(json['id'].toString()),
        montantPaye:  num.parse(json['montant_paye'].toString()),
        datePaiement: json['date_paiement'] as String? ?? '',
        modePaiement: json['mode_paiement'] as String? ?? 'especes',
        reference:    json['reference_paiement'] as String?,
        fraisNom:     (json['frais_annexe'] as Map<String, dynamic>?)?['nom'] as String?,
      );
}
