<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\HelpArticle;
use Illuminate\Http\Request;

class HelpArticleController extends Controller
{
    /** GET /help — tous les articles actifs, groupés par module (pour pré-chargement). */
    public function index(Request $request)
    {
        $query = HelpArticle::where('actif', true)->orderBy('ordre')->orderBy('id');

        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(fn ($qb) => $qb->where('titre', 'like', "%{$q}%")->orWhere('contenu', 'like', "%{$q}%"));
        }

        return response()->json($query->get());
    }

    /** GET /help/admin — tous les articles (actifs + inactifs) pour l'interface admin. */
    public function adminIndex(Request $request)
    {
        $query = HelpArticle::orderBy('module')->orderBy('ordre')->orderBy('id');

        if ($request->filled('module'))    $query->where('module', $request->module);
        if ($request->filled('categorie')) $query->where('categorie', $request->categorie);

        return response()->json([
            'articles' => $query->get(),
            'modules'  => HelpArticle::MODULES,
            'categories' => HelpArticle::CATEGORIES,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'titre'     => 'required|string|max:200',
            'contenu'   => 'required|string',
            'module'    => 'required|in:' . implode(',', array_keys(HelpArticle::MODULES)),
            'categorie' => 'required|in:' . implode(',', array_keys(HelpArticle::CATEGORIES)),
            'ordre'     => 'nullable|integer|min:0|max:255',
            'actif'     => 'boolean',
        ]);

        $article = HelpArticle::create($request->only(['titre', 'contenu', 'module', 'categorie', 'ordre', 'actif']));

        return response()->json($article, 201);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'titre'     => 'required|string|max:200',
            'contenu'   => 'required|string',
            'module'    => 'required|in:' . implode(',', array_keys(HelpArticle::MODULES)),
            'categorie' => 'required|in:' . implode(',', array_keys(HelpArticle::CATEGORIES)),
            'ordre'     => 'nullable|integer|min:0|max:255',
            'actif'     => 'boolean',
        ]);

        $article = HelpArticle::findOrFail($id);
        $article->update($request->only(['titre', 'contenu', 'module', 'categorie', 'ordre', 'actif']));

        return response()->json($article);
    }

    public function destroy(string $id)
    {
        HelpArticle::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
