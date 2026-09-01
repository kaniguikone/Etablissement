/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import api from '../../api/axios';

const LIBELLES_TYPE_SALLE = {
    labo:       'Laboratoire (Physique-Chimie / SVT)',
    salle_info: "Salle informatique",
    gymnase:    'Gymnase / plateau sportif',
};

/**
 * Champs de paramétrage « emploi du temps » d'une matière : famille (règles
 * pédagogiques + couleur de fiche), couleur, type de salle requis, effort
 * soutenu. Optionnels — laisser vide n'empêche pas d'enregistrer la matière.
 */
const ChampsEdtMatiere = ({ form, setForm }) => {
    const [familles, setFamilles] = useState([]);

    useEffect(() => {
        api.get('/matieres/familles')
            .then((r) => setFamilles(r.data.familles || []))
            .catch(() => { /* champ optionnel : on n'alerte pas */ });
    }, []);

    const changerFamille = (code) => {
        const f = familles.find((x) => x.code === code);
        setForm((prev) => ({
            ...prev,
            famille: code,
            // pré-remplit la couleur si l'utilisateur ne l'a pas déjà fixée
            couleur: prev.couleur && prev.famille ? prev.couleur : (f?.couleur || prev.couleur || ''),
        }));
    };

    return (
        <>
            <div className="col-12"><hr className="my-1" /><small className="text-muted">Paramétrage emploi du temps (facultatif)</small></div>

            <div className="mb-3 col-md-4">
                <label className="form-label">Famille</label>
                <select
                    className="form-select"
                    name="famille"
                    value={form.famille || ''}
                    onChange={(e) => changerFamille(e.target.value)}
                >
                    <option value="">— Non définie —</option>
                    {familles.map((f) => <option key={f.code} value={f.code}>{f.libelle}</option>)}
                </select>
            </div>

            <div className="mb-3 col-md-3">
                <label className="form-label">Couleur de fiche</label>
                <div className="input-group">
                    <input
                        type="color"
                        className="form-control form-control-color"
                        value={form.couleur || '#E2E8F0'}
                        onChange={(e) => setForm((p) => ({ ...p, couleur: e.target.value }))}
                        title="Couleur de la fiche dans l'emploi du temps"
                    />
                    <input
                        type="text"
                        className="form-control"
                        value={form.couleur || ''}
                        onChange={(e) => setForm((p) => ({ ...p, couleur: e.target.value }))}
                        placeholder="#RRGGBB"
                    />
                </div>
            </div>

            <div className="mb-3 col-md-5">
                <label className="form-label">Salle spécialisée requise</label>
                <select
                    className="form-select"
                    name="salle_type_requis"
                    value={form.salle_type_requis || ''}
                    onChange={(e) => setForm((p) => ({ ...p, salle_type_requis: e.target.value }))}
                >
                    <option value="">Aucune (salle attitrée de la classe)</option>
                    {Object.entries(LIBELLES_TYPE_SALLE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            </div>

            <div className="mb-3 col-md-12 form-check ms-2">
                <input
                    type="checkbox"
                    className="form-check-input"
                    id="effort_soutenu"
                    checked={!!form.effort_soutenu}
                    onChange={(e) => setForm((p) => ({ ...p, effort_soutenu: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="effort_soutenu">
                    Cours à effort soutenu (évite d&apos;enchaîner 5 h de ce type de matières en 6e/5e)
                </label>
            </div>
        </>
    );
};

export default ChampsEdtMatiere;
