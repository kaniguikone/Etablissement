import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const Login = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [erreur, setErreur] = useState('');
    const [chargement, setChargement] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErreur('');
        setChargement(true);
        api.post('/login', form)
            .then((res) => {
                localStorage.setItem('auth_token', res.data.token);
                localStorage.setItem('auth_user', JSON.stringify(res.data.user));
                navigate('/');
            })
            .catch((err) => {
                if (err.response?.data?.message) {
                    setErreur(err.response.data.message);
                } else {
                    setErreur("Une erreur est survenue lors de la connexion.");
                }
                setChargement(false);
            });
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="card shadow" style={{ width: '400px' }}>
                <div className="card-body p-4">
                    <h4 className="card-title text-center mb-4">Connexion</h4>
                    {erreur && <div className="alert alert-danger">{erreur}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-control"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Mot de passe</label>
                            <input
                                type="password"
                                className="form-control"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-100" disabled={chargement}>
                            {chargement ? (
                                <span className="spinner-border spinner-border-sm me-2" role="status" />
                            ) : null}
                            Se connecter
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
