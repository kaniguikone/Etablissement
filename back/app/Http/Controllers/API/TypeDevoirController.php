<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\TypeDevoir;
use Illuminate\Http\Request;

class TypeDevoirController extends Controller
{
    public function index()
    {
        return response()->json(TypeDevoir::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'code_type_devoir'        => 'required|string|max:50|unique:type_devoirs,code_type_devoir',
            'description_type_devoir' => 'required|string|max:255',
        ]);

        $type = TypeDevoir::create($request->only(['code_type_devoir', 'description_type_devoir']));

        return response()->json($type, 201);
    }

    public function show(string $id)
    {
        return response()->json(TypeDevoir::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'code_type_devoir'        => 'required|string|max:50|unique:type_devoirs,code_type_devoir,' . $id,
            'description_type_devoir' => 'required|string|max:255',
        ]);

        $type = TypeDevoir::findOrFail($id);
        $type->update($request->only(['code_type_devoir', 'description_type_devoir']));

        return response()->json($type);
    }

    public function destroy(string $id)
    {
        TypeDevoir::findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}
