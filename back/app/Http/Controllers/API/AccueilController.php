<?php

namespace App\Http\Controllers;

use App\Models\Classe;
use App\Models\Eleve;
use App\Models\Enseignant;
use App\Models\Matiere;
use Illuminate\Http\Request;

class AccueilController extends Controller
{
    public function index()
    {
        $Enseignants = Enseignant::all();
        $Matieres = Matiere::all();
        $Eleves = Eleve::all();
        $Classes = Classe::all();

        return response()->json([$Eleves, $Enseignants, $Classes, $Matieres]);
    }
}
