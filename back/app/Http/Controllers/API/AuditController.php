<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    /**
     * Retourne le journal d'audit avec filtres.
     * GET /api/audit-logs
     */
    public function index(Request $request)
    {
        $query = AuditLog::orderBy('created_at', 'desc');

        if ($request->filled('type')) {
            $query->where('auditable_type', $request->type);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('search')) {
            $query->where('user_nom', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from . ' 00:00:00');
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to . ' 23:59:59');
        }

        return response()->json($query->paginate(50));
    }
}
