<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Les middleware de tenancy nécessitent un domaine HTTP réel.
        // En tests (SQLite in-memory), on les désactive pour tester la logique métier.
        $this->withoutMiddleware([
            InitializeTenancyByDomain::class,
            PreventAccessFromCentralDomains::class,
        ]);
    }
}
