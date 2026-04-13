class EtablissementInfo {
  final String nom;
  final String? slogan;
  final String? logoUrl;
  final String? telephone;
  final String? email;
  final String? adresse;
  final String? ville;

  const EtablissementInfo({
    required this.nom,
    this.slogan,
    this.logoUrl,
    this.telephone,
    this.email,
    this.adresse,
    this.ville,
  });

  factory EtablissementInfo.fromJson(Map<String, dynamic> json) {
    return EtablissementInfo(
      nom:       json['nom'] as String? ?? 'Mon Établissement',
      slogan:    json['slogan'] as String?,
      logoUrl:   json['logo_url'] as String?,
      telephone: json['telephone'] as String?,
      email:     json['email'] as String?,
      adresse:   json['adresse'] as String?,
      ville:     json['ville'] as String?,
    );
  }
}
