<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Response;

class SuperAdminPanelController extends Controller
{
    public function loginPage(): Response
    {
        return response()->view('superadmin.login');
    }

    public function app(): Response
    {
        return response()->view('superadmin.app');
    }
}
