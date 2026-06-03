<?php

namespace App\Mail;

use App\Models\DemandeAcces;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NouvelleDemandeAcces extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly DemandeAcces $demande) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🏫 Nouvelle demande d\'accès — ' . $this->demande->nom_etablissement,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.nouvelle-demande-acces');
    }
}
