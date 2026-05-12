class ClasseMatiere {
  final int classeId;
  final String nomClasse;
  final String abbrClasse;
  final int matiereId;
  final String libelleMatiere;
  final String abbrMatiere;
  final int? niveauId;
  final String? niveau;

  const ClasseMatiere({
    required this.classeId,
    required this.nomClasse,
    required this.abbrClasse,
    required this.matiereId,
    required this.libelleMatiere,
    required this.abbrMatiere,
    this.niveauId,
    this.niveau,
  });

  factory ClasseMatiere.fromJson(Map<String, dynamic> json) => ClasseMatiere(
        classeId:       int.parse(json['classe_id'].toString()),
        nomClasse:      json['nom_classe'] as String? ?? '',
        abbrClasse:     json['abbr_classe'] as String? ?? '',
        matiereId:      int.parse(json['matiere_id'].toString()),
        libelleMatiere: json['libelle_matiere'] as String? ?? '',
        abbrMatiere:    json['abbr_matiere'] as String? ?? '',
        niveauId:       json['niveau_id'] != null
            ? int.tryParse(json['niveau_id'].toString())
            : null,
        niveau:         json['libelle_niveau'] as String?,
      );

  String get label => '$abbrClasse · $libelleMatiere';

  @override
  bool operator ==(Object other) =>
      other is ClasseMatiere &&
      classeId == other.classeId &&
      matiereId == other.matiereId;

  @override
  int get hashCode => Object.hash(classeId, matiereId);
}
