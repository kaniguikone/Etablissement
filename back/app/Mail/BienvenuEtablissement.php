<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BienvenuEtablissement extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $nomEtablissement,
        public readonly string $nomResponsable,
        public readonly string $domaine,
        public readonly string $email,
        public readonly string $motDePasse,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Bienvenue sur Suivi Scolaire — Vos accès');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.bienvenu-etablissement');
    }
}
