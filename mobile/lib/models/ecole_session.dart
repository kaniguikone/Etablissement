class EcoleSession {
  final String tenantId;
  final String nom;
  final String domain;
  final String token;
  final List<Map<String, dynamic>> enfants;   // parent sessions
  final int? enseignantId;                     // teacher sessions

  const EcoleSession({
    required this.tenantId,
    required this.nom,
    required this.domain,
    required this.token,
    this.enfants = const [],
    this.enseignantId,
  });

  factory EcoleSession.fromJson(Map<String, dynamic> j) => EcoleSession(
    tenantId:    j['tenant_id'] as String,
    nom:         j['nom']       as String,
    domain:      j['domain']    as String,
    token:       j['token']     as String,
    enfants:     j.containsKey('enfants') && j['enfants'] != null
                   ? List<Map<String, dynamic>>.from(j['enfants'] as List)
                   : [],
    enseignantId: j['enseignant_id'] as int?,
  );

  Map<String, dynamic> toJson() => {
    'tenant_id':    tenantId,
    'nom':          nom,
    'domain':       domain,
    'token':        token,
    'enfants':      enfants,
    if (enseignantId != null) 'enseignant_id': enseignantId,
  };
}
