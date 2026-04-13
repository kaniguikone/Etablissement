class Enseignant {
  final int id;
  final String? matricule;
  final String nom;
  final String? prenoms;
  final String? matiere;
  final String? abbrMatiere;

  const Enseignant({
    required this.id,
    this.matricule,
    required this.nom,
    this.prenoms,
    this.matiere,
    this.abbrMatiere,
  });

  factory Enseignant.fromJson(Map<String, dynamic> json) => Enseignant(
        id:          json['id'] as int,
        matricule:   json['matricule_enseignant'] as String?,
        nom:         json['nom_enseignant'] as String? ?? '',
        prenoms:     json['prenoms_enseignant'] as String?,
        matiere:     json['libelle_matiere'] as String?,
        abbrMatiere: json['abbr_matiere'] as String?,
      );

  String get nomComplet => prenoms != null ? '$nom $prenoms' : nom;
}
