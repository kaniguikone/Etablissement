<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NotificationParent extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $nomParent,
        public readonly string $nomEleve,
        public readonly string $sujet,
        public readonly string $titreNotif,
        public readonly string $corpsNotif,
        public readonly string $typeIcone = 'fas fa-bell', // classe FontAwesome pour la vue
        public readonly string $couleur   = '#1a56a0',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->sujet);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.notification-parent');
    }
}
