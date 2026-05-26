import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const MODES_LABELS = {
    especes:  'Espèces',
    cheque:   'Chèque',
    virement: 'Virement',
    cinetpay: 'CinetPay',
    autre:    'Autre',
};

export default function ExportComptable() {
    const { toast }               = useToast();
    const [annees, setAnnees]     = useState([]);
    const [annee, setAnnee]       = useState('');
    const [dateDebut, setDateDebut] = useState('');
    const [dateFin, setDateFin]   = useState('');
    const [format, setFormat]     = useState('excel');
    const [apercu, setApercu]     = useState(null);
    const [chargApercu, setChargApercu] = useState(false);
    const [enCours, setEnCours]   = useState(false);

    useEffect(() => {
        api.get('/frais-annexes').then(r => {
            const ans = [...new Set(r.data.map(f => f.annee))].sort().reverse();
            setAnnees(ans);
            if (ans[0]) setAnnee(ans[0]);
        }).catch(() => {});
        // Fallback si pas de frais annexes : charger les années via périodes
        api.get('/periodes').then(r => {
            const ans2 = [...new Set((r.data ?? []).map(p => p.annee).filter(Boolean))].sort().reverse();
            setAnnees(prev => {
                const merged = [...new Set([...prev, ...ans2])].sort().reverse();
                return merged;
            });
            setAnnee(prev => prev || ans2[0] || '');
        }).catch(() => {});
    }, []);

    const chargerApercu = async () => {
        setChargApercu(true);
        setApercu(null);
        try {
            const params = new URLSearchParams();
            if (annee)     params.append('annee', annee);
            if (dateDebut) params.append('date_debut', dateDebut);
            if (dateFin)   params.append('date_fin', dateFin);
            const r = await api.get(`/export-comptable/apercu?${params}`);
            setApercu(r.data);
        } catch { toast.error('Impossible de charger l\'aperçu.'); }
        finally { setChargApercu(false); }
    };

    const exporter = async () => {
        if (!annee && !dateDebut) {
            toast.error('Sélectionnez une année scolaire ou une plage de dates.');
            return;
        }
        setEnCours(true);
        try {
            const params = new URLSearchParams();
            if (annee)     params.append('annee', annee);
            if (dateDebut) params.append('date_debut', dateDebut);
            if (dateFin)   params.append('date_fin', dateFin);
            params.append('format', format);

            const r = await api.get(`/export-comptable?${params}`, { responseType: 'blob', timeout: 120000 });

            const ext  = format === 'fec' ? 'csv' : 'xlsx';
            const mime = format === 'fec'
                ? 'text/csv'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            const periode = annee || `${dateDebut}_${dateFin}`;
            const url  = URL.createObjectURL(new Blob([r.data], { type: mime }));
            const lien = document.createElement('a');
            lien.href     = url;
            lien.download = `export_comptable_${periode}.${ext}`;
            lien.click();
            URL.revokeObjectURL(url);
            toast.success('Export téléchargé avec succès.');
        } catch (err) {
            let msg = 'Erreur lors de l\'export.';
            if (err.response?.data instanceof Blob) {
                try { const t = await err.response.data.text(); msg = JSON.parse(t).message || msg; } catch {}
            }
            toast.error(msg);
        } finally { setEnCours(false); }
    };

    return (
        <div className="container-fluid py-4" style={{ maxWidth: 860 }}>
            <div className="mb-4">
                <h4 className="mb-0">Export comptable structuré</h4>
                <small className="text-muted">
                    Exporte les encaissements (scolarité + frais annexes) au format Excel multi-feuilles ou CSV FEC compatible SAGE / OHADA
                </small>
            </div>

            {/* Paramètres */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-transparent fw-semibold">
                    Paramètres de l'export
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        {/* Année scolaire */}
                        <div className="col-md-4">
                            <label className="form-label">Année scolaire</label>
                            <select className="form-select" value={annee} onChange={e => setAnnee(e.target.value)}>
                                <option value="">— Toutes —</option>
                                {annees.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                            <small className="text-muted">Ou utilisez la plage de dates ci-dessous</small>
                        </div>

                        {/* Plage de dates */}
                        <div className="col-md-4">
                            <label className="form-label">Date de début</label>
                            <input type="date" className="form-control" value={dateDebut}
                                onChange={e => setDateDebut(e.target.value)} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Date de fin</label>
                            <input type="date" className="form-control" value={dateFin}
                                onChange={e => setDateFin(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Format */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-transparent fw-semibold">
                    Format de sortie
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className={`border rounded p-3 h-100 cursor-pointer ${format === 'excel' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setFormat('excel')}>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <input type="radio" checked={format === 'excel'} onChange={() => setFormat('excel')} />
                                    <i className="fas fa-file-excel text-success fs-5" />
                                    <strong>Excel (.xlsx)</strong>
                                </div>
                                <small className="text-muted">
                                    Fichier Excel avec 3 feuilles :
                                    <ul className="mb-0 mt-1 ps-3">
                                        <li>Journal des encaissements</li>
                                        <li>Récapitulatif par compte OHADA</li>
                                        <li>Écritures en partie double (SAGE)</li>
                                    </ul>
                                </small>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className={`border rounded p-3 h-100 ${format === 'fec' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setFormat('fec')}>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <input type="radio" checked={format === 'fec'} onChange={() => setFormat('fec')} />
                                    <i className="fas fa-file-csv text-warning fs-5" />
                                    <strong>FEC / CSV SAGE</strong>
                                </div>
                                <small className="text-muted">
                                    Fichier CSV séparateur ";" au standard FEC (Fichier des Écritures Comptables) :<br />
                                    importable directement dans SAGE, EBP ou tout logiciel comptable OHADA.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Plan comptable OHADA utilisé */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-transparent fw-semibold d-flex justify-content-between align-items-center">
                    <span>Plan comptable OHADA utilisé</span>
                    <span className="badge bg-secondary">Informatif</span>
                </div>
                <div className="card-body py-2">
                    <table className="table table-sm table-borderless mb-0">
                        <thead className="text-muted small">
                            <tr><th>N° Compte</th><th>Libellé</th><th>Usage</th></tr>
                        </thead>
                        <tbody className="small">
                            <tr><td><code>706100</code></td><td>Droits de scolarité</td><td>Crédit — scolarité</td></tr>
                            <tr><td><code>706200</code></td><td>Frais annexes divers</td><td>Crédit — tenues, APES, examens…</td></tr>
                            <tr><td><code>571000</code></td><td>Caisse</td><td>Débit — espèces</td></tr>
                            <tr><td><code>521000</code></td><td>Banque</td><td>Débit — chèque / virement</td></tr>
                            <tr><td><code>512000</code></td><td>Mobile Money / CinetPay</td><td>Débit — paiement mobile</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Aperçu */}
            <div className="d-flex gap-2 mb-3">
                <button className="btn btn-outline-secondary" onClick={chargerApercu} disabled={chargApercu}>
                    {chargApercu
                        ? <><span className="spinner-border spinner-border-sm me-2" />Calcul…</>
                        : <><i className="bi bi-eye me-1" />Aperçu des données</>}
                </button>
                <button className="btn btn-success px-4" onClick={exporter} disabled={enCours}>
                    {enCours
                        ? <><span className="spinner-border spinner-border-sm me-2" />Export en cours…</>
                        : <><i className="bi bi-download me-1" />Exporter</>}
                </button>
            </div>

            {apercu && (
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-transparent fw-semibold">Aperçu — données à exporter</div>
                    <div className="card-body">
                        <div className="row g-3 mb-3">
                            <div className="col-md-3">
                                <div className="card border-0 bg-success bg-opacity-10 text-center py-3">
                                    <div className="fs-5 fw-bold text-success">
                                        {Number(apercu.total_encaisse).toLocaleString('fr-FR')} FCFA
                                    </div>
                                    <small className="text-muted">Total encaissé</small>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card border-0 bg-primary bg-opacity-10 text-center py-3">
                                    <div className="fs-5 fw-bold text-primary">
                                        {Number(apercu.total_scolarite).toLocaleString('fr-FR')} FCFA
                                    </div>
                                    <small className="text-muted">Scolarités</small>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card border-0 bg-info bg-opacity-10 text-center py-3">
                                    <div className="fs-5 fw-bold text-info">
                                        {Number(apercu.total_frais_annexes).toLocaleString('fr-FR')} FCFA
                                    </div>
                                    <small className="text-muted">Frais annexes</small>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card border-0 bg-warning bg-opacity-10 text-center py-3">
                                    <div className="fs-4 fw-bold text-warning">{apercu.nombre_ecritures}</div>
                                    <small className="text-muted">Lignes / {apercu.nombre_ecritures * 2} écritures</small>
                                </div>
                            </div>
                        </div>

                        {apercu.par_mode && Object.keys(apercu.par_mode).length > 0 && (
                            <div>
                                <div className="fw-semibold small text-muted mb-2">Répartition par mode de paiement</div>
                                <div className="d-flex flex-wrap gap-2">
                                    {Object.entries(apercu.par_mode).map(([mode, total]) => (
                                        <span key={mode} className="badge bg-light text-dark border px-3 py-2">
                                            {MODES_LABELS[mode] ?? mode} : {Number(total).toLocaleString('fr-FR')} FCFA
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
