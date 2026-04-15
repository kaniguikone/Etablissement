<section className="page-wrapper">
    <div className="container-fluid mb-2 border ">
        <div >
            <div>
                <h4>Liste des enseignants
                    <NavLink to='/NouvelEnseignant' className='btn btn-primary float-end'>Ajouter un enseignant</NavLink>
                </h4>
            </div>
            <div className="row">
            </div>
        </div>

        <div>
            <table className="table table-striped text-left">
                <thead className="table-light">
                    <tr>
                        <td>#</td>
                        <td>Matricule</td>
                        <td>Nom</td>
                        <td>Prénoms</td>
                        <td>Matières</td>
                        <td>Classes</td>
                        <td>Actions</td>
                    </tr>
                </thead>
                <tbody>
                    {enseignants.map((enseignant, i = 0) => (
                        <tr key={enseignant.id}>
                            <td>{++i}</td>
                            <td>{enseignant.matricule_enseignant}</td>
                            <td>{enseignant.nom_enseignant}</td>
                            <td>{enseignant.prenoms_enseignant}</td>
                            <td>
                                {enseignant.matieres.map((matiere) => (
                                    <h6 key={matiere.id}>{matiere.libelle_matiere}</h6>
                                ))}
                            </td>
                            <td>
                                {enseignant.classes.map((classe) => (
                                    <h6 key={classe.id}>{classe.abbr_classe}</h6>
                                ))}
                            </td>
                            <td>
                                <NavLink to={'/'} className="btn btn-primary btn-sm">Voir</NavLink>
                                <NavLink to={'/DetailsEleve'} className="btn btn-secondary btn-sm">Modifier</NavLink>
                                <button type="button" className="btn btn-danger btn-sm">Supprimer</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div >
</section>


