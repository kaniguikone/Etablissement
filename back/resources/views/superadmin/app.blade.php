@extends('superadmin.layout')
@section('title', 'Super Admin — Établissements')

@section('content')
<div x-data="superAdmin()" x-init="init()" x-cloak>

    {{-- Topbar --}}
    <div class="topbar">
        <div class="topbar-logo">🏫 EtabManager <span>Super Admin</span></div>
        <div class="topbar-user" x-text="admin?.nom"></div>
        <button class="btn-logout" @click="logout">Déconnexion</button>
    </div>

    <div class="page">

        {{-- Stats --}}
        <div class="stats">
            <div class="stat">
                <div class="stat-label">Total écoles</div>
                <div class="stat-value" x-text="tenants.length"></div>
            </div>
            <div class="stat">
                <div class="stat-label">Actives</div>
                <div class="stat-value" style="color:#2E7D32"
                     x-text="tenants.filter(t=>t.actif && !isExpired(t)).length"></div>
            </div>
            <div class="stat">
                <div class="stat-label">Suspendues</div>
                <div class="stat-value" style="color:#C62828"
                     x-text="tenants.filter(t=>!t.actif).length"></div>
            </div>
            <div class="stat">
                <div class="stat-label">Expirées</div>
                <div class="stat-value" style="color:#E65100"
                     x-text="tenants.filter(t=>t.actif && isExpired(t)).length"></div>
            </div>
        </div>

        {{-- Liste des écoles --}}
        <div class="card">
            <div class="card-header">
                <h2>Établissements</h2>
                <div style="display:flex;gap:10px;align-items:center;">
                    <div class="search-bar">
                        <span>🔍</span>
                        <input type="text" x-model="search" placeholder="Rechercher…">
                    </div>
                    <button class="btn btn-primary" @click="openCreate()">+ Nouvelle école</button>
                </div>
            </div>

            <div x-show="loading" class="card-body">
                <div class="spinner"></div>
            </div>

            <div x-show="!loading && filteredTenants.length === 0" class="empty">
                Aucun établissement trouvé.
            </div>

            <div x-show="!loading && filteredTenants.length > 0" class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>École</th>
                            <th>Domaine</th>
                            <th>Plan</th>
                            <th>Expiration</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template x-for="t in filteredTenants" :key="t.id">
                            <tr>
                                <td>
                                    <div style="font-weight:600;" x-text="t.nom"></div>
                                    <div style="font-size:12px;color:#9CA3AF;" x-text="t.id"></div>
                                </td>
                                <td>
                                    <template x-if="t.domains && t.domains[0]">
                                        <a :href="'https://'+t.domains[0].domain" target="_blank"
                                           style="color:#1565C0;text-decoration:none;font-size:13px;"
                                           x-text="t.domains[0].domain"></a>
                                    </template>
                                    <span x-if="!t.domains || !t.domains[0]" style="color:#9CA3AF">—</span>
                                </td>
                                <td>
                                    <span :class="planBadge(t.plan)" class="badge" x-text="t.plan"></span>
                                </td>
                                <td>
                                    <span x-show="!t.date_expiration" style="color:#9CA3AF;font-size:13px;">Illimitée</span>
                                    <span x-show="t.date_expiration"
                                          :style="isExpired(t) ? 'color:#C62828' : 'color:#374151'"
                                          style="font-size:13px;"
                                          x-text="formatDate(t.date_expiration)"></span>
                                </td>
                                <td>
                                    <span x-show="!t.actif" class="badge badge-red">Suspendue</span>
                                    <span x-show="t.actif && isExpired(t)" class="badge badge-orange">Expirée</span>
                                    <span x-show="t.actif && !isExpired(t)" class="badge badge-green">Active</span>
                                </td>
                                <td>
                                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                        <button class="btn btn-ghost btn-sm" @click="openEdit(t)">✏️ Modifier</button>
                                        <button class="btn btn-ghost btn-sm" @click="openApk(t)">📱 APK</button>
                                        <button class="btn btn-sm"
                                                :class="t.actif ? 'btn-danger' : 'btn-success'"
                                                @click="toggleActif(t)"
                                                x-text="t.actif ? '⏸ Suspendre' : '▶ Activer'"></button>
                                    </div>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    {{-- ── Modal Créer/Éditer ── --}}
    <div class="modal-backdrop" x-show="modalForm" @click.self="modalForm=false">
        <div class="modal" @click.stop>
            <div class="modal-header">
                <h3 x-text="editTenant ? 'Modifier l\'établissement' : 'Nouvel établissement'"></h3>
                <button class="modal-close" @click="modalForm=false">×</button>
            </div>
            <div class="modal-body">
                <div x-show="formError" class="alert alert-error" x-text="formError"></div>
                <div class="form-grid">
                    <div class="form-group" x-show="!editTenant">
                        <label>Identifiant (slug) *</label>
                        <input type="text" x-model="form.id" placeholder="lycee-moderne" :disabled="!!editTenant">
                        <small style="color:#9CA3AF;font-size:12px;">Minuscules, chiffres et tirets uniquement</small>
                    </div>
                    <div class="form-group">
                        <label>Nom complet *</label>
                        <input type="text" x-model="form.nom" placeholder="Lycée Moderne d'Abidjan">
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Email de contact</label>
                        <input type="email" x-model="form.email_contact" placeholder="contact@lycee.ci">
                    </div>
                    <div class="form-group">
                        <label>Téléphone</label>
                        <input type="text" x-model="form.telephone" placeholder="+225 07 00 00 00">
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Ville</label>
                        <input type="text" x-model="form.ville" placeholder="Abidjan">
                    </div>
                    <div class="form-group">
                        <label>Plan</label>
                        <select x-model="form.plan">
                            <option value="demo">Démo</option>
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                        </select>
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-group" x-show="!editTenant">
                        <label>Domaine principal *</label>
                        <input type="text" x-model="form.domaine" placeholder="lycee-moderne.tondomaine.ci">
                    </div>
                    <div class="form-group">
                        <label>Date d'expiration</label>
                        <input type="date" x-model="form.date_expiration">
                        <small style="color:#9CA3AF;font-size:12px;">Laisser vide = illimitée</small>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" @click="modalForm=false">Annuler</button>
                <button class="btn btn-primary" @click="saveForm()" :disabled="saving">
                    <span x-text="saving ? 'Enregistrement…' : (editTenant ? 'Enregistrer' : 'Créer l\'école')"></span>
                </button>
            </div>
        </div>
    </div>

    {{-- ── Modal APK ── --}}
    <div class="modal-backdrop" x-show="modalApk" @click.self="modalApk=false">
        <div class="modal" @click.stop>
            <div class="modal-header">
                <h3>APK mobile — <span x-text="apkTenant?.nom"></span></h3>
                <button class="modal-close" @click="modalApk=false">×</button>
            </div>
            <div class="modal-body">
                <div x-show="apkMsg" :class="apkMsgType==='error'?'alert alert-error':'alert alert-success'" x-text="apkMsg"></div>

                <p style="color:#4B5563;margin-bottom:20px;font-size:14px;">
                    Uploadez l'APK compilé pour cet établissement. Il sera disponible sur la page de téléchargement des utilisateurs.
                </p>

                <div style="border:2px dashed #E5E7EB;border-radius:10px;padding:24px;text-align:center;cursor:pointer;"
                     @click="$refs.apkInput.click()"
                     @dragover.prevent @drop.prevent="handleDrop($event)">
                    <div style="font-size:32px;margin-bottom:8px;">📱</div>
                    <div x-show="!apkFile" style="color:#6B7280;">
                        Cliquez ou glissez l'APK ici<br>
                        <small style="color:#9CA3AF;">.apk — max 200 Mo</small>
                    </div>
                    <div x-show="apkFile" style="color:#2E7D32;font-weight:600;" x-text="apkFile?.name"></div>
                </div>
                <input type="file" x-ref="apkInput" accept=".apk" @change="apkFile=$event.target.files[0]" style="display:none">

                <template x-if="apkTenant?.domains?.[0]">
                    <div style="margin-top:16px;background:#F8FAFF;border-radius:8px;padding:14px;">
                        <div style="font-size:12px;font-weight:600;color:#6B7280;margin-bottom:8px;">URL de téléchargement</div>
                        <a :href="'https://'+apkTenant.domains[0].domain+'/app'" target="_blank"
                           style="color:#1565C0;font-size:13px;"
                           x-text="'https://'+apkTenant.domains[0].domain+'/app'"></a>
                    </div>
                </template>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" @click="modalApk=false">Fermer</button>
                <button class="btn btn-primary" @click="uploadApk()" :disabled="!apkFile || apkUploading">
                    <span x-text="apkUploading ? 'Upload en cours…' : 'Uploader l\'APK'"></span>
                </button>
            </div>
        </div>
    </div>

</div>

<script>
function superAdmin() {
    const API = '/api/superadmin';
    const headers = () => ({
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('sa_token'),
    });

    return {
        admin: null,
        tenants: [],
        loading: true,
        search: '',
        modalForm: false,
        modalApk: false,
        editTenant: null,
        apkTenant: null,
        apkFile: null,
        apkUploading: false,
        apkMsg: null,
        apkMsgType: 'success',
        saving: false,
        formError: null,
        form: {},

        get filteredTenants() {
            const q = this.search.toLowerCase();
            if (!q) return this.tenants;
            return this.tenants.filter(t =>
                t.nom.toLowerCase().includes(q) ||
                t.id.toLowerCase().includes(q) ||
                (t.domains?.[0]?.domain || '').toLowerCase().includes(q)
            );
        },

        async init() {
            const token = localStorage.getItem('sa_token');
            if (!token) { window.location.href = '/superadmin/login'; return; }
            this.admin = JSON.parse(localStorage.getItem('sa_admin') || '{}');
            await this.loadTenants();
        },

        async loadTenants() {
            this.loading = true;
            try {
                const r = await fetch(`${API}/tenants`, { headers: headers() });
                if (r.status === 401) { this.logout(); return; }
                this.tenants = await r.json();
            } finally {
                this.loading = false;
            }
        },

        async logout() {
            await fetch(`${API}/logout`, { method: 'POST', headers: headers() }).catch(()=>{});
            localStorage.removeItem('sa_token');
            localStorage.removeItem('sa_admin');
            window.location.href = '/superadmin/login';
        },

        openCreate() {
            this.editTenant = null;
            this.formError = null;
            this.form = { id:'', nom:'', email_contact:'', telephone:'', ville:'', plan:'demo', domaine:'', date_expiration:'' };
            this.modalForm = true;
        },

        openEdit(t) {
            this.editTenant = t;
            this.formError = null;
            this.form = {
                nom: t.nom, email_contact: t.email_contact||'', telephone: t.telephone||'',
                ville: t.ville||'', plan: t.plan,
                date_expiration: t.date_expiration ? t.date_expiration.substring(0,10) : '',
            };
            this.modalForm = true;
        },

        async saveForm() {
            this.saving = true; this.formError = null;
            try {
                const url  = this.editTenant ? `${API}/tenants/${this.editTenant.id}` : `${API}/tenants`;
                const meth = this.editTenant ? 'PUT' : 'POST';
                const r = await fetch(url, {
                    method: meth,
                    headers: { ...headers(), 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.form),
                });
                const data = await r.json();
                if (!r.ok) throw new Error(Object.values(data.errors || {}).flat()[0] || data.message);
                this.modalForm = false;
                await this.loadTenants();
            } catch(e) {
                this.formError = e.message;
            } finally {
                this.saving = false;
            }
        },

        async toggleActif(t) {
            const action = t.actif ? 'suspendre' : 'activer';
            if (!confirm(`Voulez-vous ${action} "${t.nom}" ?`)) return;
            const r = await fetch(`${API}/tenants/${t.id}/toggle-actif`, { method: 'POST', headers: headers() });
            if (r.ok) await this.loadTenants();
        },

        openApk(t) {
            this.apkTenant = t; this.apkFile = null; this.apkMsg = null;
            this.modalApk = true;
        },

        handleDrop(e) {
            const f = e.dataTransfer.files[0];
            if (f && f.name.endsWith('.apk')) this.apkFile = f;
        },

        async uploadApk() {
            this.apkUploading = true; this.apkMsg = null;
            try {
                const fd = new FormData();
                fd.append('apk', this.apkFile);
                const r = await fetch(`${API}/tenants/${this.apkTenant.id}/apk`, {
                    method: 'POST',
                    headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('sa_token') },
                    body: fd,
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data.message);
                this.apkMsg = `APK uploadé ! Page de téléchargement : ${data.url_page}`;
                this.apkMsgType = 'success';
                this.apkFile = null;
            } catch(e) {
                this.apkMsg = e.message;
                this.apkMsgType = 'error';
            } finally {
                this.apkUploading = false;
            }
        },

        isExpired(t) {
            if (!t.date_expiration) return false;
            return new Date(t.date_expiration) < new Date();
        },

        formatDate(d) {
            if (!d) return '';
            return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
        },

        planBadge(plan) {
            return { demo:'badge badge-gray', basic:'badge badge-blue', pro:'badge badge-green' }[plan] || 'badge badge-gray';
        },
    };
}
</script>
@endsection
