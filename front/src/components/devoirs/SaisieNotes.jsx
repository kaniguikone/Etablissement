import { useEffect, useRef, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const SaisieNotes = () => {
    const { toast } = useToast();
    const { id } = useParams();
    const [devoir, setDevoir]                 = useState(null);
    const [notes, setNotes]                   = useState([]);
    const [classesNiveau, setClassesNiveau]   = useState([]);
    const [classeSelectId, setClasseSelectId] = useState('');
    const [chargement, setChargement]         = useState(true);
    const [sauvegarde, setSauvegarde]         = useState(false);
    const [importEnCours, setImportEnCours]   = useState(false);
    const [rapportImport, setRapportImport]   = useState(null);
    const inputFichier = useRef(null);

    const chargerNotes = (classeId = '') => {
        setChargement(true);
        const url = classeId ? `/notesDevoir/${id}?classe_id=${classeId}` : `/notesDevoir/${id}`;
        api.get(url)
            .then((res) => {
                setDevoir(res.data.devoir);
                if (res.data.classes_niveau?.length > 0) {
                    setClassesNiveau(res.data.classes_niveau);
                }
                setNotes(res.data.notes.map((n) => ({
                    eleve_id:        n.eleve_id,
                    nom_eleve:       n.nom_eleve,
                    prenoms_eleve:   n.prenoms_eleve,
                    matricule_eleve: n.matricule_eleve,
                    note:            n.note !== null && n.note !== undefined ? String(n.note) : '',
                })));
                setChargement(false);
            })
            .catch(() => {
                toast.error('Impossible de charger les données.');
                setChargement(false);
            });
    };

    useEffect(() => {
        chargerNotes();
    }, [id]);

    const handleClasseChange = (e) => {
        const val = e.target.value;
        setClasseSelectId(val);
        if (val) chargerNotes(val);
        else setNotes([]);
    };

    const handleNoteChange = (eleveId, valeur) => {
        setNotes((prev) =>
            prev.map((n) => n.eleve_id === eleveId ? { ...n, note: valeur } : n)
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSauvegarde(true);

        const payload = notes.map((n) => ({
            eleve_id: n.eleve_id,
            note:     n.note === '' ? null : parseFloat(n.note),
        }));

        api.post(`/notesSauvegarder/${id}`, { notes: payload })
            .then(() => {
                toast.success('Notes enregistrées avec succès.');
                setSauvegarde(false);
            })
            .catch((err) => {
                if (err.response?.data?.errors) {
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                } else {
                    toast.error("Une erreur est survenue lors de l'enregistrement.");
                }
                setSauvegarde(false);
            });
    };

    const estNiveau = devoir?.niveau_id && !devoir?.classe_id;

    const classeIdEffectif = devoir?.classe_id || classeSelectId || null;

    const telechargerModele = () => {
        if (estNiveau && !classeSelectId) {
            toast.error('Sélectionnez une classe avant de télécharger le modèle.');
            return;
        }
        const url = `/devoirs/${id}/import/template` + (classeIdEffectif ? `?classe_id=${classeIdEffectif}` : '');
        api.get(url, { responseType: 'blob' })
            .then((res) => {
                const disposition = res.headers['content-disposition'] ?? '';
                const match = disposition.match(/filename="?([^"]+)"?/);
                const filename = match ? match[1] : `notes_devoir_${id}.xlsx`;
                const blobUrl = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(blobUrl);
            })
            .catch(() => toast.error('Impossible de télécharger le modèle.'));
    };

    const handleFichierChange = (e) => {
        const fichier = e.target.files[0];
        if (!fichier) return;
        if (estNiveau && !classeSelectId) {
            toast.error('Sélectionnez une classe avant d\'importer.');
            e.target.value = '';
            return;
        }
        setImportEnCours(true);
        setRapportImport(null);
        const formData = new FormData();
        formData.append('fichier', fichier);
        const url = `/devoirs/${id}/import` + (classeIdEffectif ? `?classe_id=${classeIdEffectif}` : '');
        api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then((res) => {
                setRapportImport(res.data);
                if (res.data.inseres > 0) chargerNotes(classeSelectId);
                if (res.data.erreurs?.length === 0) toast.success(res.data.message);
                else toast.warning(res.data.message);
            })
            .catch((err) => toast.error(err.response?.data?.message || 'Erreur lors de l\'import.'))
            .finally(() => {
                setImportEnCours(false);
                e.target.value = '';
            });
    };

    if (chargement) {
        return (
            <section className="page-wrapper">
                <div className="text-center my-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Chargement...</span>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3 border-bottom pb-2">
                    <div>
                        <h4 className="mb-0">Saisie des notes</h4>
                        {devoir && (
                            <p className="text-muted mb-0 small">
                                {devoir.code_devoir} — {devoir.matiere?.libelle_matiere}
                                {devoir.classe && ` — ${devoir.classe.nom_classe}`}
                                {devoir.niveau && ` — Niveau : ${devoir.niveau.nom_niveau}`}
                                {` — Coeff : ${devoir.coeff_devoir}`}
                                {devoir.periode && ` — ${devoir.periode.libelle_periode}`}
                            </p>
                        )}
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-success btn-sm" onClick={telechargerModele} title="Télécharger le modèle Excel pré-rempli">
                            <i className="fas fa-file-excel me-1" />Modèle Excel
                        </button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => inputFichier.current?.click()} disabled={importEnCours}>
                            {importEnCours
                                ? <><span className="spinner-border spinner-border-sm me-1" />Import…</>
                                : <><i className="fas fa-file-upload me-1" />Importer Excel</>}
                        </button>
                        <input ref={inputFichier} type="file" accept=".xlsx,.xls" className="d-none" onChange={handleFichierChange} />
                        <NavLink to="/Devoirs" className="btn btn-secondary btn-sm">Retour</NavLink>
                    </div>
                </div>

                {rapportImport && (
                    <div className={`alert ${rapportImport.erreurs?.length > 0 ? 'alert-warning' : 'alert-success'} alert-dismissible py-2`}>
                        <strong>{rapportImport.message}</strong>
                        {rapportImport.erreurs?.length > 0 && (
                            <ul className="mb-0 mt-1 small">
                                {rapportImport.erreurs.map((e, i) => (
                                    <li key={i}>Ligne {e.ligne} : {e.erreurs.join(', ')}</li>
                                ))}
                            </ul>
                        )}
                        <button type="button" className="btn-close" onClick={() => setRapportImport(null)} />
                    </div>
                )}

                {/* Sélecteur de classe pour les devoirs de niveau */}
                {estNiveau && (
                    <div className="row mb-3">
                        <div className="col-md-4">
                            <label className="form-label fw-semibold">Sélectionner une classe</label>
                            <select
                                className="form-select"
                                value={classeSelectId}
                                onChange={handleClasseChange}
                            >
                                <option value="">— Choisir une classe —</option>
                                {classesNiveau.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nom_classe}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {notes.length > 0 && (
                    <form onSubmit={handleSubmit}>
                        <table className="table table-striped table-hover">
                            <thead className="table-light">
                                <tr>
                                    <th>#</th>
                                    <th>Matricule</th>
                                    <th>Nom</th>
                                    <th>Prénoms</th>
                                    <th style={{ width: '160px' }}>Note <span className="text-muted small">(/ 20)</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {notes.map((n, i) => (
                                    <tr key={n.eleve_id}>
                                        <td>{i + 1}</td>
                                        <td>{n.matricule_eleve}</td>
                                        <td>{n.nom_eleve}</td>
                                        <td>{n.prenoms_eleve}</td>
                                        <td>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                min="0" max="20" step="0.25"
                                                placeholder="—"
                                                value={n.note}
                                                onChange={(e) => handleNoteChange(n.eleve_id, e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="d-flex justify-content-end mb-3 gap-2">
                            <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                {sauvegarde && <span className="spinner-border spinner-border-sm me-2" role="status" />}
                                Enregistrer les notes
                            </button>
                        </div>
                    </form>
                )}

                {estNiveau && !classeSelectId && notes.length === 0 && (
                    <div className="text-muted text-center py-4">
                        Sélectionnez une classe pour afficher les élèves.
                    </div>
                )}
            </div>
        </section>
    );
};

export default SaisieNotes;
