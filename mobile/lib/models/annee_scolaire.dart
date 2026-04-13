class AnneeScolaire {
  final int id;
  final String libelle;
  final String statut; // en_cours | en_cloture | cloturee
  final String dateDebut;
  final String dateFin;

  const AnneeScolaire({
    required this.id,
    required this.libelle,
    required this.statut,
    required this.dateDebut,
    required this.dateFin,
  });

  bool get estCloturee => statut == 'cloturee';
  bool get estEnCours  => statut == 'en_cours';

  factory AnneeScolaire.fromJson(Map<String, dynamic> json) {
    return AnneeScolaire(
      id:        json['id'] as int,
      libelle:   json['libelle'] as String,
      statut:    json['statut'] as String,
      dateDebut: json['date_debut'] as String,
      dateFin:   json['date_fin'] as String,
    );
  }
}
