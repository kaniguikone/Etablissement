import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../widgets/loading_error_widget.dart';
import '../../theme/app_theme.dart';

class FilMessagesScreen extends StatefulWidget {
  final String prefix;
  final String autreNom;
  final String autreType;
  final int autreId;
  final int? eleveId;
  final String? eleveNom;

  const FilMessagesScreen({
    super.key,
    required this.prefix,
    required this.autreNom,
    required this.autreType,
    required this.autreId,
    this.eleveId,
    this.eleveNom,
  });

  @override
  State<FilMessagesScreen> createState() => _FilMessagesScreenState();
}

class _FilMessagesScreenState extends State<FilMessagesScreen> {
  final _api = ApiService();
  final _ctrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.getMessagesFil(
        widget.eleveId ?? 0,
        widget.autreId,
        widget.autreType,
        prefix: widget.prefix,
      );
      setState(() {
        _messages = data.cast<Map<String, dynamic>>();
        _loading = false;
      });
      _scrollToBottom();
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _envoyer() async {
    final texte = _ctrl.text.trim();
    if (texte.isEmpty) return;
    setState(() => _sending = true);
    try {
      await _api.envoyerMessage({
        'destinataire_type': widget.autreType,
        'destinataire_id':   widget.autreId,
        if (widget.eleveId != null) 'eleve_id': widget.eleveId,
        'contenu': texte,
      }, prefix: widget.prefix);
      _ctrl.clear();
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : ${e.toString()}'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String _formatHeure(String? str) {
    if (str == null) return '';
    try {
      final d = DateTime.parse(str).toLocal();
      return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) { return ''; }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.autreNom),
            if (widget.eleveNom != null)
              Text(widget.eleveNom!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400)),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const LoadingWidget(message: 'Chargement...')
                : _error != null
                    ? ErrorRetryWidget(message: _error!, onRetry: _load)
                    : _messages.isEmpty
                        ? const Center(
                            child: Text('Démarrez la conversation…',
                                style: TextStyle(color: Colors.grey)),
                          )
                        : ListView.builder(
                            controller: _scrollCtrl,
                            padding: const EdgeInsets.all(12),
                            itemCount: _messages.length,
                            itemBuilder: (_, i) {
                              final m = _messages[i];
                              final estMoi = m['expediteur_type'] == widget.prefix;
                              return Align(
                                alignment: estMoi ? Alignment.centerRight : Alignment.centerLeft,
                                child: Container(
                                  constraints: BoxConstraints(
                                    maxWidth: MediaQuery.of(context).size.width * 0.72,
                                  ),
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: estMoi ? AppTheme.primary : Colors.grey[200],
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        m['contenu'] as String? ?? '',
                                        style: TextStyle(
                                          color: estMoi ? Colors.white : Colors.black87,
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            _formatHeure(m['created_at'] as String?),
                                            style: TextStyle(
                                              fontSize: 10,
                                              color: estMoi ? Colors.white70 : Colors.grey,
                                            ),
                                          ),
                                          if (estMoi && m['lu_at'] != null) ...[
                                            const SizedBox(width: 4),
                                            const Icon(Icons.done_all, size: 12, color: Colors.white70),
                                          ],
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
          ),

          // Zone de saisie
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey[200]!)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    maxLines: null,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: 'Écrire un message…',
                      filled: true,
                      fillColor: Colors.grey[100],
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onSubmitted: (_) => _envoyer(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppTheme.primary,
                  child: _sending
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : IconButton(
                          icon: const Icon(Icons.send, color: Colors.white, size: 18),
                          onPressed: _envoyer,
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
