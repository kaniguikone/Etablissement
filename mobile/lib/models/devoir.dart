class Devoir {
  final int id;
  final String code;
  final String date;
  final double coeff;
  final int? typeDevoirId;
  final String? typeCode;
  final int? matiereId;
  final String? matiere;
  final String? matiereAbbr;
  final int? classeId;
  final String? classe;
  final String? classeAbbr;
  final int? niveauId;
  final String? niveau;
  final int? periodeId;
  final String? periode;

  const Devoir({
    required this.id,
    required this.code,
    required this.date,
    required this.coeff,
    this.typeDevoirId,
    this.typeCode,
    this.matiereId,
    this.matiere,
    this.matiereAbbr,
    this.classeId,
    this.classe,
    this.classeAbbr,
    this.niveauId,
    this.niveau,
    this.periodeId,
    this.periode,
  });

  factory Devoir.fromJson(Map<String, dynamic> json) => Devoir(
        id:          int.parse(json['id'].toString()),
        code:        json['code_devoir'] as String? ?? '',
        date:        json['date_devoir'] as String? ?? '',
        coeff:       double.tryParse(json['coeff_devoir'].toString()) ?? 1,
        typeDevoirId: json['type_devoir_id'] != null
            ? int.tryParse(json['type_devoir_id'].toString())
            : null,
        typeCode:    json['type_devoir']?['code_type_devoir'] as String?,
        matiereId:   json['matiere_id'] != null
            ? int.tryParse(json['matiere_id'].toString())
            : null,
        matiere:     json['matiere']?['libelle_matiere'] as String?,
        matiereAbbr: json['matiere']?['abbr_matiere'] as String?,
        classeId:    json['classe_id'] != null
            ? int.tryParse(json['classe_id'].toString())
            : null,
        classe:      json['classe']?['nom_classe'] as String?,
        classeAbbr:  json['classe']?['abbr_classe'] as String?,
        niveauId:    json['niveau_id'] != null
            ? int.tryParse(json['niveau_id'].toString())
            : null,
        niveau:      json['niveau']?['libelle_niveau'] as String?,
        periodeId:   json['periode_id'] != null
            ? int.tryParse(json['periode_id'].toString())
            : null,
        periode:     json['periode']?['libelle_periode'] as String?,
      );

  String get cible => classeAbbr ?? niveau ?? '—';
  bool get estNiveau => niveauId != null && classeId == null;
}
