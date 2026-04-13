class NotificationModel {
  final int id;
  final String ownerType;
  final int ownerId;
  final String type;
  final String titre;
  final String corps;
  final Map<String, dynamic>? data;
  final DateTime? luLe;
  final DateTime createdAt;

  const NotificationModel({
    required this.id,
    required this.ownerType,
    required this.ownerId,
    required this.type,
    required this.titre,
    required this.corps,
    this.data,
    this.luLe,
    required this.createdAt,
  });

  bool get estLu => luLe != null;

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id:        json['id'] as int,
      ownerType: json['owner_type'] as String,
      ownerId:   json['owner_id'] as int,
      type:      json['type'] as String,
      titre:     json['titre'] as String,
      corps:     json['corps'] as String,
      data:      json['data'] != null ? Map<String, dynamic>.from(json['data'] as Map) : null,
      luLe:      json['lu_le'] != null ? DateTime.parse(json['lu_le'] as String) : null,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  NotificationModel copyWith({DateTime? luLe}) {
    return NotificationModel(
      id:        id,
      ownerType: ownerType,
      ownerId:   ownerId,
      type:      type,
      titre:     titre,
      corps:     corps,
      data:      data,
      luLe:      luLe ?? this.luLe,
      createdAt: createdAt,
    );
  }
}
