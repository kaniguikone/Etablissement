import 'package:flutter/material.dart';
import '../../models/eleve.dart';
import 'scolarites_screen.dart';
import 'frais_annexes_screen.dart';

/// Regroupe Scolarités et Frais annexes sous un seul point d'entrée du
/// tableau de bord élève, chacun gardant ses propres sous-onglets internes
/// (Échéances/Paiements, Frais/Paiements).
class ScolaritesFraisScreen extends StatelessWidget {
  final Eleve eleve;
  const ScolaritesFraisScreen({super.key, required this.eleve});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Scolarités & Frais'),
          bottom: const TabBar(
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            indicatorColor: Colors.white,
            tabs: [
              Tab(icon: Icon(Icons.payment_outlined), text: 'Scolarités'),
              Tab(icon: Icon(Icons.checklist_outlined), text: 'Frais annexes'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            ScolaritesBody(eleve: eleve),
            FraisAnnexesBody(eleve: eleve),
          ],
        ),
      ),
    );
  }
}
