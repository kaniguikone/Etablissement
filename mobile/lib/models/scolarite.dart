class Scolarite {
  final int id;
  final String libelle;
  final String dateEcheance;
  final num montant;
  final int? niveauId;

  const Scolarite({
    required this.id,
    required this.libelle,
    required this.dateEcheance,
    required this.montant,
    this.niveauId,
  });

  factory Scolarite.fromJson(Map<String, dynamic> json) => Scolarite(
        id:           int.parse(json['id'].toString()),
        libelle:      json['libelle_echeance'] as String? ?? '',
        dateEcheance: json['date_echeance'] as String? ?? '',
        montant:      num.parse(json['montant_echeance'].toString()),
        niveauId:     json['niveau_id'] != null ? int.parse(json['niveau_id'].toString()) : null,
      );
}
