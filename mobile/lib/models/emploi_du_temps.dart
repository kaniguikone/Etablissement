class Creneau {
  final int id;
  final String jour;
  final String heureDebut;
  final String heureFin;
  final String? matiere;
  final String? matiereAbbr;
  final String? enseignant;
  final String? classe;

  const Creneau({
    required this.id,
    required this.jour,
    required this.heureDebut,
    required this.heureFin,
    this.matiere,
    this.matiereAbbr,
    this.enseignant,
    this.classe,
  });

  factory Creneau.fromJson(Map<String, dynamic> json) => Creneau(
        id:          int.parse(json['id'].toString()),
        jour:        json['jour'] as String? ?? '',
        heureDebut:  (json['heure_debut'] as String? ?? '').substring(0, 5),
        heureFin:    (json['heure_fin']   as String? ?? '').substring(0, 5),
        matiere:     json['matiere']?['libelle_matiere'] as String?,
        matiereAbbr: json['matiere']?['abbr_matiere']   as String?,
        enseignant:  json['enseignant'] != null
            ? '${json['enseignant']['nom_enseignant']} ${json['enseignant']['prenoms_enseignant']}'
            : null,
        classe:      json['classe']?['nom_classe'] as String?,
      );
}
