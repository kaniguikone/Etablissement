class NoteDetail {
  final String? type;
  final String date;
  final double note;
  final int coeff;

  const NoteDetail({
    this.type,
    required this.date,
    required this.note,
    required this.coeff,
  });

  factory NoteDetail.fromJson(Map<String, dynamic> json) => NoteDetail(
        type:  json['type'] as String?,
        date:  json['date'] as String? ?? '',
        note:  double.parse(json['note'].toString()),
        coeff: json['coeff'] != null ? int.parse(json['coeff'].toString()) : 1,
      );
}

class NoteMatiere {
  final int? matiereId;
  final String? matiere;
  final String? abbr;
  final double? moyenne;
  final List<NoteDetail> notes;

  const NoteMatiere({
    this.matiereId,
    this.matiere,
    this.abbr,
    this.moyenne,
    required this.notes,
  });

  factory NoteMatiere.fromJson(Map<String, dynamic> json) => NoteMatiere(
        matiereId: json['matiere_id'] != null ? int.parse(json['matiere_id'].toString()) : null,
        matiere:   json['matiere'] as String?,
        abbr:      json['abbr'] as String?,
        moyenne:   json['moyenne'] != null ? double.parse(json['moyenne'].toString()) : null,
        notes:     (json['notes'] as List<dynamic>)
            .map((n) => NoteDetail.fromJson(n as Map<String, dynamic>))
            .toList(),
      );
}
