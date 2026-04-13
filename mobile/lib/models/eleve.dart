import '../config/api_config.dart';

class Eleve {
  final int id;
  final String matricule;
  final String nom;
  final String prenoms;
  final String? dateNaissance;
  final int? classeId;
  final String? classe;
  final String? niveau;
  final String? photoUrl;

  const Eleve({
    required this.id,
    required this.matricule,
    required this.nom,
    required this.prenoms,
    this.dateNaissance,
    this.classeId,
    this.classe,
    this.niveau,
    this.photoUrl,
  });

  factory Eleve.fromJson(Map<String, dynamic> json) => Eleve(
        id:             int.parse(json['id'].toString()),
        matricule:      json['matricule'] as String? ?? '',
        nom:            json['nom'] as String? ?? '',
        prenoms:        json['prenoms'] as String? ?? '',
        dateNaissance:  json['date_naissance'] as String?,
        classeId:       json['classe_id'] != null ? int.parse(json['classe_id'].toString()) : null,
        classe:         json['classe'] as String?,
        niveau:         json['niveau'] as String?,
        photoUrl:       json['photo_url'] != null
            ? ApiConfig.storageBaseUrl + (json['photo_url'] as String)
            : null,
      );

  String get nomComplet => '$nom $prenoms';
}
