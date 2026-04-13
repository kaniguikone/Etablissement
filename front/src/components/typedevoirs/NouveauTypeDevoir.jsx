import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const NouveauTypeDevoir = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        code_type_devoir: '',
        description_type_devoir: '',
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        api.post('/typeDevoirs', form)
            .then(() => { toast.success('Type de devoir enregistré avec succès.'); navigate('/TypeDevoirs'); })
            .catch((err) => {
                if (err.response?.data?.errors) {
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                } else {
                    toast.error("Une erreur est survenue lors de l'enregistrement.");
                }
            });
    };

    return (
        <section className="content content-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Nouveau type de devoir</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3 justify-content-center">
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Code</label>
                            <input type="text" className="form-control" name="code_type_devoir" value={form.code_type_devoir} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-8">
                            <label className="form-label">Description</label>
                            <input type="text" className="form-control" name="description_type_devoir" value={form.description_type_devoir} onChange={handleChange} required />
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2">
                        <NavLink to="/TypeDevoirs" className="btn btn-secondary">Annuler</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default NouveauTypeDevoir;
