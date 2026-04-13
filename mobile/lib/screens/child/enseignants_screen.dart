import 'package:flutter/material.dart';
import '../../models/eleve.dart';
import '../../models/enseignant.dart';
import '../../services/api_service.dart';
import '../../widgets/loading_error_widget.dart';

class EnseignantsScreen extends StatefulWidget {
  final Eleve eleve;
  const EnseignantsScreen({super.key, required this.eleve});

  @override
  State<EnseignantsScreen> createState() => _EnseignantsScreenState();
}

class _EnseignantsScreenState extends State<EnseignantsScreen> {
  final _api = ApiService();
  List<Enseignant> _enseignants = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.getEnseignants(widget.eleve.id);
      setState(() {
        _enseignants = data
            .map((e) => Enseignant.fromJson(e as Map<String, dynamic>))
            .toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes Professeurs')),
      body: _loading
          ? const LoadingWidget()
          : _error != null
              ? ErrorRetryWidget(message: _error!, onRetry: _load)
              : _enseignants.isEmpty
                  ? const EmptyWidget(
                      message: 'Aucun enseignant trouvé pour cette classe.',
                      icon: Icons.people_outline,
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _enseignants.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) =>
                          _EnseignantCard(enseignant: _enseignants[i]),
                    ),
    );
  }
}

class _EnseignantCard extends StatelessWidget {
  final Enseignant enseignant;
  const _EnseignantCard({required this.enseignant});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF0277BD).withValues(alpha: 0.12),
          child: Text(
            enseignant.nom.isNotEmpty ? enseignant.nom[0].toUpperCase() : '?',
            style: const TextStyle(
                color: Color(0xFF0277BD), fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(
          enseignant.nomComplet,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: enseignant.matiere != null
            ? Text(enseignant.matiere!)
            : null,
        trailing: enseignant.abbrMatiere != null
            ? Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF0277BD).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  enseignant.abbrMatiere!,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0277BD),
                      fontSize: 12),
                ),
              )
            : null,
      ),
    );
  }
}
