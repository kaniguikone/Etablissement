import 'package:dio/dio.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../config/api_config.dart';

class UpdateInfo {
  final bool forceUpdate;
  final String versionName;
  final String downloadUrl;

  const UpdateInfo({
    required this.forceUpdate,
    required this.versionName,
    required this.downloadUrl,
  });
}

class UpdateService {
  /// Retourne un [UpdateInfo] si une version plus récente est disponible,
  /// null sinon (ou en cas d'erreur réseau — on ne bloque pas l'utilisateur).
  static Future<UpdateInfo?> checkForUpdate() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final localCode = int.tryParse(info.buildNumber) ?? 0;

      final dio = Dio(BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: ApiConfig.connectTimeout,
        receiveTimeout: ApiConfig.receiveTimeout,
        headers: {'Accept': 'application/json'},
      ));
      final vh = ApiConfig.virtualHost;
      if (vh != null) dio.options.headers['Host'] = vh;

      final response = await dio.get(ApiConfig.mobileVersion);
      final data = response.data as Map<String, dynamic>;

      final remoteCode = (data['version_code'] as num).toInt();
      if (remoteCode <= localCode) return null;

      return UpdateInfo(
        forceUpdate: data['force_update'] as bool? ?? false,
        versionName: data['version_name'] as String? ?? '',
        downloadUrl: data['download_url'] as String? ?? '',
      );
    } catch (_) {
      return null;
    }
  }
}
