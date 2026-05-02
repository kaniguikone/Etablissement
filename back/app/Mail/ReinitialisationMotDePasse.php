<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReinitialisationMotDePasse extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $nomUtilisateur,
        public readonly string $lienReinit,
        public readonly int    $expirationMinutes = 60,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Réinitialisation de votre mot de passe');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.reinitialisation-mot-de-passe');
    }
}
