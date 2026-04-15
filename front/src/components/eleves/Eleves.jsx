import React from 'react';
import { NavLink } from 'react-router-dom';

const Eleves = () => {
    return (
        <section className="page-wrapper">
            <div className='container-fluid mt-5'>
                <div className='row'>
                    <div className='col-md-12'>
                        <div className='card'>
                            <div className='card-header'>
                                <h4>Liste des élèves
                                    <NavLink to='/' className='btn btn-primary float-end'>Nouvel Elève</NavLink>
                                </h4>
                            </div>
                            <div className='card-body'>
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>First Name</th>
                                            <th>Last Name</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <th scope="row">1</th>
                                            <td>Mark</td>
                                            <td>Otto</td>
                                        </tr>
                                        <tr>
                                            <th scope="row">2</th>
                                            <td>Jacob</td>
                                            <td>Thornton</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                        </div>

                    </div>

                </div>

            </div>
        </section>
    );
};

export default Eleves;