import 'package:flutter/material.dart';

class AppTheme {
  static const Color primary   = Color(0xFF1565C0); // Bleu école
  static const Color secondary = Color(0xFF0288D1);
  static const Color accent    = Color(0xFF26A69A);
  static const Color surface   = Color(0xFFF5F7FA);
  static const Color error     = Color(0xFFD32F2F);

  static const Color noteGood  = Color(0xFF2E7D32);
  static const Color noteMid   = Color(0xFFF57F17);
  static const Color noteBad   = Color(0xFFC62828);

  static const Color absent    = Color(0xFFD32F2F);
  static const Color retard    = Color(0xFFF57F17);

  static ThemeData get theme => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          primary: primary,
          secondary: secondary,
          surface: surface,
        ),
        scaffoldBackgroundColor: surface,
        appBarTheme: const AppBarTheme(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: false,
        ),
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          color: Colors.white,
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          filled: true,
          fillColor: Colors.white,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
      );

  static Color noteColor(double note) {
    if (note >= 14) return noteGood;
    if (note >= 10) return noteMid;
    return noteBad;
  }
}
