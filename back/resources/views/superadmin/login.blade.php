@extends('superadmin.layout')
@section('title', 'Connexion Super Admin')

@section('content')
<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1565C0,#0D47A1);padding:24px;"
     x-data="loginApp()" x-init="init()">

    <div style="background:#fff;border-radius:20px;padding:44px 40px;max-width:400px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.25);">

        <div style="text-align:center;margin-bottom:32px;">
            <div style="width:64px;height:64px;background:#EEF2FF;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;">🏫</div>
            <h1 style="font-size:22px;font-weight:700;color:#0D1B2A;">Super Administration</h1>
            <p style="color:#6B7280;font-size:14px;margin-top:6px;">Gestion des établissements</p>
        </div>

        <div x-show="error" x-cloak class="alert alert-error" x-text="error"></div>

        <form @submit.prevent="login">
            <div class="form-group">
                <label>Adresse email</label>
                <input type="email" x-model="form.email" placeholder="admin@tondomaine.ci" required autofocus>
            </div>
            <div class="form-group" style="margin-bottom:24px;">
                <label>Mot de passe</label>
                <input type="password" x-model="form.password" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;" :disabled="loading">
                <span x-show="loading">Connexion…</span>
                <span x-show="!loading">Se connecter</span>
            </button>
        </form>
    </div>
</div>

<script>
function loginApp() {
    return {
        form: { email: '', password: '' },
        loading: false,
        error: null,
        init() {
            if (localStorage.getItem('sa_token')) window.location.href = '/superadmin';
        },
        async login() {
            this.loading = true; this.error = null;
            try {
                const r = await fetch('/api/superadmin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(this.form),
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data.message || 'Identifiants invalides.');
                localStorage.setItem('sa_token', data.token);
                localStorage.setItem('sa_admin', JSON.stringify(data.admin));
                window.location.href = '/superadmin';
            } catch (e) {
                this.error = e.message;
            } finally {
                this.loading = false;
            }
        }
    };
}
</script>
@endsection
