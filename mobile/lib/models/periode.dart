class Periode {
  final int id;
  final String libelle;
  final String? abbr;
  final String? code;
  final String? annee;

  const Periode({
    required this.id,
    required this.libelle,
    this.abbr,
    this.code,
    this.annee,
  });

  factory Periode.fromJson(Map<String, dynamic> json) => Periode(
        id:      int.parse(json['id'].toString()),
        libelle: json['libelle_periode'] as String? ?? '',
        abbr:    json['abbr_libelle_periode'] as String?,
        code:    json['code_periode'] as String?,
        annee:   json['annee'] as String?,
      );

  String get label => libelle;

  @override
  String toString() => abbr ?? libelle;
}
