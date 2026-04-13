class Information {
  final int id;
  final String date;
  final String titre;
  final String contenu;

  const Information({
    required this.id,
    required this.date,
    required this.titre,
    required this.contenu,
  });

  factory Information.fromJson(Map<String, dynamic> json) => Information(
        id:      json['id'] as int,
        date:    json['date_info'] as String? ?? '',
        titre:   json['titre'] as String? ?? '',
        contenu: json['contenu'] as String? ?? '',
      );
}
