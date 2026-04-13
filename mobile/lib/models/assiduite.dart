class Assiduite {
  final int id;
  final String date;
  final String statut;
  final String? matiere;
  final String? remarque;

  const Assiduite({
    required this.id,
    required this.date,
    required this.statut,
    this.matiere,
    this.remarque,
  });

  factory Assiduite.fromJson(Map<String, dynamic> json) => Assiduite(
        id:       int.parse(json['id'].toString()),
        date:     json['date'] as String? ?? '',
        statut:   json['statut'] as String? ?? '',
        matiere:  json['matiere'] as String?,
        remarque: json['remarque'] as String?,
      );

  bool get isAbsent => statut == 'absent';
}
