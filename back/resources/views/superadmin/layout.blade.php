<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Super Admin') — Gestion des écoles</title>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --blue:    #1565C0;
            --blue-d:  #0D47A1;
            --blue-l:  #E3F2FD;
            --green:   #2E7D32;
            --green-l: #E8F5E9;
            --red:     #C62828;
            --red-l:   #FFEBEE;
            --orange:  #E65100;
            --orange-l:#FFF3E0;
            --gray-50: #F9FAFB;
            --gray-100:#F3F4F6;
            --gray-200:#E5E7EB;
            --gray-400:#9CA3AF;
            --gray-600:#4B5563;
            --gray-800:#1F2937;
            --radius:  10px;
            --shadow:  0 1px 4px rgba(0,0,0,.1);
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--gray-50);
            color: var(--gray-800);
            font-size: 14px;
            line-height: 1.5;
        }

        /* ── Topbar ── */
        .topbar {
            background: var(--blue);
            color: #fff;
            height: 56px;
            display: flex;
            align-items: center;
            padding: 0 24px;
            gap: 12px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 8px rgba(0,0,0,.2);
        }
        .topbar-logo { font-size: 20px; font-weight: 700; flex: 1; }
        .topbar-logo span { opacity: .7; font-size: 13px; font-weight: 400; margin-left: 8px; }
        .topbar-user { font-size: 13px; opacity: .85; }
        .btn-logout {
            background: rgba(255,255,255,.15);
            border: 1px solid rgba(255,255,255,.3);
            color: #fff;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: background .15s;
        }
        .btn-logout:hover { background: rgba(255,255,255,.25); }

        /* ── Layout ── */
        .page { max-width: 1200px; margin: 0 auto; padding: 28px 20px; }

        /* ── Cards ── */
        .card {
            background: #fff;
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            border: 1px solid var(--gray-200);
        }
        .card-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--gray-200);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }
        .card-header h2 { font-size: 16px; font-weight: 600; }
        .card-body { padding: 20px; }

        /* ── Stats ── */
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat {
            background: #fff;
            border-radius: var(--radius);
            padding: 18px 20px;
            border: 1px solid var(--gray-200);
            box-shadow: var(--shadow);
        }
        .stat-label { font-size: 12px; color: var(--gray-400); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
        .stat-value { font-size: 28px; font-weight: 700; color: var(--blue); }
        .stat-sub   { font-size: 12px; color: var(--gray-400); margin-top: 4px; }

        /* ── Table ── */
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th { background: var(--gray-50); padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; color: var(--gray-600); text-transform: uppercase; letter-spacing: .4px; border-bottom: 1px solid var(--gray-200); }
        td { padding: 12px 14px; border-bottom: 1px solid var(--gray-100); vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: var(--gray-50); }

        /* ── Badges ── */
        .badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
        }
        .badge-green  { background: var(--green-l);  color: var(--green); }
        .badge-red    { background: var(--red-l);    color: var(--red); }
        .badge-orange { background: var(--orange-l); color: var(--orange); }
        .badge-blue   { background: var(--blue-l);   color: var(--blue); }
        .badge-gray   { background: var(--gray-100); color: var(--gray-600); }

        /* ── Boutons ── */
        .btn {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
            cursor: pointer; border: none; transition: opacity .15s, transform .1s;
            text-decoration: none;
        }
        .btn:hover   { opacity: .88; }
        .btn:active  { transform: scale(.98); }
        .btn-primary { background: var(--blue);  color: #fff; }
        .btn-success { background: var(--green); color: #fff; }
        .btn-danger  { background: var(--red);   color: #fff; }
        .btn-ghost   { background: transparent; color: var(--gray-600); border: 1px solid var(--gray-200); }
        .btn-sm      { padding: 5px 10px; font-size: 12px; }

        /* ── Formulaires ── */
        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 13px; font-weight: 600; color: var(--gray-600); margin-bottom: 6px; }
        input, select, textarea {
            width: 100%; padding: 9px 12px; border: 1px solid var(--gray-200);
            border-radius: 8px; font-size: 14px; color: var(--gray-800);
            background: #fff; transition: border-color .15s;
        }
        input:focus, select:focus, textarea:focus {
            outline: none; border-color: var(--blue);
            box-shadow: 0 0 0 3px rgba(21,101,192,.12);
        }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }

        /* ── Modal ── */
        .modal-backdrop {
            position: fixed; inset: 0; background: rgba(0,0,0,.45);
            display: flex; align-items: center; justify-content: center;
            z-index: 200; padding: 16px;
        }
        .modal {
            background: #fff; border-radius: 16px; width: 100%; max-width: 560px;
            max-height: 90vh; overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,.3);
        }
        .modal-header {
            padding: 20px 24px 16px; border-bottom: 1px solid var(--gray-200);
            display: flex; align-items: center; justify-content: space-between;
        }
        .modal-header h3 { font-size: 17px; font-weight: 700; }
        .modal-close { background: none; border: none; cursor: pointer; font-size: 20px; color: var(--gray-400); line-height: 1; }
        .modal-close:hover { color: var(--gray-800); }
        .modal-body   { padding: 24px; }
        .modal-footer { padding: 16px 24px; border-top: 1px solid var(--gray-200); display: flex; justify-content: flex-end; gap: 10px; }

        /* ── Alerts ── */
        .alert { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
        .alert-error   { background: var(--red-l);   color: var(--red); }
        .alert-success { background: var(--green-l); color: var(--green); }

        /* ── Loader ── */
        .spinner {
            width: 36px; height: 36px; border: 3px solid var(--gray-200);
            border-top-color: var(--blue); border-radius: 50%;
            animation: spin .7s linear infinite; margin: 40px auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .empty { text-align: center; padding: 40px; color: var(--gray-400); }

        /* ── Search ── */
        .search-bar {
            display: flex; align-items: center; gap: 10px;
            padding: 8px 14px; border: 1px solid var(--gray-200);
            border-radius: 8px; background: #fff; max-width: 280px;
        }
        .search-bar input { border: none; padding: 0; font-size: 14px; background: transparent; }
        .search-bar input:focus { box-shadow: none; }

        [x-cloak] { display: none !important; }
    </style>
</head>
<body>
    @yield('content')
</body>
</html>
