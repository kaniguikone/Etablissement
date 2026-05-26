<?php

use App\Console\Commands\RelancesPaiements;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Relances paiements en retard — tous les matins à 8h
Schedule::command(RelancesPaiements::class)->dailyAt('08:00');
